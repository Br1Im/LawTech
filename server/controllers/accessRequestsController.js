const db = require('../db');

const clean = (value, max) => String(value || '').trim().replace(/\s+/g, ' ').slice(0, max);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.create = async (req, res) => {
  try {
    const fullName = clean(req.body.full_name, 160);
    const email = clean(req.body.email, 190).toLowerCase();
    const phone = clean(req.body.phone, 32);
    const honeypot = clean(req.body.website, 120);
    if (honeypot) return res.status(200).json({ success: true });
    if (!req.body.consent) return res.status(400).json({ success: false, message: 'Подтвердите согласие на обработку данных' });
    if (fullName.length < 5) return res.status(400).json({ success: false, message: 'Укажите полное ФИО' });
    if (!emailPattern.test(email)) return res.status(400).json({ success: false, message: 'Проверьте электронную почту' });
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) return res.status(400).json({ success: false, message: 'Проверьте номер телефона' });
    const [result] = await db.query(
      `INSERT INTO access_requests (full_name, email, phone, status, consent_at, ip_address, user_agent)
       VALUES (?, ?, ?, 'new', NOW(), ?, ?)`,
      [fullName, email, phone, String(req.ip || '').slice(0, 64), String(req.get('user-agent') || '').slice(0, 500)]
    );
    return res.status(201).json({ success: true, data: { id: result.insertId } });
  } catch (error) {
    console.error('Error creating access request:', error);
    return res.status(500).json({ success: false, message: 'Не удалось отправить заявку. Попробуйте позже.' });
  }
};
