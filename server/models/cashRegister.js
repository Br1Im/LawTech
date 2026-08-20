const db = require('../db');

class CashRegister {
  static async list(officeId, dateFrom, dateTo) {
    let where = 'cr.office_id = ?';
    const params = [officeId];
    if (dateFrom) { where += ' AND cr.entry_date >= ?'; params.push(dateFrom); }
    if (dateTo) { where += ' AND cr.entry_date <= ?'; params.push(dateTo); }

    const [rows] = await db.query(
      `SELECT cr.*,
              CONCAT(u.first_name, ' ', u.last_name) as created_by_name
       FROM cash_register cr
       LEFT JOIN users u ON cr.created_by = u.id
       WHERE ${where}
       ORDER BY cr.entry_date DESC, cr.id ASC`,
      params
    );
    return rows;
  }

  static async dailyTotals(officeId, dateFrom, dateTo) {
    let where = 'office_id = ?';
    const params = [officeId];
    if (dateFrom) { where += ' AND entry_date >= ?'; params.push(dateFrom); }
    if (dateTo) { where += ' AND entry_date <= ?'; params.push(dateTo); }

    const [rows] = await db.query(
      `SELECT entry_date,
              SUM(cash_amount) as total_cash,
              SUM(noncash_amount) as total_noncash,
              SUM(bank_amount) as total_bank,
              SUM(expense_amount) as total_expense,
              COUNT(*) as entries_count
       FROM cash_register
       WHERE ${where}
       GROUP BY entry_date
       ORDER BY entry_date DESC`,
      params
    );
    return rows;
  }

  static async create(data) {
    const { office_id, entry_date, client_name, contract_number, action,
            lawyer_name, employee_id, cash_amount, noncash_amount,
            bank_amount, expense_amount, comment, created_by } = data;

    const [result] = await db.query(
      `INSERT INTO cash_register
       (office_id, entry_date, client_name, contract_number, action,
        lawyer_name, employee_id, cash_amount, noncash_amount,
        bank_amount, expense_amount, comment, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [office_id, entry_date, client_name || null, contract_number || null,
       action || null, lawyer_name || null, employee_id || null,
       cash_amount || 0, noncash_amount || 0, bank_amount || 0,
       expense_amount || 0, comment || null, created_by]
    );
    return { id: result.insertId, ...data };
  }

  static async update(id, officeId, data) {
    const sets = [];
    const params = [];
    const fields = ['entry_date', 'client_name', 'contract_number', 'action',
                     'lawyer_name', 'employee_id', 'cash_amount', 'noncash_amount',
                     'bank_amount', 'expense_amount', 'comment'];
    for (const f of fields) {
      if (data[f] !== undefined) { sets.push(`${f} = ?`); params.push(data[f]); }
    }
    if (sets.length === 0) return null;
    params.push(id, officeId);
    const [result] = await db.query(`UPDATE cash_register SET ${sets.join(', ')} WHERE id = ? AND office_id = ?`, params);
    if (!result.affectedRows) return null;
    const [rows] = await db.query('SELECT * FROM cash_register WHERE id = ? AND office_id = ?', [id, officeId]);
    return rows[0];
  }

  static async remove(id, officeId) {
    const [result] = await db.query('DELETE FROM cash_register WHERE id = ? AND office_id = ?', [id, officeId]);
    return result.affectedRows > 0;
  }

  static async stats(officeId, dateFrom, dateTo) {
    let where = 'office_id = ?';
    const params = [officeId];
    if (dateFrom) { where += ' AND entry_date >= ?'; params.push(dateFrom); }
    if (dateTo) { where += ' AND entry_date <= ?'; params.push(dateTo); }

    const [rows] = await db.query(
      `SELECT
         SUM(cash_amount) as total_cash,
         SUM(noncash_amount) as total_noncash,
         SUM(bank_amount) as total_bank,
         SUM(expense_amount) as total_expense,
         SUM(cash_amount + noncash_amount + bank_amount) as total_income,
         SUM(cash_amount + noncash_amount + bank_amount - expense_amount) as net_total,
         COUNT(*) as entries_count
       FROM cash_register
       WHERE ${where}`,
      params
    );
    return rows[0] || { total_cash: 0, total_noncash: 0, total_bank: 0, total_expense: 0, total_income: 0, net_total: 0, entries_count: 0 };
  }
}

module.exports = CashRegister;
