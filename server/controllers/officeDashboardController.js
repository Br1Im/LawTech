const db = require('../db');
const { checkOfficeAccess } = require('../utils/ensureOffice');
const { resolveRollingWindow, todayIsoInTz } = require('../utils/planPeriod');

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

// Every office date is evaluated in an explicit IANA timezone. Legacy offices
// without a value use the workspace default instead of silently falling back to UTC.
const DEFAULT_OFFICE_TIMEZONE = process.env.DEFAULT_OFFICE_TIMEZONE || 'Asia/Tomsk';
async function getOfficeTz(officeId) {
  const id = Number(officeId);
  if (!id) return DEFAULT_OFFICE_TIMEZONE;
  try {
    const [rows] = await db.query('SELECT timezone FROM offices WHERE id = ? LIMIT 1', [id]);
    return rows[0] && rows[0].timezone ? rows[0].timezone : DEFAULT_OFFICE_TIMEZONE;
  } catch (e) {
    return DEFAULT_OFFICE_TIMEZONE;
  }
}

async function resolvePeriod(req) {
  const period = (req.query.period || 'plan').toString().toLowerCase();
  // Today and rolling periods always follow the office timezone.
  const officeTz = await getOfficeTz(req.params.officeId);
  const todayIso = todayIsoInTz(officeTz);
  const today = new Date(`${todayIso}T12:00:00Z`);
  if (period === 'custom') {
    const from = (req.query.from || todayIso).toString().slice(0, 10);
    const to = (req.query.to || todayIso).toString().slice(0, 10);
    return { from, to, today: todayIso, label: 'custom' };
  }
  if (period === 'plan') {
    // Use the active office plan period — but roll it forward automatically.
    // The plan defines a recurring cycle; once a cycle ends, the next cycle of the
    // same length becomes active. `cycle_offset` lets the UI view previous periods.
    const officeId = Number(req.params.officeId);
    const cycleOffset = Number(req.query.cycle_offset || 0);
    if (officeId) {
      try {
        const [rows] = await db.query(
          `SELECT DATE_FORMAT(period_start, '%Y-%m-%d') AS period_start,
                  DATE_FORMAT(period_end, '%Y-%m-%d') AS period_end
           FROM office_plans
           WHERE office_id = ?
           ORDER BY (period_start <= ?) DESC, period_start DESC, updated_at DESC
           LIMIT 1`,
          [officeId, todayIso]
        );
        if (rows[0] && rows[0].period_start && rows[0].period_end) {
          const win = resolveRollingWindow(rows[0].period_start, rows[0].period_end, todayIso, cycleOffset);
          return {
            from: win.from,
            to: win.to,
            today: todayIso,
            label: 'plan',
            cycle_index: win.cycle_index,
            current_cycle_index: win.current_cycle_index,
            duration_days: win.duration_days,
          };
        }
      } catch (_) {
        // fallback below
      }
    }
    // No plan → fallback to current month
    const monthStart = `${todayIso.slice(0, 7)}-01`;
    return { from: monthStart, to: todayIso, today: todayIso, label: 'plan' };
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

      const { from, to, today: periodToday, label, cycle_index, current_cycle_index, duration_days } = await resolvePeriod(req);
      // Optional `day` param: view daily fact for a specific date (e.g. ?day=2026-06-10)
      const dayParam = (req.query.day || '').toString().slice(0, 10);
      const today = dayParam && /^\d{4}-\d{2}-\d{2}$/.test(dayParam) ? dayParam : periodToday;

      // Parallel dashboard sources: finance, plan, employee cash and visits.
      // 7 параллельных запросов: начальная оплата, доплаты, возвраты, план, юристы, доплаты юристов, возвраты юристов
      const [
        [initialRows],
        [paymentsRows],
        [refundRows],
        [planRows],
        [lawyersRows],
        [lawyerPaymentRows],
        [lawyerRefundRows],
        [visitRows],
      ] = await Promise.all([
        // 1. Начальный взнос = paid_amount минус подтверждённые доплаты (на дату договора)
        db.query(
          `SELECT
             COALESCE(SUM(CASE WHEN c.contract_date = ? THEN
               (c.paid_amount - COALESCE(cp_sum.confirmed_total, 0)) * (CASE WHEN c.is_joint = 1 THEN 0.5 ELSE 1 END)
             ELSE 0 END), 0) AS day_initial,
             COALESCE(SUM(CASE WHEN c.contract_date BETWEEN ? AND ? THEN
               (c.paid_amount - COALESCE(cp_sum.confirmed_total, 0)) * (CASE WHEN c.is_joint = 1 THEN 0.5 ELSE 1 END)
             ELSE 0 END), 0) AS period_initial
           FROM contracts c
           LEFT JOIN (
             SELECT contract_id, SUM(amount) AS confirmed_total
             FROM contract_payments WHERE confirmed = 1
             GROUP BY contract_id
           ) cp_sum ON cp_sum.contract_id = c.id
           WHERE c.office_id = ? AND c.paid_amount > 0`,
          [today, from, to, officeId]
        ),
        // 2. Подтверждённые доплаты — на дату платежа (payment_date)
        db.query(
          `SELECT
             COALESCE(SUM(CASE WHEN cp.payment_date = ? THEN cp.amount ELSE 0 END), 0) AS day_payments,
             COALESCE(SUM(CASE WHEN cp.payment_date BETWEEN ? AND ? THEN cp.amount ELSE 0 END), 0) AS period_payments
           FROM contract_payments cp
           JOIN contracts c ON c.id = cp.contract_id
           WHERE c.office_id = ? AND cp.confirmed = 1`,
          [today, from, to, officeId]
        ),
        // 3. Возвраты — на дату возврата (refund_deadline)
        db.query(
          `SELECT
             COALESCE(SUM(CASE WHEN DATE(c.refund_confirmed_at) = ? THEN c.refund_amount ELSE 0 END), 0) AS day_refund,
             COALESCE(SUM(CASE WHEN DATE(c.refund_confirmed_at) BETWEEN ? AND ? THEN c.refund_amount ELSE 0 END), 0) AS period_refund
           FROM contracts c
           WHERE c.office_id = ? AND c.refund_amount > 0 AND c.refund_confirmed = 1 AND c.refund_confirmed_at IS NOT NULL`,
          [today, from, to, officeId]
        ),
        // 4. План офиса
        db.query(
          `SELECT id, daily_plan_weekday, daily_plan_weekend, period_plan_amount, period_start, period_end
           FROM office_plans
           WHERE office_id = ?
           ORDER BY (period_start <= ?) DESC, period_start DESC, updated_at DESC
           LIMIT 1`,
          [officeId, today]
        ),
        // 5. Юристы — начальный взнос по дате договора (paid_amount минус подтверждённые доплаты)
        db.query(
          `SELECT
             e.id,
             TRIM(CONCAT_WS(' ', e.last_name, e.first_name, e.middle_name)) AS full_name,
             e.position,
             COALESCE(SUM(CASE WHEN c.contract_date = ? THEN
               (c.paid_amount - COALESCE(cp_sum.confirmed_total, 0))
               * (CASE WHEN c.is_joint = 1 THEN 0.5 ELSE 1 END)
             ELSE 0 END), 0) AS today_cash,
             COALESCE(SUM(CASE WHEN c.contract_date BETWEEN ? AND ? THEN
               (c.paid_amount - COALESCE(cp_sum.confirmed_total, 0))
               * (CASE WHEN c.is_joint = 1 THEN 0.5 ELSE 1 END)
             ELSE 0 END), 0) AS period_cash
           FROM employees e
           JOIN users u ON u.id = e.user_id AND u.is_active = 1 AND u.deleted_at IS NULL
           LEFT JOIN user_offices uo ON uo.user_id = u.id AND uo.office_id = ?
           LEFT JOIN contracts c ON (c.id_employee = e.id OR (c.is_joint = 1 AND c.second_employee_id = e.id)) AND c.paid_amount > 0
           LEFT JOIN (
             SELECT contract_id, SUM(amount) AS confirmed_total
             FROM contract_payments WHERE confirmed = 1
             GROUP BY contract_id
           ) cp_sum ON cp_sum.contract_id = c.id
           WHERE (u.office_id = ? OR uo.office_id IS NOT NULL)
             AND e.deleted_at IS NULL
             AND u.role IN ('lawyer', 'manager', 'okk', 'representative')
           GROUP BY e.id, e.last_name, e.first_name, e.middle_name, e.position
           ORDER BY period_cash DESC, today_cash DESC, e.last_name ASC`,
          [today, from, to, officeId, officeId]
        ),
        // 6. Подтверждённые доплаты — по юристам (на дату платежа)
        db.query(
          `SELECT
             e.id AS id_employee,
             COALESCE(SUM(CASE WHEN cp.payment_date = ? THEN cp.amount * (CASE WHEN c.is_joint = 1 THEN 0.5 ELSE 1 END) ELSE 0 END), 0) AS day_payment,
             COALESCE(SUM(CASE WHEN cp.payment_date BETWEEN ? AND ? THEN cp.amount * (CASE WHEN c.is_joint = 1 THEN 0.5 ELSE 1 END) ELSE 0 END), 0) AS period_payment
           FROM employees e
           JOIN contracts c ON (c.id_employee = e.id OR (c.is_joint = 1 AND c.second_employee_id = e.id))
           JOIN contract_payments cp ON cp.contract_id = c.id AND cp.confirmed = 1
           WHERE c.office_id = ?
           GROUP BY e.id`,
          [today, from, to, officeId]
        ),
        // 7. Возвраты — по юристам (на дату refund_deadline)
        db.query(
          `SELECT
             e.id AS id_employee,
             COALESCE(SUM(CASE WHEN DATE(c.refund_confirmed_at) = ? THEN c.refund_amount * (CASE WHEN c.is_joint = 1 THEN 0.5 ELSE 1 END) ELSE 0 END), 0) AS day_refund,
             COALESCE(SUM(CASE WHEN DATE(c.refund_confirmed_at) BETWEEN ? AND ? THEN c.refund_amount * (CASE WHEN c.is_joint = 1 THEN 0.5 ELSE 1 END) ELSE 0 END), 0) AS period_refund
           FROM employees e
           JOIN contracts c ON (c.id_employee = e.id OR (c.is_joint = 1 AND c.second_employee_id = e.id))
           WHERE c.office_id = ? AND c.refund_amount > 0 AND c.refund_confirmed = 1 AND c.refund_confirmed_at IS NOT NULL
           GROUP BY e.id`,
          [today, from, to, officeId]
        ),
        // Visits use the appointment date and the same dashboard period.
        db.query(
          `SELECT
             COUNT(DISTINCT CASE WHEN appointment_date = ? AND status = 'arrived' THEN id END) AS day_visits,
             COUNT(DISTINCT CASE WHEN appointment_date BETWEEN ? AND ? AND status = 'arrived' THEN id END) AS period_visits
           FROM appointments
           WHERE office_id = ?`,
          [today, from, to, officeId]
        ),
      ]);

      const day_fact = Number(initialRows[0]?.day_initial || 0)
                     + Number(paymentsRows[0]?.day_payments || 0)
                     - Number(refundRows[0]?.day_refund || 0);
      const period_fact = Number(initialRows[0]?.period_initial || 0)
                        + Number(paymentsRows[0]?.period_payments || 0)
                        - Number(refundRows[0]?.period_refund || 0);
      const plan = planRows[0] || null;
      const paymentByEmp = new Map();
      lawyerPaymentRows.forEach(r => paymentByEmp.set(r.id_employee, {
        day: Number(r.day_payment || 0),
        period: Number(r.period_payment || 0),
      }));
      const refundByEmp = new Map();
      lawyerRefundRows.forEach(r => refundByEmp.set(r.id_employee, {
        day: Number(r.day_refund || 0),
        period: Number(r.period_refund || 0),
      }));

      return res.json({
        success: true,
        data: {
          period: {
            label, from, to, today,
            cycle_index: cycle_index ?? null,
            current_cycle_index: current_cycle_index ?? null,
            duration_days: duration_days ?? null,
          },
          fact: { day: day_fact, period: period_fact },
          visits: {
            day: Number(visitRows[0]?.day_visits || 0),
            period: Number(visitRows[0]?.period_visits || 0),
          },
          plan: plan
            ? {
                id: plan.id,
                day_weekday: Number(plan.daily_plan_weekday),
                day_weekend: Number(plan.daily_plan_weekend),
                day: Number(isWeekend(today) ? plan.daily_plan_weekend : plan.daily_plan_weekday),
                day_kind: isWeekend(today) ? 'weekend' : 'weekday',
                period: Number(plan.period_plan_amount),
                // For the rolling 'plan' period, show the active (rolled) window dates,
                // not the originally-stored ones.
                period_start: label === 'plan' ? from : plan.period_start,
                period_end: label === 'plan' ? to : plan.period_end,
              }
            : null,
          lawyers_cash: lawyersRows.map(r => {
            const pay = paymentByEmp.get(r.id) || { day: 0, period: 0 };
            const ref = refundByEmp.get(r.id) || { day: 0, period: 0 };
            return {
              id: r.id,
              full_name: r.full_name,
              position: r.position || '',
              today: Number(r.today_cash) + pay.day - ref.day,
              period: Number(r.period_cash) + pay.period - ref.period,
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