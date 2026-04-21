const fetch = require('node-fetch');
require('dotenv').config();

const REQUIRED_BUTTONS = [
  'Курс',
  'Магазин',
  'Связь',
  'Активы',
  'Политика конфиденциальности',
  'Пользовательское соглашение'
];

const createReplyKeyboard = (rows) => ({
  keyboard: rows,
  resize_keyboard: true,
  is_persistent: true
});

const BOT_PRESETS = [
  {
    key: 'millioninsta',
    token: process.env.TELEGRAM_BOT_MILLIONINSTA_TOKEN,
    label: 'MillionInsta',
    greeting:
      'Добро пожаловать в MillionInsta.\n\nЗдесь собраны курс, активы, магазин и основные документы. Выберите нужный раздел ниже.',
    keyboard: createReplyKeyboard([
      ['Курс', 'Активы'],
      ['Магазин'],
      ['Связь', 'Политика конфиденциальности'],
      ['Пользовательское соглашение']
    ]),
    responses: {
      'Курс':
        'Раздел "Курс" готов как заглушка. Сюда можно вставить программу, тарифы, даты старта и CTA на покупку.',
      'Магазин':
        'Раздел "Магазин" готов. Здесь можно показать товары, цифровые продукты, тарифы или ссылку на витрину.',
      'Связь':
        'Связь с поддержкой.\n\nУкажите менеджера, канал или форму обратной связи в ENV-переменных.',
      'Активы':
        'Раздел "Активы" подключен. Здесь можно вывести портфель, доступы, бонусы, материалы или закрытые ссылки.',
      'Политика конфиденциальности':
        'Политика конфиденциальности пока в черновике. Подставьте текст или публичную ссылку.',
      'Пользовательское соглашение':
        'Пользовательское соглашение пока в черновике. Подставьте текст или публичную ссылку.'
    },
    decorativeLead:
      'Ваш навигатор по продуктам MillionInsta:'
  },
  {
    key: 'firstbtcs',
    token: process.env.TELEGRAM_BOT_FIRSTBTCS_TOKEN,
    label: 'FirstBTCS',
    greeting:
      'FirstBTCS на связи.\n\nЭто стартовое меню для быстрой навигации: материалы, активы, документы и контакт с командой.',
    keyboard: createReplyKeyboard([
      ['Магазин', 'Курс', 'Связь'],
      ['Активы'],
      ['Пользовательское соглашение', 'Политика конфиденциальности']
    ]),
    responses: {
      'Курс':
        'Здесь будет курс FirstBTCS: структура, доступ, блоки обучения и быстрый переход к оплате.',
      'Магазин':
        'Это витрина FirstBTCS. Сюда можно поставить подборку продуктов, пакетов и спецпредложений.',
      'Связь':
        'Раздел связи готов. Можно добавить username менеджера, ссылку на чат или кнопку перехода.',
      'Активы':
        'Здесь будет блок активов: выданные материалы, бонусы, закрытые каналы и персональные ссылки.',
      'Политика конфиденциальности':
        'Политика конфиденциальности FirstBTCS пока не заполнена. Подставьте текст или URL.',
      'Пользовательское соглашение':
        'Пользовательское соглашение FirstBTCS пока не заполнено. Подставьте текст или URL.'
    },
    decorativeLead:
      'Быстрый старт по экосистеме FirstBTCS:'
  }
];

const SHARED_LINKS = {
  courseUrl: process.env.TELEGRAM_BOT_COURSE_URL || '',
  shopUrl: process.env.TELEGRAM_BOT_SHOP_URL || '',
  supportUrl: process.env.TELEGRAM_BOT_SUPPORT_URL || '',
  assetsUrl: process.env.TELEGRAM_BOT_ASSETS_URL || '',
  privacyUrl: process.env.TELEGRAM_BOT_PRIVACY_URL || '',
  termsUrl: process.env.TELEGRAM_BOT_TERMS_URL || ''
};

const LINK_BY_BUTTON = {
  'Курс': 'courseUrl',
  'Магазин': 'shopUrl',
  'Связь': 'supportUrl',
  'Активы': 'assetsUrl',
  'Политика конфиденциальности': 'privacyUrl',
  'Пользовательское соглашение': 'termsUrl'
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function telegramApi(token, method, body = {}) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const payload = await response.json();

  if (!payload.ok) {
    throw new Error(`${method} failed: ${payload.description || 'Unknown Telegram error'}`);
  }

  return payload.result;
}

async function sendMessage(bot, chatId, text, extra = {}) {
  return telegramApi(bot.token, 'sendMessage', {
    chat_id: chatId,
    text,
    reply_markup: bot.keyboard,
    ...extra
  });
}

function getInlineLink(buttonText) {
  const linkKey = LINK_BY_BUTTON[buttonText];
  const url = linkKey ? SHARED_LINKS[linkKey] : '';

  if (!url) {
    return null;
  }

  return {
    inline_keyboard: [[{ text: 'Открыть', url }]]
  };
}

function buildAnswer(bot, buttonText) {
  const intro = bot.decorativeLead;
  const answer = bot.responses[buttonText] || 'Команда принята. Этот раздел можно наполнить позже.';
  const inlineKeyboard = getInlineLink(buttonText);

  return {
    text: `${intro}\n\n${answer}`,
    extra: inlineKeyboard ? { reply_markup: inlineKeyboard } : {}
  };
}

async function handleTextMessage(bot, message) {
  const chatId = message.chat.id;
  const text = String(message.text || '').trim();

  if (text === '/start' || text === '/menu') {
    await sendMessage(bot, chatId, bot.greeting);
    return;
  }

  if (REQUIRED_BUTTONS.includes(text)) {
    const { text: answerText, extra } = buildAnswer(bot, text);
    await sendMessage(bot, chatId, answerText, extra);
    return;
  }

  await sendMessage(
    bot,
    chatId,
    'Пока понимаю только кнопки меню. Нажмите нужный раздел ниже, и я открою заготовленный блок.'
  );
}

async function processUpdate(bot, update) {
  if (!update.message || typeof update.message.text !== 'string') {
    return;
  }

  await handleTextMessage(bot, update.message);
}

async function pollBot(bot) {
  let offset = 0;

  console.log(`[${bot.label}] polling started`);

  while (true) {
    try {
      const updates = await telegramApi(bot.token, 'getUpdates', {
        offset,
        timeout: 25,
        allowed_updates: ['message']
      });

      for (const update of updates) {
        offset = update.update_id + 1;
        await processUpdate(bot, update);
      }
    } catch (error) {
      console.error(`[${bot.label}] polling error:`, error.message);
      await sleep(3000);
    }
  }
}

async function validateBot(bot) {
  const me = await telegramApi(bot.token, 'getMe');
  console.log(`[${bot.label}] connected as @${me.username}`);
}

async function main() {
  const enabledBots = BOT_PRESETS.filter((bot) => bot.token);

  if (enabledBots.length === 0) {
    console.error(
      'No Telegram bot tokens found. Set TELEGRAM_BOT_MILLIONINSTA_TOKEN and/or TELEGRAM_BOT_FIRSTBTCS_TOKEN in server/.env'
    );
    process.exit(1);
  }

  for (const bot of enabledBots) {
    await validateBot(bot);
  }

  await Promise.all(enabledBots.map((bot) => pollBot(bot)));
}

main().catch((error) => {
  console.error('Telegram bots bootstrap failed:', error);
  process.exit(1);
});
