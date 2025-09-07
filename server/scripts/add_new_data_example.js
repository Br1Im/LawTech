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

// Пример расширения схемы базы данных
const EXTENDED_SCHEMA = {
  ...DATABASE_SCHEMA,
  // Добавляем новую таблицу для клиентов
  clients: {
    columns: {
      id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
      office_id: 'INTEGER NOT NULL',
      full_name: 'TEXT NOT NULL',
      phone: 'TEXT',
      email: 'TEXT',
      address: 'TEXT',
      case_type: 'TEXT',
      status: 'TEXT DEFAULT "active"',
      created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
      updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP'
    },
    foreignKeys: [
      'FOREIGN KEY (office_id) REFERENCES offices(id)'
    ]
  },
  // Добавляем новую таблицу для дел
  cases: {
    columns: {
      id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
      office_id: 'INTEGER NOT NULL',
      client_id: 'INTEGER NOT NULL',
      employee_id: 'INTEGER',
      case_number: 'TEXT UNIQUE NOT NULL',
      title: 'TEXT NOT NULL',
      description: 'TEXT',
      case_type: 'TEXT NOT NULL',
      status: 'TEXT DEFAULT "open"',
      start_date: 'DATE',
      end_date: 'DATE',
      fee: 'INTEGER DEFAULT 0',
      created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
      updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP'
    },
    foreignKeys: [
      'FOREIGN KEY (office_id) REFERENCES offices(id)',
      'FOREIGN KEY (client_id) REFERENCES clients(id)',
      'FOREIGN KEY (employee_id) REFERENCES employees(id)'
    ]
  }
};

// Функция для проверки существования таблицы
async function tableExists(tableName) {
  try {
    const result = await db.query(
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
    const columns = Object.entries(schema.columns)
      .map(([name, definition]) => `${name} ${definition}`)
      .join(', ');
    
    const foreignKeys = schema.foreignKeys ? schema.foreignKeys.join(', ') : '';
    const tableDefinition = foreignKeys ? `${columns}, ${foreignKeys}` : columns;
    
    const createQuery = `CREATE TABLE ${tableName} (${tableDefinition})`;
    
    console.log(`Создание таблицы ${tableName}...`);
    await query(createQuery);
    console.log(`✅ Таблица ${tableName} создана успешно`);
  } catch (error) {
    console.error(`❌ Ошибка при создании таблицы ${tableName}:`, error);
    throw error;
  }
}

// Функция для обновления схемы базы данных с новыми таблицами
async function updateDatabaseSchema(newSchema) {
  console.log('🔄 Обновление схемы базы данных...');
  
  try {
    // Сначала обновляем базовую схему
    await ensureDatabaseStructure();
    
    // Затем создаем новые таблицы
    for (const [tableName, schema] of Object.entries(newSchema)) {
      if (!DATABASE_SCHEMA[tableName]) {
        console.log(`\n📋 Проверка новой таблицы: ${tableName}`);
        const exists = await tableExists(tableName);
        
        if (!exists) {
          console.log(`⚠️  Таблица ${tableName} не существует`);
          await createTable(tableName, schema);
        } else {
          console.log(`✅ Таблица ${tableName} уже существует`);
        }
      }
    }
    
    console.log('✅ Схема базы данных обновлена успешно');
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
    
    console.log(`✅ Создан клиент с ID: ${result.insertId}`);
    return result.insertId;
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
      caseData.fee || 0
    ]);
    
    console.log(`✅ Создано дело с ID: ${result.insertId}`);
    return result.insertId;
  } catch (error) {
    console.error('❌ Ошибка при создании дела:', error);
    throw error;
  }
}

// Функция для создания полного набора тестовых данных
async function createFullTestData(options = {}) {
  try {
    console.log('🚀 Создание полного набора тестовых данных...');
    
    // Сначала обновляем схему базы данных с новыми таблицами
    await updateDatabaseSchema(EXTENDED_SCHEMA);
    
    // Затем создаем аккаунт юриста (только базовые таблицы)
    console.log('\n🔄 Создание базового аккаунта юриста...');
    await ensureDatabaseStructure();
    
    // Генерируем уникальный timestamp для email
    const timestamp = Date.now();
    
    // Данные офиса (можно передать через options)
    const officeData = {
      name: options.officeName || 'Юридическая консультация "Правовед"',
      address: options.officeAddress || 'г. Москва, ул. Арбат, д. 25, оф. 12',
      contact_phone: options.officePhone || '+7 (495) 987-65-43',
      website: options.officeWebsite || 'https://pravoved-law.ru',
      revenue: options.officeRevenue || 0,
      orders: options.officeOrders || 0,
      employee_count: options.employeeCount || 1,
      work_phone: options.workPhone || '+7 (495) 987-65-43',
      work_phone2: options.workPhone2 || '+7 (495) 987-65-44',
      ip_surname: options.ipSurname || 'Петров',
      ip_name: options.ipName || 'Михаил',
      ip_middle_name: options.ipMiddleName || 'Александрович',
      inn: options.inn || '123456789012',
      ogrn: options.ogrn || '1234567890123'
    };
    
    // Создаем офис
    const officeId = await createOffice(officeData);
    
    // Данные пользователя
    const userData = {
      username: options.username || 'Михаил Петров',
      email: options.email || `lawyer${timestamp}@pravoved-law.ru`,
      password: options.password || 'lawyer123',
      office_id: officeId,
      role: options.role || 'admin'
    };
    
    // Создаем пользователя
    const userId = await createUser(userData);
    
    // Создаем сотрудника
    const employeeData = {
      office_id: officeId,
      surname: officeData.ip_surname,
      name: officeData.ip_name,
      middle_name: officeData.ip_middle_name,
      position: 'lawyer',
      phone: officeData.contact_phone,
      email: userData.email
    };
    
    const employeeId = await createEmployee(employeeData);
    
    // Создаем статистику офиса
    await createOfficeStats(officeId);
    
    // Создаем данные графиков
    await createChartData(officeId);
    
    const lawyerAccount = {
      officeId,
      userId,
      employeeId,
      credentials: {
        email: userData.email,
        password: userData.password,
        role: userData.role
      }
    };
    
    // Создаем тестовых клиентов
    const clients = [
      {
        office_id: lawyerAccount.officeId,
        full_name: 'Иванов Иван Иванович',
        phone: '+7 (495) 123-45-67',
        email: 'ivanov@example.com',
        address: 'г. Москва, ул. Ленина, д. 10',
        case_type: 'civil'
      },
      {
        office_id: lawyerAccount.officeId,
        full_name: 'Петрова Анна Сергеевна',
        phone: '+7 (495) 234-56-78',
        email: 'petrova@example.com',
        address: 'г. Москва, ул. Пушкина, д. 20',
        case_type: 'family'
      },
      {
        office_id: lawyerAccount.officeId,
        full_name: 'Сидоров Петр Александрович',
        phone: '+7 (495) 345-67-89',
        email: 'sidorov@example.com',
        address: 'г. Москва, ул. Гагарина, д. 30',
        case_type: 'corporate'
      }
    ];
    
    const clientIds = [];
    for (const clientData of clients) {
      const clientId = await createClient(clientData);
      clientIds.push(clientId);
    }
    
    // Создаем тестовые дела
    const cases = [
      {
        office_id: lawyerAccount.officeId,
        client_id: clientIds[0],
        employee_id: lawyerAccount.employeeId,
        case_number: `CASE-${Date.now()}-001`,
        title: 'Взыскание долга',
        description: 'Взыскание задолженности по договору займа',
        case_type: 'civil',
        start_date: new Date().toISOString().split('T')[0],
        fee: 50000
      },
      {
        office_id: lawyerAccount.officeId,
        client_id: clientIds[1],
        employee_id: lawyerAccount.employeeId,
        case_number: `CASE-${Date.now()}-002`,
        title: 'Развод и раздел имущества',
        description: 'Расторжение брака и раздел совместно нажитого имущества',
        case_type: 'family',
        start_date: new Date().toISOString().split('T')[0],
        fee: 75000
      },
      {
        office_id: lawyerAccount.officeId,
        client_id: clientIds[2],
        employee_id: lawyerAccount.employeeId,
        case_number: `CASE-${Date.now()}-003`,
        title: 'Корпоративный спор',
        description: 'Спор между участниками ООО',
        case_type: 'corporate',
        start_date: new Date().toISOString().split('T')[0],
        fee: 100000
      }
    ];
    
    const caseIds = [];
    for (const caseData of cases) {
      const caseId = await createCase(caseData);
      caseIds.push(caseId);
    }
    
    console.log('\n🎉 === ПОЛНЫЙ НАБОР ТЕСТОВЫХ ДАННЫХ СОЗДАН ===');
    console.log(`👤 Создан аккаунт юриста (ID: ${lawyerAccount.userId})`);
    console.log(`🏢 Создан офис (ID: ${lawyerAccount.officeId})`);
    console.log(`👥 Создано клиентов: ${clientIds.length}`);
    console.log(`📋 Создано дел: ${caseIds.length}`);
    console.log(`📧 Email для входа: ${lawyerAccount.credentials.email}`);
    console.log(`🔑 Пароль: ${lawyerAccount.credentials.password}`);
    console.log('============================================\n');
    
    return {
      lawyerAccount,
      clientIds,
      caseIds
    };
    
  } catch (error) {
    console.error('❌ Ошибка при создании тестовых данных:', error);
    throw error;
  }
}

// Экспорт функций
module.exports = {
  updateDatabaseSchema,
  createClient,
  createCase,
  createFullTestData,
  EXTENDED_SCHEMA
};

// Если скрипт запускается напрямую
if (require.main === module) {
  createFullTestData()
    .then(() => {
      console.log('✅ Скрипт создания тестовых данных выполнен успешно');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Ошибка выполнения скрипта:', error);
      process.exit(1);
    });
}