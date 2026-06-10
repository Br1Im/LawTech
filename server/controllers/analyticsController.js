/**
 * Analytics Controller — Call-center analytics for the director's dashboard.
 * Endpoint: GET /analytics/call-center
 */
const db = require('../db');
const { resolveRollingWindow } = require('../utils/planPeriod');

const ARCHIVE_STATUSES = ['REJECTED', 'SPAM', 'DUPLICATE', 'NON_TARGET', 'UNREACHABLE', 'CLOSED'];
const ACTIVE_STATUSES  = ['NEW', 'IN_PROGRESS', 'NO_ANSWER', 'CALL_BACK', 'INTERESTED'];

const ARCHIVE_LABELS = {
  REJECTED:    'Отказ',
  UNREACHABLE: 'Недозвон',
  DUPLICATE:   'Дубль',
  NON_TARGET:  'Нецелевой',
  SPAM:        'Спам',
  CLOSED:      'Закрыт',
};

module.exports = {
  async getCallCenterAnalytics(req, res) {
    try {
      const officeId = req.user.office_id;
      if (!officeId) return res.status(400).json({ success: false, message: 'Нет офиса' });

      // ── Resolve period ──
      const cycleOffset = Number(req.query.cycle_offset || 0);
      const todayIso = new Date().toISOString().slice(0, 10);

      const [plans] = await db.query(
        `SELECT period_start, period_end FROM office_plans WHERE office_id = ? ORDER BY period_start DESC LIMIT 1`,
        [officeId]
      );

      let periodFrom, periodTo, prevFrom, prevTo;
      let periodLabel = '';
      let hasPlan = false;

      if (plans.length > 0) {
        hasPlan = true;
        const toYmd = (v) => v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10);
        const ps = toYmd(plans[0].period_start);
        const pe = toYmd(plans[0].period_end);
        const win = resolveRollingWindow(ps, pe, todayIso, cycleOffset);
        periodFrom = win.from;
        periodTo   = win.to;

        // Previous period for comparison
        const prevWin = resolveRollingWindow(ps, pe, todayIso, cycleOffset - 1);
        // Only use previous if it's actually different
        if (prevWin.cycle_index !== win.cycle_index) {
          prevFrom = prevWin.from;
          prevTo   = prevWin.to;
        }

        periodLabel = `${periodFrom} – ${periodTo}`;
      } else {
        // Fallback: current month
        const d = new Date();
        periodFrom = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
        periodTo   = todayIso;
        periodLabel = `${periodFrom} – ${periodTo}`;
      }

      // ── KPI: leads by status (current period) ──
      const [leadRows] = await db.query(
        `SELECT
           COUNT(*) AS total_leads,
           SUM(CASE WHEN status = 'BOOKED' THEN 1 ELSE 0 END) AS booked,
           SUM(CASE WHEN status IN ('REJECTED','SPAM','DUPLICATE','NON_TARGET','UNREACHABLE','CLOSED') THEN 1 ELSE 0 END) AS archived,
           SUM(CASE WHEN status IN ('NEW','IN_PROGRESS','NO_ANSWER','CALL_BACK','INTERESTED') THEN 1 ELSE 0 END) AS in_progress
         FROM call_center_leads
         WHERE office_id = ? AND DATE(created_at) BETWEEN ? AND ?`,
        [officeId, periodFrom, periodTo]
      );

      const totalLeads = Number(leadRows[0]?.total_leads || 0);
      const bookedLeads = Number(leadRows[0]?.booked || 0);
      const archivedLeads = Number(leadRows[0]?.archived || 0);
      const inProgressLeads = Number(leadRows[0]?.in_progress || 0);

      // ── Appointments (from leads created in this period) ──
      const [apptRows] = await db.query(
        `SELECT
           COUNT(*) AS total_appointments,
           SUM(CASE WHEN a.status = 'arrived' THEN 1 ELSE 0 END) AS arrived,
           SUM(CASE WHEN a.status = 'no_show' THEN 1 ELSE 0 END) AS no_show,
           SUM(CASE WHEN a.consultation_result = 'contract_signed' THEN 1 ELSE 0 END) AS contracts_signed
         FROM appointments a
         WHERE a.office_id = ? AND DATE(a.appointment_date) BETWEEN ? AND ?`,
        [officeId, periodFrom, periodTo]
      );

      const totalAppointments = Number(apptRows[0]?.total_appointments || 0);
      const arrived = Number(apptRows[0]?.arrived || 0);
      const noShow = Number(apptRows[0]?.no_show || 0);
      const contractsSigned = Number(apptRows[0]?.contracts_signed || 0);

      // Use the higher of booked or total_appointments as "Записано"
      const recorded = Math.max(bookedLeads, totalAppointments);

      // ── Previous period KPI for comparison ──
      let prev = null;
      if (prevFrom && prevTo) {
        const [prevLeads] = await db.query(
          `SELECT
             COUNT(*) AS total_leads,
             SUM(CASE WHEN status = 'BOOKED' THEN 1 ELSE 0 END) AS booked,
             SUM(CASE WHEN status IN ('REJECTED','SPAM','DUPLICATE','NON_TARGET','UNREACHABLE','CLOSED') THEN 1 ELSE 0 END) AS archived
           FROM call_center_leads
           WHERE office_id = ? AND DATE(created_at) BETWEEN ? AND ?`,
          [officeId, prevFrom, prevTo]
        );
        const [prevAppt] = await db.query(
          `SELECT
             COUNT(*) AS total_appointments,
             SUM(CASE WHEN a.status = 'arrived' THEN 1 ELSE 0 END) AS arrived,
             SUM(CASE WHEN a.consultation_result = 'contract_signed' THEN 1 ELSE 0 END) AS contracts_signed
           FROM appointments a
           WHERE a.office_id = ? AND DATE(a.appointment_date) BETWEEN ? AND ?`,
          [officeId, prevFrom, prevTo]
        );

        const pTotal = Number(prevLeads[0]?.total_leads || 0);
        const pBooked = Number(prevLeads[0]?.booked || 0);
        const pArchived = Number(prevLeads[0]?.archived || 0);
        const pAppts = Number(prevAppt[0]?.total_appointments || 0);
        const pArrived = Number(prevAppt[0]?.arrived || 0);
        const pContracts = Number(prevAppt[0]?.contracts_signed || 0);
        const pRecorded = Math.max(pBooked, pAppts);

        prev = {
          total_leads: pTotal,
          recorded: pRecorded,
          arrived: pArrived,
          contracts_signed: pContracts,
          archived: pArchived,
          conversion: pTotal > 0 ? Math.round(pContracts / pTotal * 100) : 0,
          defect_rate: pTotal > 0 ? Math.round(pArchived / pTotal * 100) : 0,
          period: `${prevFrom} – ${prevTo}`,
        };
      }

      // ── Sources analytics ──
      const [sourceRows] = await db.query(
        `SELECT
           ccl.source,
           COUNT(DISTINCT ccl.id) AS total_leads,
           COUNT(DISTINCT CASE WHEN ccl.status = 'BOOKED' THEN ccl.id END) AS booked,
           COUNT(DISTINCT CASE WHEN a.status = 'arrived' THEN a.id END) AS arrived,
           COUNT(DISTINCT CASE WHEN a.consultation_result = 'contract_signed' THEN a.id END) AS contracts_signed,
           COUNT(DISTINCT CASE WHEN ccl.status IN ('REJECTED','SPAM','DUPLICATE','NON_TARGET','UNREACHABLE','CLOSED') THEN ccl.id END) AS archived
         FROM call_center_leads ccl
         LEFT JOIN appointments a ON a.lead_id = ccl.id AND a.office_id = ccl.office_id
         WHERE ccl.office_id = ? AND DATE(ccl.created_at) BETWEEN ? AND ?
         GROUP BY ccl.source
         ORDER BY total_leads DESC`,
        [officeId, periodFrom, periodTo]
      );

      const sources = sourceRows.map(r => {
        const total = Number(r.total_leads || 0);
        const contracts = Number(r.contracts_signed || 0);
        const archived = Number(r.archived || 0);
        const conversion = total > 0 ? Math.round(contracts / total * 100) : 0;
        const defectRate = total > 0 ? Math.round(archived / total * 100) : 0;

        // Source quality rating (based on lawyer conversion thresholds from Office)
        let quality = 'medium'; // yellow
        if (conversion >= 15 && defectRate < 30) quality = 'good';      // green
        if (conversion < 5 || defectRate > 50) quality = 'bad';         // red

        return {
          source: r.source || 'Неизвестный',
          total_leads: total,
          booked: Number(r.booked || 0),
          arrived: Number(r.arrived || 0),
          contracts_signed: contracts,
          archived,
          conversion,
          defect_rate: defectRate,
          quality,
        };
      });

      // Best/worst source (only meaningful if conversion > 0)
      const sourcesWithData = sources.filter(s => s.total_leads >= 3);
      let bestSource = null;
      let worstSource = null;
      if (sourcesWithData.length > 0) {
        const candidate = sourcesWithData.reduce((a, b) => a.conversion > b.conversion ? a : b);
        if (candidate.conversion > 0) bestSource = candidate;
        const worstCandidate = sourcesWithData.reduce((a, b) => a.conversion < b.conversion ? a : b);
        worstSource = worstCandidate;
        if (bestSource && worstSource && bestSource.source === worstSource.source) worstSource = null;
        if (!bestSource) worstSource = null; // no point showing worst if there's no best
      }

      // ── Operators analytics ──
      const [operatorRows] = await db.query(
        `SELECT
           u.id,
           CONCAT(COALESCE(u.last_name, ''), ' ', COALESCE(u.first_name, '')) AS name,
           COUNT(DISTINCT ccl.id) AS total_leads,
           COUNT(DISTINCT CASE WHEN ccl.status = 'BOOKED' THEN ccl.id END) AS booked,
           COUNT(DISTINCT CASE WHEN a.status = 'arrived' THEN a.id END) AS arrived,
           COUNT(DISTINCT CASE WHEN ccl.status IN ('REJECTED','SPAM','DUPLICATE','NON_TARGET','UNREACHABLE','CLOSED') THEN ccl.id END) AS archived
         FROM call_center_leads ccl
         JOIN users u ON u.id = ccl.assigned_to
         LEFT JOIN appointments a ON a.lead_id = ccl.id AND a.office_id = ccl.office_id
         WHERE ccl.office_id = ? AND DATE(ccl.created_at) BETWEEN ? AND ?
           AND ccl.assigned_to IS NOT NULL
         GROUP BY u.id, u.last_name, u.first_name
         ORDER BY total_leads DESC`,
        [officeId, periodFrom, periodTo]
      );

      const operators = operatorRows.map(r => {
        const total = Number(r.total_leads || 0);
        const booked = Number(r.booked || 0);
        const arrivedOp = Number(r.arrived || 0);
        const archivedOp = Number(r.archived || 0);
        return {
          id: r.id,
          name: (r.name || '').trim() || `Оператор #${r.id}`,
          total_leads: total,
          booked,
          arrived: arrivedOp,
          arrival_rate: booked > 0 ? Math.round(arrivedOp / booked * 100) : 0,
          archived: archivedOp,
          defect_rate: total > 0 ? Math.round(archivedOp / total * 100) : 0,
        };
      });

      // Totals row
      const opTotals = {
        total_leads: operators.reduce((s, o) => s + o.total_leads, 0),
        booked: operators.reduce((s, o) => s + o.booked, 0),
        arrived: operators.reduce((s, o) => s + o.arrived, 0),
        archived: operators.reduce((s, o) => s + o.archived, 0),
      };
      opTotals.arrival_rate = opTotals.booked > 0 ? Math.round(opTotals.arrived / opTotals.booked * 100) : 0;
      opTotals.defect_rate = opTotals.total_leads > 0 ? Math.round(opTotals.archived / opTotals.total_leads * 100) : 0;

      // ── Archive by reason ──
      const [archiveRows] = await db.query(
        `SELECT status, COUNT(*) AS cnt
         FROM call_center_leads
         WHERE office_id = ? AND DATE(created_at) BETWEEN ? AND ?
           AND status IN ('REJECTED','SPAM','DUPLICATE','NON_TARGET','UNREACHABLE','CLOSED')
         GROUP BY status
         ORDER BY cnt DESC`,
        [officeId, periodFrom, periodTo]
      );

      const archiveReasons = archiveRows.map(r => ({
        status: r.status,
        label: ARCHIVE_LABELS[r.status] || r.status,
        count: Number(r.cnt || 0),
      }));

      
      // ── City stats (appointments by office, for directors with multiple offices) ──
      let cityStats = [];
      try {
        const [ownerRow] = await db.query('SELECT owner_id FROM offices WHERE id = ?', [officeId]);
        const ownerId = ownerRow[0]?.owner_id;
        if (ownerId) {
          const [cityRows] = await db.query(
            `SELECT
               o.id AS office_id,
               o.name AS office_name,
               COUNT(a.id) AS total_appointments,
               SUM(CASE WHEN a.status = 'arrived' THEN 1 ELSE 0 END) AS arrived,
               SUM(CASE WHEN a.status = 'no_show' THEN 1 ELSE 0 END) AS no_show,
               SUM(CASE WHEN a.consultation_result = 'contract_signed' THEN 1 ELSE 0 END) AS contracts_signed
             FROM offices o
             LEFT JOIN appointments a ON a.office_id = o.id
               AND DATE(a.appointment_date) BETWEEN ? AND ?
             WHERE o.owner_id = ?
             GROUP BY o.id, o.name
             ORDER BY o.name`,
            [periodFrom, periodTo, ownerId]
          );

          cityStats = cityRows.map(r => {
            const total = Number(r.total_appointments || 0);
            const arr = Number(r.arrived || 0);
            const ns = Number(r.no_show || 0);
            const contracts = Number(r.contracts_signed || 0);
            return {
              office_id: r.office_id,
              office_name: r.office_name,
              total_appointments: total,
              arrived: arr,
              no_show: ns,
              contracts_signed: contracts,
              conversion: arr > 0 ? Math.round(contracts / arr * 100) : 0,
            };
          });
        }
      } catch (e) {
        console.error('Error getting city stats:', e.message);
      }

      // ── Response ──
      const conversion = totalLeads > 0 ? Math.round(contractsSigned / totalLeads * 100) : 0;
      const defectRate = totalLeads > 0 ? Math.round(archivedLeads / totalLeads * 100) : 0;

      res.json({
        success: true,
        data: {
          period: {
            from: periodFrom,
            to: periodTo,
            label: periodLabel,
            has_plan: hasPlan,
          },
          kpi: {
            total_leads: totalLeads,
            recorded,
            arrived,
            no_show: noShow,
            contracts_signed: contractsSigned,
            conversion,
            defect_rate: defectRate,
            archived: archivedLeads,
            in_progress: inProgressLeads,
          },
          funnel: [
            { stage: 'Лиды', count: totalLeads, rate: 100 },
            { stage: 'В работе', count: inProgressLeads, rate: totalLeads > 0 ? Math.round(inProgressLeads / totalLeads * 100) : 0 },
            { stage: 'Записано', count: recorded, rate: totalLeads > 0 ? Math.round(recorded / totalLeads * 100) : 0 },
            { stage: 'Пришло', count: arrived, rate: recorded > 0 ? Math.round(arrived / recorded * 100) : 0 },
            { stage: 'Договоры', count: contractsSigned, rate: arrived > 0 ? Math.round(contractsSigned / arrived * 100) : 0 },
          ],
          sources,
          best_source: bestSource ? { source: bestSource.source, conversion: bestSource.conversion } : null,
          worst_source: worstSource ? { source: worstSource.source, conversion: worstSource.conversion } : null,
          operators,
          operator_totals: opTotals,
          archive_reasons: archiveReasons,
          losses: {
            total: archivedLeads,
            rate: defectRate,
          },
          previous_period: prev,
          city_stats: cityStats.length > 1 ? cityStats : [],
        },
      });
    } catch (error) {
      console.error('Error in getCallCenterAnalytics:', error);
      res.status(500).json({ success: false, message: 'Ошибка при получении аналитики' });
    }
  },
};
