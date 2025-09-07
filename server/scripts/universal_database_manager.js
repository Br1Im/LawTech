/**
 * Универсальный менеджер базы данных
 * Проверяет структуру БД, дополняет недостающие элементы и добавляет данные
 * Легко расширяется для новых таблиц и данных
 */

const { 
  ensureDatabaseStructure, 
  createLawyerAccount, 
  DATABASE_SCHEMA,
  createOffice,
  createUser,
  createEmployee,
  createOfficeStats,
  createChartData
} = require('./universal_setup');
const { query } = require('../db');

// Базовая схема расширений (можно добавлять новые таблицы)
const EXTENSIONS_SCHEMA = {
  clients: {
    columns: [
      'id INTEGER PRIMARY KEY AUTOINCREMENT',
      'office_id INTEGER NOT NULL',
      'full_name TEXT NOT NULL',
      'phone TEXT',
      'email TEXT',
      'address TEXT',
      'case_type TEXT CHECK(case_type IN ("civil", "criminal", "family", "corporate", "administrative"))',
      'status TEXT DEFAULT "active" CHECK(status IN ("active", "inactive", "archived"))',
      'created_at DATETIME DEFAULT CURRENT_TIMESTAMP',
      'updated_at DATETIME DEFAULT CURRENT_TIMESTAMP'
    ],
    foreignKeys: [
      'FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE'
    ]
  },
  cases: {
    columns: [
      'id INTEGER PRIMARY KEY AUTOINCREMENT',
      'office_id INTEGER NOT NULL',
      'client_id INTEGER NOT NULL',
      'employee_id INTEGER NOT NULL',
      'case_number TEXT UNIQUE NOT NULL',
      'title TEXT NOT NULL',
      'description TEXT',
      'case_type TEXT CHECK(case_type IN ("civil", "criminal", "family", "corporate", "administrative"))',
      'status TEXT DEFAULT "open" CHECK(status IN ("open", "in_progress", "closed", "archived"))',
      'start_date DATE',
      'end_date DATE',
      'fee DECIMAL(10,2)',
      'created_at DATETIME DEFAULT CURRENT_TIMESTAMP',
      'updated_at DATETIME DEFAULT CURRENT_TIMESTAMP'
    ],
    foreignKeys: [
      'FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE',
      'FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE',
      'FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE'
    ]
  }
};

// Функция для проверки существования таблицы
async function tableExists(tableName) {
  try {
    const result = await query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      [tableName]
    );
    return result.length > 0;
  } catch (error) {
    console.error(`Ошибка при проверке таблицы ${tableName}:`, error);
    return false;
  }
}

// Функция для создания таблицы
async function createTable(tableName, schema) {
  try {
    const columns = schema.columns.join(', ');
    const foreignKeys = schema.foreignKeys ? schema.foreignKeys.join(', ') : '';
    const tableDefinition = foreignKeys ? `${columns}, ${foreignKeys}` : columns;
    
    const createQuery = `CREATE TABLE ${tableName} (${tableDefinition})`;
    
    console.log(`📋 Создание таблицы ${tableName}...`);
    await query(createQuery);
    console.log(`✅ Таблица ${tableName} создана успешно`);
  } catch (error) {
    console.error(`❌ Ошибка при создании таблицы ${tableName}:`, error);
    throw error;
  }
}

// Функция для обновления схемы базы данных
async function updateDatabaseSchema(extensionsSchema = {}) {
  console.log('🔄 Проверка и обновление схемы базы данных...');
  
  try {
    // Сначала обеспечиваем базовую структуру
    await ensureDatabaseStructure();
    
    // Затем добавляем расширения
    const allExtensions = { ...EXTENSIONS_SCHEMA, ...extensionsSchema };
    
    for (const [tableName, schema] of Object.entries(allExtensions)) {
      if (!DATABASE_SCHEMA[tableName]) {
        console.log(`\n🔍 Проверка таблицы расширения: ${tableName}`);
        const exists = await tableExists(tableName);
        
        if (!exists) {
          console.log(`⚠️  Таблица ${tableName} не существует, создаем...`);
          await createTable(tableName, schema);
        } else {
          console.log(`✅ Таблица ${tableName} уже существует`);
        }
      }
    }
    
    console.log('\n✅ Схема базы данных проверена и обновлена');
  } catch (error) {
    console.error('❌ Ошибка при обновлении схемы:', error);
    throw error;
  }
}

// Функция для создания клиента
async function createClient(clientData) {
  try {
    const [result] = await query(`
      INSERT INTO clients (
        office_id, full_name, phone, email, address, case_type, status,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `, [
      clientData.office_id,
      clientData.full_name,
      clientData.phone,
      clientData.email,
      clientData.address,
      clientData.case_type,
      clientData.status || 'active'
    ]);
    
    const clientId = result.insertId;
    console.log(`✅ Создан клиент с ID: ${clientId}`);
    return clientId;
  } catch (error) {
    console.error('❌ Ошибка при создании клиента:', error);
    throw error;
  }
}

// Функция для создания дела
async function createCase(caseData) {
  try {
    const [result] = await query(`
      INSERT INTO cases (
        office_id, client_id, employee_id, case_number, title, description,
        case_type, status, start_date, end_date, fee,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `, [
      caseData.office_id,
      caseData.client_id,
      caseData.employee_id,
      caseData.case_number,
      caseData.title,
      caseData.description,
      caseData.case_type,
      caseData.status || 'open',
      caseData.start_date,
      caseData.end_date,
      caseData.fee
    ]);
    
    const caseId = result.insertId;
    console.log(`✅ Создано дело с ID: ${caseId}`);
    return caseId;
  } catch (error) {
    console.error('❌ Ошибка при создании дела:', error);
    throw error;
  }
}

// Функция для создания тестовых клиентов
async function createTestClients(officeId, count = 3) {
  const clients = [];
  const clientTemplates = [
    {
      full_name: 'Иванов Иван Иванович',
      phone: '+7 (495) 123-45-67',
      email: 'ivanov@example.com',
      address: 'г. Москва, ул. Ленина, д. 10',
      case_type: 'civil'
    },
    {
      full_name: 'Петрова Мария Сергеевна',
      phone: '+7 (495) 234-56-78',
      email: 'petrova@example.com',
      address: 'г. Москва, ул. Пушкина, д. 20',
      case_type: 'family'
    },
    {
      full_name: 'Сидоров Петр Александрович',
      phone: '+7 (495) 345-67-89',
      email: 'sidorov@example.com',
      address: 'г. Москва, ул. Гагарина, д. 30',
      case_type: 'corporate'
    }
  ];
  
  for (let i = 0; i < Math.min(count, clientTemplates.length); i++) {
    const clientData = {
      office_id: officeId,
      ...clientTemplates[i],
      status: 'active'
    };
    
    const clientId = await createClient(clientData);
    clients.push({ id: clientId, ...clientData });
  }
  
  return clients;
}

// Функция для создания тестовых дел
async function createTestCases(officeId, employeeId, clients) {
  const cases = [];
  const timestamp = Date.now();
  const today = new Date().toISOString().split('T')[0];
  
  const caseTemplates = [
    {
      title: 'Взыскание долга',
      description: 'Взыскание задолженности по договору займа',
      case_type: 'civil',
      fee: 50000
    },
    {
      title: 'Развод и раздел имущества',
      description: 'Расторжение брака и раздел совместно нажитого имущества',
      case_type: 'family',
      fee: 75000
    },
    {
      title: 'Корпоративный спор',
      description: 'Спор между участниками ООО',
      case_type: 'corporate',
      fee: 100000
    }
  ];
  
  for (let i = 0; i < Math.min(clients.length, caseTemplates.length); i++) {
    const caseData = {
      office_id: officeId,
      client_id: clients[i].id,
      employee_id: employeeId,
      case_number: `CASE-${timestamp}-${String(i + 1).padStart(3, '0')}`,
      start_date: today,
      status: 'open',
      ...caseTemplates[i]
    };
    
    const caseId = await createCase(caseData);
    cases.push({ id: caseId, ...caseData });
  }
  
  return cases;
}

// Главная функция для создания полного набора данных
async function createCompleteDataSet(options = {}, extensionsSchema = {}) {
  try {
    console.log('🚀 Запуск универсального менеджера базы данных...');
    
    // 1. Обновляем схему базы данных
    await updateDatabaseSchema(extensionsSchema);
    
    // 2. Создаем базовый аккаунт юриста
    console.log('\n👤 Создание аккаунта юриста...');
    const lawyerAccount = await createLawyerAccount(options);
    
    // 3. Создаем дополнительные данные (если есть расширения)
    let clients = [];
    let cases = [];
    
    if (await tableExists('clients')) {
      console.log('\n👥 Создание тестовых клиентов...');
      clients = await createTestClients(lawyerAccount.officeId, options.clientsCount || 3);
      
      if (await tableExists('cases')) {
        console.log('\n📋 Создание тестовых дел...');
        cases = await createTestCases(lawyerAccount.officeId, lawyerAccount.employeeId, clients);
      }
    }
    
    // 4. Выводим результат
    console.log('\n🎉 === УНИВЕРСАЛЬНЫЙ МЕНЕДЖЕР БД - РЕЗУЛЬТАТ ===');
    console.log(`🏢 Офис создан (ID: ${lawyerAccount.officeId})`);
    console.log(`👤 Пользователь создан (ID: ${lawyerAccount.userId})`);
    console.log(`👨‍💼 Сотрудник создан (ID: ${lawyerAccount.employeeId})`);
    if (clients.length > 0) {
      console.log(`👥 Клиентов создано: ${clients.length}`);
    }
    if (cases.length > 0) {
      console.log(`📋 Дел создано: ${cases.length}`);
    }
    console.log(`📧 Email: ${lawyerAccount.credentials.email}`);
    console.log(`🔑 Пароль: ${lawyerAccount.credentials.password}`);
    console.log('===============================================');
    
    return {
      lawyerAccount,
      clients,
      cases,
      summary: {
        officeId: lawyerAccount.officeId,
        userId: lawyerAccount.userId,
        employeeId: lawyerAccount.employeeId,
        clientsCount: clients.length,
        casesCount: cases.length,
        credentials: lawyerAccount.credentials
      }
    };
    
  } catch (error) {
    console.error('❌ Ошибка выполнения универсального менеджера:', error);
    throw error;
  }
}

// Экспорт функций
module.exports = {
  updateDatabaseSchema,
  createCompleteDataSet,
  createClient,
  createCase,
  createTestClients,
  createTestCases,
  tableExists,
  createTable,
  EXTENSIONS_SCHEMA
};

// Если файл запускается напрямую
if (require.main === module) {
  createCompleteDataSet()
    .then(() => {
      console.log('\n✅ Универсальный менеджер базы данных выполнен успешно');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Ошибка выполнения:', error);
      process.exit(1);
    });
}