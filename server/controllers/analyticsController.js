/**
 * Управленческая аналитика записей.
 *
 * В отличие от старого отчёта call-center, этот endpoint считает все записи:
 * созданные через API, вручную, импортом и сотрудниками CRM.
 */
const db = require('../db');

const MANAGEMENT_ROLES = new Set(['director', 'manager', 'okk', 'admin', 'administrator']);

const iso = (value) => {
  const text = String(value || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
};

const todayIso = () => new Date().toISOString().slice(0, 10);

function monthStart(value) {
  const d = new Date(`${value}T12:00:00Z`);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

function defaultPeriod(req) {
  const today = todayIso();
  const explicitFrom = iso(req.query.date_from || req.query.from);
  const explicitTo = iso(req.query.date_to || req.query.to);
  if (explicitFrom && explicitTo) {
    return explicitFrom <= explicitTo
      ? { from: explicitFrom, to: explicitTo, label: 'custom' }
      : { from: explicitTo, to: explicitFrom, label: 'custom' };
  }

  const preset = String(req.query.period || 'month').toLowerCase();
  if (preset === 'today') return { from: today, to: today, label: 'today' };
  const days = preset === '7d' || preset === 'week' ? 7 : preset === '14d' ? 14 : 30;
  const fromDate = new Date(`${today}T12:00:00Z`);
  fromDate.setUTCDate(fromDate.getUTCDate() - (days - 1));
  return {
    from: preset === 'month' ? monthStart(today) : fromDate.toISOString().slice(0, 10),
    to: today,
    label: preset,
  };
}

async function resolveOfficeIds(req) {
  const role = String(req.user?.role || '').toLowerCase();
  const ownOffice = Number(req.user?.office_id || 0);
  if (!ownOffice) return [];

  // Managers and OКК are scoped to their current office.
  if (role !== 'director' && role !== 'admin' && role !== 'administrator') return [ownOffice];

  const [ownerRows] = await db.query('SELECT owner_id, is_test FROM offices WHERE id = ? LIMIT 1', [ownOffice]);
  const ownerId = ownerRows[0]?.owner_id;
  const testFlag = Number(ownerRows[0]?.is_test || 0);
  if (!ownerId) return [ownOffice];

  const [offices] = await db.query('SELECT id FROM offices WHERE owner_id = ? AND is_test = ? ORDER BY id', [ownerId, testFlag]);
  const available = offices.map(row => Number(row.id));
  const requested = String(req.query.office_id || '').toLowerCase();
  if (requested && requested !== 'all') {
    const requestedId = Number(requested);
    if (available.includes(requestedId)) return [requestedId];
    return [ownOffice];
  }
  return available.length ? available : [ownOffice];
}

function appointmentWhere(officeIds, from, to, sourceId) {
  const officePlaceholders = officeIds.map(() => '?').join(',');
  const conditions = [`a.office_id IN (${officePlaceholders})`, 'DATE(a.appointment_date) BETWEEN ? AND ?', 'COALESCE(a.is_technical, 0) = 0'];
  const params = [...officeIds, from, to];
  if (sourceId) {
    conditions.push(
      `(a.source_id = ? OR (a.source_id IS NULL AND a.source = (SELECT name FROM appointment_sources WHERE id = ? LIMIT 1)))`
    );
    params.push(sourceId, sourceId);
  }
  return { sql: conditions.join(' AND '), params };
}

function leadWhere(officeIds, from, to, sourceId) {
  const officePlaceholders = officeIds.map(() => '?').join(',');
  const conditions = [`l.office_id IN (${officePlaceholders})`, 'DATE(l.created_at) BETWEEN ? AND ?'];
  const params = [...officeIds, from, to];
  if (sourceId) {
    conditions.push(
      `(l.source_id = ? OR (l.source_id IS NULL AND l.source = (SELECT name FROM appointment_sources WHERE id = ? LIMIT 1)))`
    );
    params.push(sourceId, sourceId);
  }
  return { sql: conditions.join(' AND '), params };
}

function numeric(value) {
  return Number(value || 0);
}

const LOSS_LABELS = {
  no_contact: 'Не дозвонились',
  cancelled: 'Отменили запись',
  no_show: 'Не пришли',
  refused: 'Отказ после консультации',
  non_target: 'Нецелевые обращения',
  other: 'Другие причины',
};

module.exports = {
  async getCallCenterAnalytics(req, res) {
    try {
      const role = String(req.user?.role || '').toLowerCase();
      if (!MANAGEMENT_ROLES.has(role)) {
        return res.status(403).json({ success: false, message: 'Раздел доступен только руководству' });
      }

      const officeIds = await resolveOfficeIds(req);
      if (!officeIds.length) {
        return res.status(400).json({ success: false, message: 'Пользователь не привязан к офису' });
      }

      const { from, to, label } = defaultPeriod(req);
      const parsedSource = Number(req.query.source_id || 0);
      const sourceId = parsedSource > 0 ? parsedSource : null;
      const af = appointmentWhere(officeIds, from, to, sourceId);
      const lf = leadWhere(officeIds, from, to, sourceId);

      const contractJoin = `
        LEFT JOIN (
          SELECT
            c.appointment_id,
            COUNT(DISTINCT c.id) AS contract_count,
            COALESCE(SUM(CASE
              WHEN p.confirmed = 1 AND DATE(p.payment_date) BETWEEN ? AND ?
              THEN p.amount ELSE 0 END), 0) AS revenue
          FROM contracts c
          LEFT JOIN contract_payments p ON p.contract_id = c.id
          WHERE c.appointment_id IS NOT NULL
          GROUP BY c.appointment_id
        ) cr ON cr.appointment_id = a.id
      `;

      const [kpiRows] = await db.query(
        `SELECT
           COUNT(DISTINCT a.id) AS total_records,
           COUNT(DISTINCT CASE WHEN a.status = 'arrived' THEN a.id END) AS arrived,
           COUNT(DISTINCT CASE WHEN a.status = 'no_show' THEN a.id END) AS no_show,
           COUNT(DISTINCT CASE
             WHEN a.consultation_result = 'contract_signed' OR COALESCE(cr.contract_count, 0) > 0
             THEN a.id END) AS contracts_signed,
           COALESCE(SUM(CASE
             WHEN a.consultation_result = 'contract_signed' OR COALESCE(cr.contract_count, 0) > 0
             THEN COALESCE(cr.revenue, 0) ELSE 0 END), 0) AS contract_revenue
         FROM appointments a
         ${contractJoin}
         WHERE ${af.sql}`,
        [from, to, ...af.params]
      );

      const [leadKpiRows] = await db.query(
        `SELECT COUNT(DISTINCT l.id) AS total_leads FROM call_center_leads l WHERE ${lf.sql}`,
        lf.params
      );

      const [leadSourceRows] = await db.query(
        `SELECT COALESCE(s.name, NULLIF(TRIM(l.source), ''), 'Без источника') AS source_name,
                COUNT(DISTINCT l.id) AS lead_count
         FROM call_center_leads l
         LEFT JOIN appointment_sources s ON s.id = l.source_id
         WHERE ${lf.sql}
         GROUP BY COALESCE(s.name, NULLIF(TRIM(l.source), ''), 'Без источника')`,
        lf.params
      );

      const [sourceRows] = await db.query(
        `SELECT
           COALESCE(s.name, NULLIF(TRIM(a.source), ''), 'Без источника') AS source_name,
           COUNT(DISTINCT a.id) AS appointments_count,
           COUNT(DISTINCT CASE WHEN a.status = 'arrived' THEN a.id END) AS arrived,
           COUNT(DISTINCT CASE WHEN a.status = 'no_show' THEN a.id END) AS no_show,
           COUNT(DISTINCT CASE
             WHEN a.consultation_result = 'contract_signed' OR COALESCE(cr.contract_count, 0) > 0
             THEN a.id END) AS contracts_signed,
           COALESCE(SUM(CASE
             WHEN a.consultation_result = 'contract_signed' OR COALESCE(cr.contract_count, 0) > 0
             THEN COALESCE(cr.revenue, 0) ELSE 0 END), 0) AS revenue
         FROM appointments a
         LEFT JOIN appointment_sources s ON s.id = a.source_id
         ${contractJoin}
         WHERE ${af.sql}
         GROUP BY COALESCE(s.name, NULLIF(TRIM(a.source), ''), 'Без источника')
         ORDER BY contracts_signed DESC, revenue DESC, appointments_count DESC`,
        [from, to, ...af.params]
      );

      const [lossRows] = await db.query(
        `SELECT reason, COUNT(*) AS count FROM (
           SELECT 'no_contact' AS reason
           FROM call_center_leads l
           WHERE ${lf.sql} AND l.status IN ('NO_ANSWER', 'UNREACHABLE')
           UNION ALL
           SELECT 'non_target' AS reason
           FROM call_center_leads l
           WHERE ${lf.sql} AND l.status = 'NON_TARGET'
           UNION ALL
           SELECT 'other' AS reason
           FROM call_center_leads l
           WHERE ${lf.sql} AND l.status IN ('REJECTED', 'SPAM', 'DUPLICATE', 'CLOSED')
           UNION ALL
           SELECT 'cancelled' AS reason
           FROM appointments a
           WHERE ${af.sql} AND a.status = 'cancelled'
           UNION ALL
           SELECT 'no_show' AS reason
           FROM appointments a
           WHERE ${af.sql} AND a.status = 'no_show'
           UNION ALL
           SELECT 'refused' AS reason
           FROM appointments a
           WHERE ${af.sql} AND a.consultation_result = 'not_signed'
         ) loss_rows
         GROUP BY reason
         ORDER BY count DESC`,
        [...lf.params, ...lf.params, ...lf.params, ...af.params, ...af.params, ...af.params]
      );

      const kpi = kpiRows[0] || {};
      const totalLeads = numeric(leadKpiRows[0]?.total_leads);
      const totalRecords = numeric(kpi.total_records);
      const arrived = numeric(kpi.arrived);
      const contractsSigned = numeric(kpi.contracts_signed);
      const revenue = numeric(kpi.contract_revenue);
      const leadMap = new Map(leadSourceRows.map(row => [row.source_name, numeric(row.lead_count)]));
      const sourceNames = new Set([...sourceRows.map(row => row.source_name), ...leadSourceRows.map(row => row.source_name)]);
      const sourceRanking = [...sourceNames].map(sourceName => {
        const row = sourceRows.find(item => item.source_name === sourceName) || {};
        const records = numeric(row.appointments_count);
        const arrivedCount = numeric(row.arrived);
        const signed = numeric(row.contracts_signed);
        const rowRevenue = numeric(row.revenue);
        return {
          source: sourceName,
          leads: leadMap.get(sourceName) || 0,
          appointments: records,
          arrived: arrivedCount,
          contracts: signed,
          conversion: arrivedCount ? Math.round((signed / arrivedCount) * 100) : 0,
          average_check: signed ? Math.round(rowRevenue / signed) : 0,
          revenue: rowRevenue,
          no_show: numeric(row.no_show),
        };
      }).sort((a, b) => b.contracts - a.contracts || b.leads - a.leads);

      const lossCount = lossRows.reduce((sum, row) => sum + numeric(row.count), 0);
      const losses = Object.keys(LOSS_LABELS).map(reason => {
        const row = lossRows.find(item => item.reason === reason);
        const count = numeric(row?.count);
        return {
          reason,
          label: LOSS_LABELS[reason],
          count,
          percentage: lossCount ? Math.round((count / lossCount) * 100) : 0,
        };
      }).filter(item => item.count > 0);

      const periodLabel = `${from} – ${to}`;
      return res.json({
        success: true,
        data: {
          period: { from, to, label: periodLabel, preset: label },
          filters: { office_id: officeIds.length === 1 ? officeIds[0] : 'all', source_id: sourceId },
          kpi: {
            leads: totalLeads,
            total_records: totalRecords,
            arrived,
            contracts_signed: contractsSigned,
            conversion: arrived ? Math.round((contractsSigned / arrived) * 100) : 0,
            no_show: numeric(kpi.no_show),
            attendance_rate: totalRecords ? Math.round((arrived / totalRecords) * 100) : 0,
            average_check: contractsSigned ? Math.round(revenue / contractsSigned) : 0,
            contract_revenue: revenue,
          },
          funnel: [
            { stage: 'Лиды', count: totalLeads, rate: 100 },
            { stage: 'Записано', count: totalRecords, rate: totalLeads ? Math.round((totalRecords / totalLeads) * 100) : 0 },
            { stage: 'Пришло', count: arrived, rate: totalRecords ? Math.round((arrived / totalRecords) * 100) : 0 },
            { stage: 'Договоры', count: contractsSigned, rate: arrived ? Math.round((contractsSigned / arrived) * 100) : 0 },
          ],
          source_ranking: sourceRanking,
          losses: { total: lossCount, items: losses },
          quality: {
            total_records: totalRecords,
            arrived,
            attendance_rate: totalRecords ? Math.round((arrived / totalRecords) * 100) : 0,
            contracts_signed: contractsSigned,
            conversion: totalRecords ? Math.round((contractsSigned / totalRecords) * 100) : 0,
            average_check: contractsSigned ? Math.round(revenue / contractsSigned) : 0,
            revenue,
          },
        },
      });
    } catch (error) {
      console.error('Error in getCallCenterAnalytics:', error);
      return res.status(500).json({ success: false, message: 'Ошибка получения аналитики' });
    }
  },
};
