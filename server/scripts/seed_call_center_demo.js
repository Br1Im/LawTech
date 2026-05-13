/**
 * Seed demo leads for the Call Center module.
 *
 * Generates 20 leads (mixed Pravoved.ru / Gainnet) with various statuses,
 * temperatures and assignees, so the new TZ-compliant flow can be demoed
 * end-to-end (folders by source, bulk-assign, operator filters, stats).
 *
 * Idempotent: identifies existing demo leads via metadata.demo_seed=true
 * and skips creation when at least 10 demo leads already exist.
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

const SOURCES = ['pravoved.ru', 'gainnet'];
const STATUSES = ['NEW', 'IN_PROGRESS', 'NO_ANSWER', 'BOOKED', 'REJECTED'];
const TEMPERATURES = [null, 'hot', 'warm', 'cold'];

const FIRST_NAMES = ['Алексей', 'Мария', 'Иван', 'Ольга', 'Дмитрий', 'Светлана', 'Сергей', 'Анна', 'Павел', 'Екатерина'];
const LAST_NAMES  = ['Иванов', 'Петрова', 'Сидоров', 'Кузнецова', 'Смирнов', 'Морозова', 'Попов', 'Васильева', 'Волков', 'Соловьева'];

const DESCRIPTIONS = [
  'Нужна консультация по разделу имущества при разводе. Двое детей, ипотека.',
  'Срочно. Нужен юрист по трудовому праву — уволили без объяснения причин.',
  'Вопрос по наследству. Бабушка оставила квартиру, есть другие наследники.',
  'Хочу составить брачный договор. Уточнить процедуру и стоимость.',
  'Спор с соседями по поводу границ участка, дошло до суда.',
  'Нужен возврат денег за некачественно оказанную услугу. Сумма около 200к.',
  'Помогите оспорить штраф ГИБДД, считаю его незаконным.',
  'Открываю ИП, нужна консультация по налогам и оптимальной системе.',
  'Вопрос по защите прав потребителей. Магазин отказал в возврате товара.',
  'Нужно составить договор аренды коммерческой недвижимости.',
  'Бракоразводный процесс с разделом совместного бизнеса.',
  'Конфликт по договору подряда — подрядчик не выполнил обязательства в срок.',
  'Вопрос по миграционному законодательству, нужен ВНЖ.',
  'Помощь в банкротстве физического лица, кредиты на 3+ млн.',
  'Корпоративный спор между учредителями ООО, нужна стратегия защиты.',
  'Уголовное дело по статье о мошенничестве — нужен опытный адвокат.',
  'Защита персональных данных в интернете, утечка информации с сайта.',
  'Земельный вопрос: переоформление дачного участка из СНТ в собственность.',
  'Споры с управляющей компанией по поводу начислений за коммуналку.',
  'Авторские права: незаконное использование моих фотографий конкурентами.'
];

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[randInt(0, arr.length - 1)];

const phone = () => `+7 (9${randInt(10, 99)}) ${randInt(100, 999)}-${randInt(10, 99)}-${randInt(10, 99)}`;

(async () => {
  let connection;
  try {
    connection = await mysql.createConnection({
      host:     process.env.DB_HOST     || 'localhost',
      port:     process.env.DB_PORT     || 3306,
      user:     process.env.DB_USER     || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME     || 'lawtech_crm'
    });

    // Centralised CC: spread leads across ALL offices.
    const [allOffices] = await connection.query('SELECT id, name FROM offices ORDER BY id');
    if (allOffices.length === 0) {
      console.error('❌ Нет ни одного офиса в БД, сначала создайте офис.');
      process.exit(1);
    }
    // Make sure we have at least 3 offices (filiали). If fewer, create demo branches.
    const targetOfficeCount = 3;
    if (allOffices.length < targetOfficeCount) {
      const branchNames = ['Центральный офис', 'Филиал «Север»', 'Филиал «Юг»'];
      for (let i = allOffices.length; i < targetOfficeCount; i++) {
        const [res] = await connection.query(
          `INSERT INTO offices (name, address, phone, created_at, updated_at)
           VALUES (?, ?, ?, NOW(), NOW())`,
          [branchNames[i] || `Филиал #${i + 1}`, 'г. Москва, ул. Демо', '+7 (495) 000-0000']
        );
        allOffices.push({ id: res.insertId, name: branchNames[i] });
      }
    }
    const officeIds = allOffices.map((o) => o.id);

    // Skip if demo data already present (across any office).
    const [existing] = await connection.query(
      `SELECT COUNT(*) AS cnt FROM call_center_leads
       WHERE JSON_EXTRACT(metadata, '$.demo_seed') = true`
    );
    if (Number(existing[0].cnt) >= 18) {
      console.log(`ℹ  Уже есть ${existing[0].cnt} demo-лидов, пропускаем посев.`);
      await connection.end();
      return;
    }

    // Pick all cc_operator users across offices so leads pre-assign cross-office.
    const [operators] = await connection.query(
      `SELECT id, office_id FROM users WHERE role = 'cc_operator' ORDER BY id`
    );
    const operatorIds = operators.map((r) => r.id);

    const total = 24;
    let created = 0;

    for (let i = 0; i < total; i++) {
      const source = SOURCES[i % SOURCES.length];
      const officeId = officeIds[i % officeIds.length];
      const firstName = pick(FIRST_NAMES);
      const lastName = pick(LAST_NAMES);
      const name = `${firstName} ${lastName}`;
      const description = DESCRIPTIONS[i % DESCRIPTIONS.length];
      const status = pick(STATUSES);
      const temperature = pick(TEMPERATURES);
      const score = randInt(20, 95);
      // First third stays unassigned (Начальник КЦ должен распределить).
      const assignedTo = i < total / 3 || operatorIds.length === 0 ? null : pick(operatorIds);
      const createdHoursAgo = randInt(0, 72);

      await connection.query(
        `INSERT INTO call_center_leads
           (office_id, source, external_id, name, phone, email, description,
            status, score, temperature, assigned_to, created_at, updated_at, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? HOUR),
                 DATE_SUB(NOW(), INTERVAL ? HOUR), ?)`,
        [
          officeId,
          source,
          `${source}-demo-${Date.now()}-${i}`,
          name,
          phone(),
          `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
          description,
          status,
          score,
          temperature,
          assignedTo,
          createdHoursAgo,
          createdHoursAgo,
          JSON.stringify({ demo_seed: true })
        ]
      );
      created++;
    }

    console.log(`✅ Создано ${created} demo-лидов в ${officeIds.length} офисах (источники: ${SOURCES.join(', ')})`);
    await connection.end();
  } catch (error) {
    console.error('❌ Ошибка посева demo-лидов:', error);
    if (connection) await connection.end();
    process.exit(1);
  }
})();
