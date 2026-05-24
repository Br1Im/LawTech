const db = require('../db');
const { checkOfficeAccess } = require('../utils/ensureOffice');

/**
 * Office dashboard controller
 *  - per-office plan vs fact (cash)
 *  - per-office lawyers cash table (today + period)
 *  - period filter: today | yesterday | week | 2weeks | month | custom (from/to)
 */

function startEndOfDay(d) {
  return {
    start: `${d} 00:00:00`,
    end: `${d} 23:59:59`,
  };
}

function isoDay(d) {
  return d.toISOString().slice(0, 10);
}

async function resolvePeriod(req) {
  const period = (req.query.period || 'plan').toString().toLowerCase();
  const today = new Date();
  const todayIso = isoDay(today);
  if (period === 'custom') {
    const from = (req.query.from || todayIso).toString().slice(0, 10);
    const to = (req.query.to || todayIso).toString().slice(0, 10);
    return { from, to, today: todayIso, label: 'custom' };
  }
  if (period === 'plan') {
    // Use active office plan period
    const officeId = Number(req.params.officeId);
    if (officeId) {
      try {
        const [rows] = await db.query(
          `SELECT DATE_FORMAT(period_start, '%Y-%m-%d') AS period_start,
                  DATE_FORMAT(period_end, '%Y-%m-%d') AS period_end
           FROM office_plans
           WHERE office_id = ?
           ORDER BY (period_start <= ? AND period_end >= ?) DESC, updated_at DESC
           LIMIT 1`,
          [officeId, todayIso, todayIso]
        );
        if (rows[0] && rows[0].period_start && rows[0].period_end) {
          return { from: rows[0].period_start, to: rows[0].period_end, today: todayIso, label: 'plan' };
        }
      } catch (_) {
        // fallback below
      }
    }
    // No plan → fallback to current month
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: isoDay(monthStart), to: todayIso, today: todayIso, label: 'plan' };
  }
  const days =
    period === 'today' || period === 'day' ? 1 :
    period === 'yesterday' ? 1 :
    period === 'week' ? 7 :
    period === '2weeks' ? 14 :
    period === 'month' ? 30 :
    1;
  let to = todayIso;
  let from = todayIso;
  if (period === 'yesterday') {
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    from = isoDay(y);
    to = isoDay(y);
  } else if (days > 1) {
    const f = new Date(today);
    f.setDate(f.getDate() - (days - 1));
    from = isoDay(f);
  }
  return { from, to, today: todayIso, label: period };
}

async function resolveUserOfficeId(user) {
  if (user?.office_id) return Number(user.office_id);
  if (!user?.id) return null;
  // Fall back to DB lookup when JWT was issued before office_id was attached
  // (older tokens, manually created admins, etc.)
  try {
    const [rows] = await db.query(
      `SELECT office_id FROM users WHERE id = ? LIMIT 1`,
      [user.id]
    );
    if (rows[0]?.office_id) return Number(rows[0].office_id);
  } catch (e) {
    console.warn('[plan] users office lookup failed', e.message);
  }
  try {
    const [rows] = await db.query(
      `SELECT office_id FROM employees WHERE user_id = ? OR id = ? LIMIT 1`,
      [user.id, user.id]
    );
    if (rows[0]?.office_id) return Number(rows[0].office_id);
  } catch (e) {
    console.warn('[plan] employees office lookup failed', e.message);
  }
  return null;
}

async function assertOfficeAccess(user, officeId) {
  return checkOfficeAccess(user, officeId);
}

function isWeekend(isoDate) {
  // ISO YYYY-MM-DD; Saturday=6, Sunday=0
  const d = new Date(`${isoDate}T00:00:00`);
  const wd = d.getDay();
  return wd === 0 || wd === 6;
}

const officeDashboardController = {
  /**
   * GET /api/office/:officeId/dashboard?period=...&from=...&to=...
   * Returns: { fact: { day, period }, plan: { day, period, period_start, period_end },
   *           lawyers_cash: [{ id, full_name, today, period }],
   *           period: { label, from, to } }
   */
  async getDashboard(req, res) {
    try {
      const officeId = Number(req.params.officeId);
      if (!officeId) return res.status(400).json({ success: false, message: 'officeId обязателен' });
      const allowed = await assertOfficeAccess(req.user, officeId);
      if (!allowed) return res.status(403).json({ success: false, message: 'Доступ запрещён' });

      const { from, to, today, label } = await resolvePeriod(req);

      // Все 5 запросов независимы между собой — гоняем параллельно через Promise.all,
      // чтобы суммарный latency был ~max(query), а не sum(query).
      const [
        [factRows],
        [refundRows],
        [planRows],
        [lawyersRows],
        [lawyerRefundRows],
      ] = await Promise.all([
        // Fact: paid_amount sum on contract_date — only "оплаченные" договоры (paid_amount > 0).
        db.query(
          `SELECT
             COALESCE(SUM(CASE WHEN c.contract_date = ? THEN c.paid_amount ELSE 0 END), 0) AS day_fact,
             COALESCE(SUM(CASE WHEN c.contract_date BETWEEN ? AND ? THEN c.paid_amount ELSE 0 END), 0) AS period_fact
           FROM contracts c
           JOIN employees e ON e.id = c.id_employee
           WHERE e.office_id = ? AND c.paid_amount > 0`,
          [today, from, to, officeId]
        ),
        // Confirmed refunds: subtract from fact on the day/period when refund was confirmed
        db.query(
          `SELECT
             COALESCE(SUM(CASE WHEN DATE(c.refund_confirmed_at) = ? THEN c.refund_amount ELSE 0 END), 0) AS day_refund,
             COALESCE(SUM(CASE WHEN DATE(c.refund_confirmed_at) BETWEEN ? AND ? THEN c.refund_amount ELSE 0 END), 0) AS period_refund
           FROM contracts c
           JOIN employees e ON e.id = c.id_employee
           WHERE e.office_id = ? AND c.refund_confirmed = 1 AND c.refund_amount > 0`,
          [today, from, to, officeId]
        ),
        // Plan: latest record covering this period; otherwise latest record overall.
        db.query(
          `SELECT id, daily_plan_weekday, daily_plan_weekend, period_plan_amount, period_start, period_end
           FROM office_plans
           WHERE office_id = ?
           ORDER BY (period_start <= ? AND period_end >= ?) DESC, updated_at DESC
           LIMIT 1`,
          [officeId, to, from]
        ),
        // Lawyers cash table — менеджеры, ОКК, юристы/адвокаты/представители, только paid_amount > 0
        db.query(
          `SELECT
             e.id,
             TRIM(CONCAT_WS(' ', e.last_name, e.first_name, e.middle_name)) AS full_name,
             e.position,
             COALESCE(SUM(CASE WHEN c.contract_date = ? THEN c.paid_amount ELSE 0 END), 0) AS today_cash,
             COALESCE(SUM(CASE WHEN c.contract_date BETWEEN ? AND ? THEN c.paid_amount ELSE 0 END), 0) AS period_cash
           FROM employees e
           LEFT JOIN users u ON u.email = e.email
           LEFT JOIN contracts c ON c.id_employee = e.id AND c.paid_amount > 0
           WHERE e.office_id = ?
             AND (
               LOWER(e.position) LIKE '%юрист%'
               OR LOWER(e.position) LIKE '%адвокат%'
               OR LOWER(e.position) LIKE '%менеджер%'
               OR LOWER(e.position) LIKE '%окк%'
               OR LOWER(e.position) LIKE '%контрол%'
               OR LOWER(e.position) LIKE '%представит%'
               OR u.role IN ('lawyer', 'manager', 'okk', 'representative')
             )
           GROUP BY e.id, e.last_name, e.first_name, e.middle_name, e.position
           ORDER BY period_cash DESC, today_cash DESC, e.last_name ASC`,
          [today, from, to, officeId]
        ),
        // Per-employee confirmed refunds for lawyers_cash subtraction
        db.query(
          `SELECT
             c.id_employee,
             COALESCE(SUM(CASE WHEN DATE(c.refund_confirmed_at) = ? THEN c.refund_amount ELSE 0 END), 0) AS day_refund,
             COALESCE(SUM(CASE WHEN DATE(c.refund_confirmed_at) BETWEEN ? AND ? THEN c.refund_amount ELSE 0 END), 0) AS period_refund
           FROM contracts c
           JOIN employees e ON e.id = c.id_employee
           WHERE e.office_id = ? AND c.refund_confirmed = 1 AND c.refund_amount > 0
           GROUP BY c.id_employee`,
          [today, from, to, officeId]
        ),
      ]);

      const day_fact = Number(factRows[0]?.day_fact || 0) - Number(refundRows[0]?.day_refund || 0);
      const period_fact = Number(factRows[0]?.period_fact || 0) - Number(refundRows[0]?.period_refund || 0);
      const plan = planRows[0] || null;
      const refundByEmp = new Map();
      lawyerRefundRows.forEach(r => refundByEmp.set(r.id_employee, {
        day: Number(r.day_refund || 0),
        period: Number(r.period_refund || 0),
      }));

      return res.json({
        success: true,
        data: {
          period: { label, from, to, today },
          fact: { day: day_fact, period: period_fact },
          plan: plan
            ? {
                id: plan.id,
                day_weekday: Number(plan.daily_plan_weekday),
                day_weekend: Number(plan.daily_plan_weekend),
                day: Number(isWeekend(today) ? plan.daily_plan_weekend : plan.daily_plan_weekday),
                day_kind: isWeekend(today) ? 'weekend' : 'weekday',
                period: Number(plan.period_plan_amount),
                period_start: plan.period_start,
                period_end: plan.period_end,
              }
            : null,
          lawyers_cash: lawyersRows.map(r => {
            const ref = refundByEmp.get(r.id) || { day: 0, period: 0 };
            return {
              id: r.id,
              full_name: r.full_name,
              position: r.position || '',
              today: Number(r.today_cash) - ref.day,
              period: Number(r.period_cash) - ref.period,
            };
          }),
        },
      });
    } catch (e) {
      console.error('getDashboard error', e);
      return res.status(500).json({ success: false, message: 'Ошибка получения дашборда офиса' });
    }
  },

  /**
   * GET /api/office/:officeId/plan
   * Returns the latest plan for this office (or null).
   */
  async getPlan(req, res) {
    try {
      const officeId = Number(req.params.officeId);
      const allowed = await assertOfficeAccess(req.user, officeId);
      if (!allowed) return res.status(403).json({ success: false, message: 'Доступ запрещён' });

      const [rows] = await db.query(
        `SELECT id, daily_plan_weekday, daily_plan_weekend, period_plan_amount, period_start, period_end, updated_at
         FROM office_plans
         WHERE office_id = ?
         ORDER BY updated_at DESC
         LIMIT 1`,
        [officeId]
      );
      return res.json({ success: true, data: rows[0] || null });
    } catch (e) {
      console.error('getPlan error', e);
      return res.status(500).json({ success: false, message: 'Ошибка получения плана' });
    }
  },

  /**
   * PUT /api/office/:officeId/plan
   * Body: { daily_plan_amount, period_plan_amount, period_start, period_end }
   * Director-only.
   */
  async upsertPlan(req, res) {
    try {
      const officeId = Number(req.params.officeId);
      const role = String(req.user?.role || '').trim().toLowerCase();
      const isPrivileged = ['director', 'admin', 'owner'].includes(role);
      if (!isPrivileged) {
        return res.status(403).json({
          success: false,
          message: 'Только директор может задавать план офиса',
        });
      }
      const allowed = await assertOfficeAccess(req.user, officeId);
      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: `Доступ запрещён (офис пользователя ${req.user?.office_id ?? '?'} не совпадает с ${officeId})`,
        });
      }

      // Accept either split (weekday/weekend) or legacy single daily_plan_amount
      const dailyWeekday = Number(
        req.body.daily_plan_weekday ?? req.body.daily_plan_amount ?? 0
      );
      const dailyWeekend = Number(
        req.body.daily_plan_weekend ?? req.body.daily_plan_amount ?? 0
      );
      const periodAmt = Number(req.body.period_plan_amount || 0);
      const periodStart = (req.body.period_start || '').slice(0, 10);
      const periodEnd = (req.body.period_end || '').slice(0, 10);
      if (!periodStart || !periodEnd) {
        return res.status(400).json({ success: false, message: 'period_start и period_end обязательны' });
      }
      if (dailyWeekday < 0 || dailyWeekend < 0 || periodAmt < 0) {
        return res.status(400).json({ success: false, message: 'Суммы плана не могут быть отрицательными' });
      }

      // Upsert by (office_id, period_start, period_end): if a plan exists for the same range, update it.
      const [existing] = await db.query(
        `SELECT id FROM office_plans WHERE office_id = ? AND period_start = ? AND period_end = ? LIMIT 1`,
        [officeId, periodStart, periodEnd]
      );
      if (existing.length > 0) {
        await db.query(
          `UPDATE office_plans
           SET daily_plan_weekday = ?, daily_plan_weekend = ?, period_plan_amount = ?, created_by = ?
           WHERE id = ?`,
          [dailyWeekday, dailyWeekend, periodAmt, req.user.id || null, existing[0].id]
        );
        return res.json({ success: true, data: { id: existing[0].id } });
      }
      const [ins] = await db.query(
        `INSERT INTO office_plans (office_id, daily_plan_weekday, daily_plan_weekend, period_plan_amount, period_start, period_end, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [officeId, dailyWeekday, dailyWeekend, periodAmt, periodStart, periodEnd, req.user.id || null]
      );
      return res.status(201).json({ success: true, data: { id: ins.insertId } });
    } catch (e) {
      console.error('upsertPlan error', e);
      return res.status(500).json({ success: false, message: 'Ошибка сохранения плана' });
    }
  },
};

module.exports = officeDashboardController;
