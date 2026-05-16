const ExcelJS = require('exceljs');
const db = require('../database/db');

const STATUS_LABELS = {
  NEW: 'Новый',
  IN_PROGRESS: 'В обработке',
  NO_ANSWER: 'Не дозвонились',
  CALL_BACK: 'Перезвонить',
  INTERESTED: 'Заинтересован',
  BOOKED: 'Записан на консультацию',
  REJECTED: 'Отказ',
  SPAM: 'Спам',
  DUPLICATE: 'Дубль',
  NON_TARGET: 'Нецелевой',
  CLOSED: 'Закрыт'
};

const BRAK_STATUSES = ['SPAM', 'DUPLICATE', 'NON_TARGET'];
const REACHED_STATUSES = ['IN_PROGRESS', 'INTERESTED', 'BOOKED', 'REJECTED', 'CLOSED'];
const NOT_REACHED_STATUSES = ['NO_ANSWER', 'CALL_BACK'];

exports.exportLeadsReport = async (req, res) => {
  try {
    const { date_from, date_to, source, status } = req.query;
    const officeId = req.user.office_id;

    if (!date_from || !date_to) {
      return res.status(400).json({ success: false, message: 'Укажите период (date_from, date_to)' });
    }

    const conditions = ['l.office_id = ?'];
    const params = [officeId];

    conditions.push('l.created_at >= ?');
    params.push(date_from + ' 00:00:00');
    conditions.push('l.created_at <= ?');
    params.push(date_to + ' 23:59:59');

    if (source) {
      conditions.push('l.source = ?');
      params.push(source);
    }
    if (status) {
      conditions.push('l.status = ?');
      params.push(status);
    }

    const whereSql = conditions.join(' AND ');

    // Fetch leads with operator info
    const [leads] = await db.query(
      `SELECT
         l.*,
         CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) AS operator_name,
         (SELECT COUNT(*) FROM call_center_calls c WHERE c.lead_id = l.id) AS calls_count,
         (SELECT GROUP_CONCAT(c.result ORDER BY c.created_at SEPARATOR ', ') FROM call_center_calls c WHERE c.lead_id = l.id) AS call_results,
         (SELECT c.comment FROM call_center_calls c WHERE c.lead_id = l.id ORDER BY c.created_at DESC LIMIT 1) AS last_comment,
         TIMESTAMPDIFF(MINUTE, l.created_at, COALESCE(l.first_call_at, NOW())) AS response_time_minutes
       FROM call_center_leads l
       LEFT JOIN users u ON l.assigned_to = u.id
       WHERE ${whereSql}
       ORDER BY l.created_at DESC`,
      params
    );

    // Build workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'LawTech CRM';
    workbook.created = new Date();

    // ========== SHEET 1: Leads (raw data) ==========
    const wsLeads = workbook.addWorksheet('Лиды');

    // Header style
    const headerStyle = {
      font: { bold: true, size: 11, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } },
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
      border: {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
      }
    };

    wsLeads.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Дата поступления', key: 'created_at', width: 20 },
      { header: 'Источник', key: 'source', width: 18 },
      { header: 'ФИО', key: 'name', width: 25 },
      { header: 'Телефон', key: 'phone', width: 18 },
      { header: 'Email', key: 'email', width: 22 },
      { header: 'Описание', key: 'description', width: 30 },
      { header: 'Статус', key: 'status', width: 22 },
      { header: 'Результат звонков', key: 'call_results', width: 25 },
      { header: 'Кол-во звонков', key: 'calls_count', width: 14 },
      { header: 'Последний комментарий', key: 'last_comment', width: 30 },
      { header: 'Причина брака', key: 'brak_reason', width: 20 },
      { header: 'Оператор', key: 'operator_name', width: 22 },
      { header: 'Пометка', key: 'operator_note', width: 20 },
      { header: 'Время реакции (мин)', key: 'response_time', width: 18 },
      { header: 'Температура', key: 'temperature', width: 14 }
    ];

    // Apply header styles
    wsLeads.getRow(1).eachCell(cell => {
      cell.font = headerStyle.font;
      cell.fill = headerStyle.fill;
      cell.alignment = headerStyle.alignment;
      cell.border = headerStyle.border;
    });
    wsLeads.getRow(1).height = 30;

    const tempLabels = { hot: 'Горячий', warm: 'Тёплый', cold: 'Холодный' };

    leads.forEach(lead => {
      let brakReason = '';
      if (BRAK_STATUSES.includes(lead.status)) {
        brakReason = STATUS_LABELS[lead.status] || lead.status;
      }

      const row = wsLeads.addRow({
        id: lead.id,
        created_at: lead.created_at ? new Date(lead.created_at).toLocaleString('ru-RU', { timeZone: 'Asia/Novosibirsk' }) : '',
        source: lead.source || '',
        name: lead.name || '',
        phone: lead.phone || '',
        email: lead.email || '',
        description: lead.description || '',
        status: STATUS_LABELS[lead.status] || lead.status,
        call_results: lead.call_results || '',
        calls_count: lead.calls_count || 0,
        last_comment: lead.last_comment || '',
        brak_reason: brakReason,
        operator_name: (lead.operator_name || '').trim(),
        operator_note: lead.operator_note || '',
        response_time: lead.response_time_minutes != null ? lead.response_time_minutes : '',
        temperature: tempLabels[lead.temperature] || ''
      });

      // Color-code status cells
      const statusCell = row.getCell('status');
      if (BRAK_STATUSES.includes(lead.status)) {
        statusCell.font = { color: { argb: 'FFDC2626' } };
      } else if (lead.status === 'BOOKED') {
        statusCell.font = { color: { argb: 'FF059669' } };
      } else if (NOT_REACHED_STATUSES.includes(lead.status)) {
        statusCell.font = { color: { argb: 'FFD97706' } };
      }
    });

    // Auto-filter
    wsLeads.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: leads.length + 1, column: 16 }
    };

    // ========== SHEET 2: Statistics ==========
    const wsStat = workbook.addWorksheet('Статистика');

    const titleStyle = {
      font: { bold: true, size: 14, color: { argb: 'FF111827' } }
    };
    const sectionStyle = {
      font: { bold: true, size: 12, color: { argb: 'FF1E40AF' } }
    };
    const labelStyle = {
      font: { size: 11, color: { argb: 'FF6B7280' } }
    };
    const valueStyle = {
      font: { bold: true, size: 11, color: { argb: 'FF111827' } }
    };

    wsStat.getColumn(1).width = 35;
    wsStat.getColumn(2).width = 20;
    wsStat.getColumn(3).width = 20;

    const totalLeads = leads.length;
    const brakCount = leads.filter(l => BRAK_STATUSES.includes(l.status)).length;
    const reachedCount = leads.filter(l => REACHED_STATUSES.includes(l.status)).length;
    const notReachedCount = leads.filter(l => NOT_REACHED_STATUSES.includes(l.status)).length;
    const bookedCount = leads.filter(l => l.status === 'BOOKED').length;
    const newCount = leads.filter(l => l.status === 'NEW').length;
    const pct = (n) => totalLeads > 0 ? (n / totalLeads * 100).toFixed(1) + '%' : '0%';

    let rowNum = 1;

    // Title
    wsStat.getRow(rowNum).getCell(1).value = `Отчёт по лидам: ${date_from} — ${date_to}`;
    wsStat.getRow(rowNum).getCell(1).font = titleStyle.font;
    rowNum += 2;

    // General stats
    wsStat.getRow(rowNum).getCell(1).value = 'Общая статистика';
    wsStat.getRow(rowNum).getCell(1).font = sectionStyle.font;
    rowNum++;

    const addStatRow = (label, value) => {
      wsStat.getRow(rowNum).getCell(1).value = label;
      wsStat.getRow(rowNum).getCell(1).font = labelStyle.font;
      wsStat.getRow(rowNum).getCell(2).value = value;
      wsStat.getRow(rowNum).getCell(2).font = valueStyle.font;
      rowNum++;
    };

    addStatRow('Всего лидов за период', totalLeads);
    addStatRow('Новые (необработанные)', `${newCount} (${pct(newCount)})`);
    addStatRow('Дозвон', `${reachedCount} (${pct(reachedCount)})`);
    addStatRow('Недозвон', `${notReachedCount} (${pct(notReachedCount)})`);
    addStatRow('Записано на консультацию', `${bookedCount} (${pct(bookedCount)})`);
    addStatRow('Брак (спам / дубль / нецелевой)', `${brakCount} (${pct(brakCount)})`);
    addStatRow('Конверсия (записан / всего)', pct(bookedCount));

    rowNum += 1;

    // Status breakdown
    wsStat.getRow(rowNum).getCell(1).value = 'Разбивка по статусам';
    wsStat.getRow(rowNum).getCell(1).font = sectionStyle.font;
    rowNum++;

    wsStat.getRow(rowNum).getCell(1).value = 'Статус';
    wsStat.getRow(rowNum).getCell(1).font = { bold: true };
    wsStat.getRow(rowNum).getCell(2).value = 'Количество';
    wsStat.getRow(rowNum).getCell(2).font = { bold: true };
    wsStat.getRow(rowNum).getCell(3).value = 'Процент';
    wsStat.getRow(rowNum).getCell(3).font = { bold: true };
    rowNum++;

    const statusCounts = {};
    leads.forEach(l => {
      statusCounts[l.status] = (statusCounts[l.status] || 0) + 1;
    });
    Object.entries(statusCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([st, count]) => {
        wsStat.getRow(rowNum).getCell(1).value = STATUS_LABELS[st] || st;
        wsStat.getRow(rowNum).getCell(2).value = count;
        wsStat.getRow(rowNum).getCell(3).value = pct(count);
        rowNum++;
      });

    rowNum += 1;

    // Source breakdown
    wsStat.getRow(rowNum).getCell(1).value = 'Разбивка по источникам';
    wsStat.getRow(rowNum).getCell(1).font = sectionStyle.font;
    rowNum++;

    wsStat.getRow(rowNum).getCell(1).value = 'Источник';
    wsStat.getRow(rowNum).getCell(1).font = { bold: true };
    wsStat.getRow(rowNum).getCell(2).value = 'Всего';
    wsStat.getRow(rowNum).getCell(2).font = { bold: true };
    wsStat.getRow(rowNum).getCell(3).value = 'Брак';
    wsStat.getRow(rowNum).getCell(3).font = { bold: true };
    rowNum++;

    const sourceCounts = {};
    leads.forEach(l => {
      if (!sourceCounts[l.source]) sourceCounts[l.source] = { total: 0, brak: 0 };
      sourceCounts[l.source].total++;
      if (BRAK_STATUSES.includes(l.status)) sourceCounts[l.source].brak++;
    });
    Object.entries(sourceCounts)
      .sort((a, b) => b[1].total - a[1].total)
      .forEach(([src, data]) => {
        wsStat.getRow(rowNum).getCell(1).value = src;
        wsStat.getRow(rowNum).getCell(2).value = data.total;
        wsStat.getRow(rowNum).getCell(3).value = `${data.brak} (${data.total > 0 ? (data.brak / data.total * 100).toFixed(1) : 0}%)`;
        rowNum++;
      });

    // Generate buffer and send
    const buffer = await workbook.xlsx.writeBuffer();

    const filename = `leads_report_${date_from}_${date_to}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);

  } catch (error) {
    console.error('Export leads report error:', error);
    res.status(500).json({ success: false, message: 'Ошибка при формировании отчёта' });
  }
};
