const db = require('../db');
const { checkOfficeAccess } = require('../utils/ensureOffice');

const cleanPhone = (value) => String(value || '').trim().replace(/\s+/g, ' ').slice(0, 50);
const EDIT_ROLES = new Set(['admin', 'administrator', 'director', 'manager', 'okk', 'lawyer']);
const canEdit = (req) => EDIT_ROLES.has(String(req.user?.role || '').toLowerCase());

async function accessibleClient(req) {
  const [[client]] = await db.query('SELECT id, office_id, phone FROM clients WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
  if (!client) return { error: [404, 'Клиент не найден'] };
  if (!await checkOfficeAccess(req.user, client.office_id)) return { error: [403, 'Доступ запрещён'] };
  return { client };
}

exports.list = async (req, res) => {
  try {
    const access = await accessibleClient(req);
    if (access.error) return res.status(access.error[0]).json({ success: false, message: access.error[1] });
    const [rows] = await db.query('SELECT id, phone, label, is_primary, created_at FROM client_phones WHERE client_id = ? ORDER BY is_primary DESC, id ASC', [access.client.id]);
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('client phones list:', error);
    return res.status(500).json({ success: false, message: 'Не удалось загрузить телефоны' });
  }
};

exports.create = async (req, res) => {
  try {
    if (!canEdit(req)) return res.status(403).json({ success: false, message: 'Нет права изменять телефоны клиента' });
    const access = await accessibleClient(req);
    if (access.error) return res.status(access.error[0]).json({ success: false, message: access.error[1] });
    const phone = cleanPhone(req.body.phone);
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) return res.status(400).json({ success: false, message: 'Проверьте номер телефона' });
    const [[count]] = await db.query('SELECT COUNT(*) total FROM client_phones WHERE client_id = ?', [access.client.id]);
    if (Number(count.total) >= 10) return res.status(400).json({ success: false, message: 'Можно сохранить не более 10 номеров' });
    const isPrimary = Number(count.total) === 0 ? 1 : 0;
    const [result] = await db.query(
      'INSERT INTO client_phones (client_id, phone, label, is_primary, created_by) VALUES (?, ?, ?, ?, ?)',
      [access.client.id, phone, String(req.body.label || '').trim().slice(0, 80) || null, isPrimary, req.user.id]
    );
    if (isPrimary || !access.client.phone) await db.query('UPDATE clients SET phone = ? WHERE id = ?', [phone, access.client.id]);
    return res.status(201).json({ success: true, data: { id: result.insertId, phone, label: req.body.label || null, is_primary: isPrimary } });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Этот номер уже добавлен' });
    console.error('client phone create:', error);
    return res.status(500).json({ success: false, message: 'Не удалось добавить телефон' });
  }
};


exports.update = async (req, res) => {
  const connection=await db.getClient();
  try { if(!canEdit(req))return res.status(403).json({success:false,message:'Нет права изменять телефоны клиента'});const access=await accessibleClient(req);if(access.error)return res.status(access.error[0]).json({success:false,message:access.error[1]});const phone=cleanPhone(req.body.phone),digits=phone.replace(/\D/g,'');if(digits.length<10||digits.length>15)return res.status(400).json({success:false,message:'Проверьте номер телефона'});await connection.beginTransaction();const[[row]]=await connection.query('SELECT * FROM client_phones WHERE id=? AND client_id=? FOR UPDATE',[req.params.phoneId,access.client.id]);if(!row){await connection.rollback();return res.status(404).json({success:false,message:'Телефон не найден'});}await connection.query('UPDATE client_phones SET phone=?,label=? WHERE id=?',[phone,String(req.body.label||row.label||'').trim().slice(0,80)||null,row.id]);if(row.is_primary)await connection.query('UPDATE clients SET phone=? WHERE id=?',[phone,access.client.id]);await connection.commit();res.json({success:true,data:{...row,phone}});} catch(error){try{await connection.rollback()}catch{};if(error.code==='ER_DUP_ENTRY')return res.status(409).json({success:false,message:'Этот номер уже добавлен'});res.status(500).json({success:false,message:'Не удалось изменить телефон'});} finally{connection.release();}
};

exports.remove = async (req, res) => {
  if (!canEdit(req)) return res.status(403).json({ success: false, message: 'Нет права изменять телефоны клиента' });
  const connection = await db.getClient();
  try {
    const access = await accessibleClient(req);
    if (access.error) return res.status(access.error[0]).json({ success: false, message: access.error[1] });
    await connection.beginTransaction();
    const [[phone]] = await connection.query('SELECT * FROM client_phones WHERE id = ? AND client_id = ? FOR UPDATE', [req.params.phoneId, access.client.id]);
    if (!phone) { await connection.rollback(); return res.status(404).json({ success: false, message: 'Телефон не найден' }); }
    await connection.query('DELETE FROM client_phones WHERE id = ?', [phone.id]);
    if (phone.is_primary) {
      const [[next]] = await connection.query('SELECT id, phone FROM client_phones WHERE client_id = ? ORDER BY id ASC LIMIT 1', [access.client.id]);
      await connection.query('UPDATE clients SET phone = ? WHERE id = ?', [next?.phone || '', access.client.id]);
      if (next) await connection.query('UPDATE client_phones SET is_primary = 1 WHERE id = ?', [next.id]);
    }
    await connection.commit();
    return res.json({ success: true });
  } catch (error) {
    try { await connection.rollback(); } catch (_) {}
    console.error('client phone remove:', error);
    return res.status(500).json({ success: false, message: 'Не удалось удалить телефон' });
  } finally { connection.release(); }
};
