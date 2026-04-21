/**
 * Демо-данные для CRM: офис, сотрудники, клиенты, договоры, дела, расходы, приходы, материалы, события.
 * Идемпотентный — безопасно перезапускать.
 */
require('dotenv').config();
const db = require('../db');

async function ensureOffice() {
  const [rows] = await db.query('SELECT id FROM offices WHERE name = ? LIMIT 1', ['Юридическая фирма «Правовед»']);
  if (rows.length) return rows[0].id;
  const [r] = await db.query(
    `INSERT INTO offices (name, address, phone, website) VALUES (?, ?, ?, ?)`,
    ['Юридическая фирма «Правовед»', 'Москва, ул. Тверская, 10', '+7 495 123-45-67', 'https://pravoved.ru']
  );
  return r.insertId;
}

async function linkUsers(officeId) {
  // Привязываем всех тестовых пользователей к демо-офису
  await db.query(`UPDATE users SET office_id = ? WHERE office_id IS NULL`, [officeId]);
}

async function ensureEmployees(officeId) {
  const [existing] = await db.query('SELECT id FROM employees WHERE office_id = ?', [officeId]);
  if (existing.length >= 4) return existing.map(e => e.id);
  const team = [
    ['Анна', 'Соколова', 'a.sokolova@pravoved.ru', '+7 916 111-22-33', 'Старший юрист'],
    ['Максим', 'Иванов', 'm.ivanov@pravoved.ru', '+7 916 222-33-44', 'Юрист'],
    ['Елена', 'Кузнецова', 'e.kuznetsova@pravoved.ru', '+7 916 333-44-55', 'Юрист'],
    ['Денис', 'Морозов', 'd.morozov@pravoved.ru', '+7 916 444-55-66', 'Эксперт']
  ];
  const ids = [];
  for (const [fn, ln, em, ph, pos] of team) {
    const [[row]] = await db.query('SELECT id FROM employees WHERE email = ? LIMIT 1', [em]);
    if (row) { ids.push(row.id); continue; }
    const [r] = await db.query(
      `INSERT INTO employees (first_name, last_name, email, phone, position, office_id) VALUES (?, ?, ?, ?, ?, ?)`,
      [fn, ln, em, ph, pos, officeId]
    );
    ids.push(r.insertId);
  }
  return ids;
}

async function ensureClients(officeId) {
  const [existing] = await db.query('SELECT id FROM clients WHERE office_id = ?', [officeId]);
  if (existing.length >= 6) return existing.map(e => e.id);
  const demo = [
    ['Иван Петров', null, '+7 903 111-11-11', 'ivan.petrov@example.com', 'Москва, Арбат 20', 'Постоянный клиент', 'active'],
    ['ООО «Альфа-Консалт»', 'ООО «Альфа-Консалт»', '+7 495 987-65-43', 'info@alfa-c.ru', 'СПб, Невский 100', 'Корпоративный клиент', 'active'],
    ['Мария Смирнова', null, '+7 903 222-22-22', 'maria.s@example.com', 'Казань, Баумана 5', '', 'active'],
    ['ИП Козлов А.В.', null, '+7 903 333-33-33', 'kozlov@example.com', 'Екатеринбург', 'Семейное право', 'active'],
    ['ООО «ТехноПром»', 'ООО «ТехноПром»', '+7 812 555-66-77', 'legal@technoprom.ru', 'СПб', 'Договорное право', 'active'],
    ['Андрей Никитин', null, '+7 903 444-44-44', 'a.nikitin@example.com', 'Новосибирск', '', 'prospective']
  ];
  const ids = [];
  for (const [name, company, phone, email, address, notes, status] of demo) {
    const [[row]] = await db.query('SELECT id FROM clients WHERE name = ? AND office_id = ? LIMIT 1', [name, officeId]);
    if (row) { ids.push(row.id); continue; }
    const [r] = await db.query(
      `INSERT INTO clients (name, company, phone, email, address, notes, status, office_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, company, phone, email, address, notes, status, officeId]
    );
    ids.push(r.insertId);
  }
  return ids;
}

async function ensureContracts(clientIds, employeeIds) {
  const [[{ count }]] = await db.query('SELECT COUNT(*) AS count FROM contracts');
  if (count >= 6) return;
  const today = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  const samples = [
    [clientIds[0], employeeIds[0], iso(new Date(today.getTime() - 30*86400000)), 150000, 100000, 'active', 'Консультация по наследственному праву'],
    [clientIds[1], employeeIds[1], iso(new Date(today.getTime() - 20*86400000)), 450000, 450000, 'active', 'Сопровождение M&A сделки'],
    [clientIds[2], employeeIds[2], iso(new Date(today.getTime() - 10*86400000)), 80000, 40000, 'active', 'Бракоразводный процесс'],
    [clientIds[3], employeeIds[0], iso(new Date(today.getTime() - 5*86400000)), 120000, 120000, 'completed', 'Регистрация бизнеса'],
    [clientIds[4], employeeIds[1], iso(today), 280000, 150000, 'active', 'Защита интересов в арбитражном споре'],
    [clientIds[5], employeeIds[2], iso(new Date(today.getTime() - 2*86400000)), 60000, 0, 'active', 'Трудовой спор']
  ];
  for (const [clId, empId, date, amount, paid, status, title] of samples) {
    await db.query(
      `INSERT INTO contracts (id_client, id_employee, contract_date, amount, paid_amount, status, title) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [clId, empId, date, amount, paid, status, title]
    );
  }
}

async function ensureCases(officeId, clientIds, employeeIds) {
  const [[{ count }]] = await db.query('SELECT COUNT(*) AS count FROM cases WHERE office_id = ?', [officeId]);
  if (count >= 4) return;
  const today = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  const samples = [
    [clientIds[0], employeeIds[0], 'Спор о наследстве', 'Д-2025-001', 'Наследственное', 'in_progress', 'high', iso(today), iso(new Date(today.getTime() + 30*86400000))],
    [clientIds[1], employeeIds[1], 'Сделка слияния', 'Д-2025-002', 'Корпоративное', 'in_progress', 'urgent', iso(new Date(today.getTime() - 20*86400000)), iso(new Date(today.getTime() + 60*86400000))],
    [clientIds[2], employeeIds[2], 'Развод с разделом имущества', 'Д-2025-003', 'Семейное', 'waiting', 'medium', iso(new Date(today.getTime() - 15*86400000)), iso(new Date(today.getTime() + 45*86400000))],
    [clientIds[4], employeeIds[1], 'Арбитражный иск', 'Д-2025-004', 'Арбитраж', 'new', 'high', iso(today), iso(new Date(today.getTime() + 90*86400000))]
  ];
  for (const [clId, empId, title, num, cat, status, priority, startD, deadline] of samples) {
    await db.query(
      `INSERT INTO cases (office_id, client_id, employee_id, title, case_number, category, status, priority, start_date, deadline) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [officeId, clId, empId, title, num, cat, status, priority, startD, deadline]
    );
  }
}

async function ensureExpenses(officeId, userId) {
  const [[{ count }]] = await db.query('SELECT COUNT(*) AS count FROM expenses WHERE office_id = ?', [officeId]);
  if (count >= 5) return;
  const today = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  const samples = [
    ['Аренда', 150000, 'Аренда офиса (октябрь)', iso(new Date(today.getTime() - 5*86400000))],
    ['Зарплата', 680000, 'Зарплата юристов', iso(new Date(today.getTime() - 3*86400000))],
    ['Канцтовары', 12500, 'Закупка канцелярии', iso(new Date(today.getTime() - 7*86400000))],
    ['Лицензии', 45000, 'Продление лицензий ПО', iso(new Date(today.getTime() - 10*86400000))],
    ['Маркетинг', 85000, 'Контекстная реклама', iso(new Date(today.getTime() - 2*86400000))]
  ];
  for (const [cat, amount, title, date] of samples) {
    await db.query(
      `INSERT INTO expenses (office_id, category, amount, title, spent_on, created_by) VALUES (?, ?, ?, ?, ?, ?)`,
      [officeId, cat, amount, title, date, userId]
    );
  }
}

async function ensureArrivals(officeId, userId, clientIds) {
  const [[{ count }]] = await db.query('SELECT COUNT(*) AS count FROM arrivals WHERE office_id = ?', [officeId]);
  if (count >= 5) return;
  const today = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  const samples = [
    ['Оплата по договору', 450000, 'ООО «Альфа-Консалт» — оплата за M&A', clientIds[1], iso(new Date(today.getTime() - 18*86400000))],
    ['Оплата по договору', 100000, 'И. Петров — предоплата', clientIds[0], iso(new Date(today.getTime() - 25*86400000))],
    ['Консультация', 15000, 'Разовая консультация', null, iso(new Date(today.getTime() - 3*86400000))],
    ['Оплата по договору', 120000, 'ИП Козлов — окончательный расчёт', clientIds[3], iso(new Date(today.getTime() - 5*86400000))],
    ['Оплата по договору', 150000, 'ООО «ТехноПром» — аванс', clientIds[4], iso(new Date(today.getTime()))]
  ];
  for (const [source, amount, title, clientId, date] of samples) {
    await db.query(
      `INSERT INTO arrivals (office_id, source, amount, title, client_id, received_on, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [officeId, source, amount, title, clientId, date, userId]
    );
  }
}

async function ensureMaterials(officeId, userId) {
  const [[{ count }]] = await db.query('SELECT COUNT(*) AS count FROM materials WHERE office_id = ?', [officeId]);
  if (count >= 4) return;
  const samples = [
    ['Шаблон договора оказания услуг', 'Шаблон', 'Стандартный шаблон возмездного оказания услуг', '/templates/services.docx'],
    ['Инструкция по регистрации ООО', 'Регламент', 'Пошаговая инструкция регистрации ООО', '/docs/registration.pdf'],
    ['Чек-лист M&A due diligence', 'Чек-лист', 'Проверка юридической чистоты при слиянии', '/docs/mna-dd.pdf'],
    ['Форма доверенности', 'Шаблон', 'Универсальная форма доверенности', '/templates/poa.docx']
  ];
  for (const [name, cat, desc, url] of samples) {
    await db.query(
      `INSERT INTO materials (office_id, name, category, description, file_url, created_by) VALUES (?, ?, ?, ?, ?, ?)`,
      [officeId, name, cat, desc, url, userId]
    );
  }
}

async function ensureCalendarEvents(officeId) {
  const [[{ count }]] = await db.query('SELECT COUNT(*) AS count FROM calendar_events WHERE office_id = ?', [officeId]);
  if (count >= 4) return;
  const today = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  const samples = [
    ['Встреча с клиентом — Петров', 'Консультация по наследству', iso(new Date(today.getTime() + 1*86400000)), '10:00:00', 'meeting', 'high', 'Офис, переговорка 1'],
    ['Суд по делу Д-2025-002', 'Арбитражный суд, зал 404', iso(new Date(today.getTime() + 3*86400000)), '11:30:00', 'court', 'urgent', 'Арбитражный суд г. Москвы'],
    ['Внутренняя планёрка', 'Еженедельное совещание команды', iso(new Date(today.getTime() + 2*86400000)), '09:30:00', 'meeting', 'medium', 'Офис, конференц-зал'],
    ['Подписание M&A сделки', 'Офис Альфа-Консалт', iso(new Date(today.getTime() + 7*86400000)), '14:00:00', 'deal', 'urgent', 'ООО «Альфа-Консалт»']
  ];
  for (const [title, desc, date, time, type, priority, location] of samples) {
    await db.query(
      `INSERT INTO calendar_events (title, description, start_date, time, type, priority, location, office_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, desc, date, time, type, priority, location, officeId]
    );
  }
}

async function run() {
  try {
    console.log('🌱 Сид демо-данных...');
    const officeId = await ensureOffice();
    console.log('  📍 Офис ID:', officeId);
    await linkUsers(officeId);
    const employeeIds = await ensureEmployees(officeId);
    const clientIds = await ensureClients(officeId);
    await ensureContracts(clientIds, employeeIds);
    await ensureCases(officeId, clientIds, employeeIds);
    const [[user]] = await db.query('SELECT id FROM users WHERE office_id = ? ORDER BY id LIMIT 1', [officeId]);
    await ensureExpenses(officeId, user?.id || null);
    await ensureArrivals(officeId, user?.id || null, clientIds);
    await ensureMaterials(officeId, user?.id || null);
    await ensureCalendarEvents(officeId);
    console.log('✅ Демо-данные готовы');
    process.exit(0);
  } catch (e) {
    console.error('❌ Ошибка сида:', e);
    process.exit(1);
  }
}

run();
