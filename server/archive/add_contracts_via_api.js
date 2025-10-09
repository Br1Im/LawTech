const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

// Тестовые договоры
const testContracts = [
  {
    title: 'Договор купли-продажи недвижимости',
    content: 'Договор купли-продажи квартиры по адресу г. Москва, ул. Тверская, д. 10, кв. 25. Продавец: Иванов И.И., покупатель: Петров П.П. Стоимость: 15 000 000 рублей.',
    category: 'Недвижимость'
  },
  {
    title: 'Трудовой договор с программистом',
    content: 'Трудовой договор между ООО "ТехКомпани" и Сидоровым С.С. на должность Senior Frontend Developer. Оклад: 200 000 рублей в месяц. Испытательный срок: 3 месяца.',
    category: 'Трудовое право'
  },
  {
    title: 'Договор аренды офисного помещения',
    content: 'Договор аренды офисного помещения площадью 150 кв.м. в БЦ "Москва-Сити". Арендодатель: ООО "Недвижимость Плюс", арендатор: ООО "Стартап Инновации". Арендная плата: 300 000 рублей в месяц.',
    category: 'Аренда'
  },
  {
    title: 'Договор поставки товаров',
    content: 'Договор поставки компьютерной техники между ООО "ТехПоставка" и ООО "Офис Решения". Общая стоимость поставки: 2 500 000 рублей. Срок поставки: 30 дней.',
    category: 'Поставка'
  },
  {
    title: 'Договор оказания юридических услуг',
    content: 'Договор на оказание юридических услуг по ведению арбитражного дела между Юридической фирмой "Правовед" и ООО "Клиент Сервис". Стоимость услуг: 500 000 рублей.',
    category: 'Юридические услуги'
  },
  {
    title: 'Договор банковского кредита',
    content: 'Кредитный договор между ПАО "Банк Развития" и Смирновым А.А. на сумму 3 000 000 рублей под 12% годовых. Срок кредита: 5 лет. Цель: покупка автомобиля.',
    category: 'Банковские услуги'
  },
  {
    title: 'Договор страхования автомобиля',
    content: 'Договор КАСКО на автомобиль BMW X5 2023 года выпуска. Страховая сумма: 4 500 000 рублей. Страховая премия: 180 000 рублей в год.',
    category: 'Страхование'
  },
  {
    title: 'Договор франшизы',
    content: 'Договор коммерческой концессии (франшизы) сети кофеен "Кофе Тайм". Паушальный взнос: 1 500 000 рублей. Роялти: 5% от оборота.',
    category: 'Франшиза'
  }
];

async function addContractsViaAPI() {
  console.log('🚀 Начинаем добавление договоров через API...');
  
  try {
    // Получаем токен авторизации (используем тестового пользователя)
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Получен токен авторизации');
    
    // Добавляем каждый договор
    for (let i = 0; i < testContracts.length; i++) {
      const contract = testContracts[i];
      
      try {
        const response = await axios.post(
          `${API_BASE}/legal-documents`,
          contract,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log(`✅ Добавлен договор ${i + 1}: ${contract.title}`);
      } catch (error) {
        console.error(`❌ Ошибка при добавлении договора "${contract.title}":`, error.response?.data || error.message);
      }
    }
    
    // Проверяем количество добавленных договоров
    const documentsResponse = await axios.get(`${API_BASE}/legal-documents`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log(`🎉 Всего договоров в системе: ${documentsResponse.data.length}`);
    
  } catch (error) {
    console.error('❌ Ошибка:', error.response?.data || error.message);
  }
}

// Запускаем скрипт
addContractsViaAPI();