const { Pool } = require('pg');

// Тестируем разные варианты подключения
const testConfigs = [
  {
    name: 'Без пароля',
    config: {
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: '',
      database: 'postgres',
      ssl: false
    }
  },
  {
    name: 'Пароль: postgres',
    config: {
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: 'postgres',
      database: 'postgres',
      ssl: false
    }
  },
  {
    name: 'Пароль: password',
    config: {
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: 'password',
      database: 'postgres',
      ssl: false
    }
  },
  {
    name: 'Пароль: admin',
    config: {
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: 'admin',
      database: 'postgres',
      ssl: false
    }
  },
  {
    name: 'Пароль: 123456',
    config: {
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: '123456',
      database: 'postgres',
      ssl: false
    }
  }
];

async function testConnection(name, config) {
  console.log(`\n🔍 Тестируем подключение: ${name}`);
  
  const pool = new Pool(config);
  
  try {
    const client = await pool.connect();
    console.log(`✅ Успешное подключение с конфигурацией: ${name}`);
    
    // Проверяем версию PostgreSQL
    const result = await client.query('SELECT version()');
    console.log(`📋 Версия PostgreSQL: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}`);
    
    client.release();
    await pool.end();
    
    return config;
  } catch (error) {
    console.log(`❌ Ошибка подключения: ${error.message}`);
    await pool.end();
    return null;
  }
}

async function main() {
  console.log('🚀 Начинаем тестирование подключений к PostgreSQL...\n');
  
  for (const testConfig of testConfigs) {
    const workingConfig = await testConnection(testConfig.name, testConfig.config);
    
    if (workingConfig) {
      console.log('\n🎉 Найдена рабочая конфигурация!');
      console.log('📝 Используйте следующие настройки в .env:');
      console.log(`DB_HOST=${workingConfig.host}`);
      console.log(`DB_PORT=${workingConfig.port}`);
      console.log(`DB_USER=${workingConfig.user}`);
      console.log(`DB_PASSWORD=${workingConfig.password}`);
      console.log(`DB_NAME=postgres`);
      break;
    }
  }
  
  console.log('\n✨ Тестирование завершено.');
}

main().catch(console.error);