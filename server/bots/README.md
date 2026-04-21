# Telegram Bots

This folder contains a starter implementation for two Telegram bots:

- `MillionInsta`
- `FirstBTCS`

Both bots already include the required buttons:

- `Курс`
- `Магазин`
- `Связь`
- `Активы`
- `Политика конфиденциальности`
- `Пользовательское соглашение`

They intentionally differ in:

- greeting text
- keyboard layout
- section descriptions

## Run

1. Add bot tokens to `server/.env`
2. Start the bots:

```bash
cd server
node bots/telegramBots.js
```

Or use the npm script:

```bash
cd server
npm run bot:telegram
```

## Environment Variables

Required:

- `TELEGRAM_BOT_MILLIONINSTA_TOKEN`
- `TELEGRAM_BOT_FIRSTBTCS_TOKEN`

Optional shared links:

- `TELEGRAM_BOT_COURSE_URL`
- `TELEGRAM_BOT_SHOP_URL`
- `TELEGRAM_BOT_SUPPORT_URL`
- `TELEGRAM_BOT_ASSETS_URL`
- `TELEGRAM_BOT_PRIVACY_URL`
- `TELEGRAM_BOT_TERMS_URL`

## Notes

- Tokens must not be committed to Git.
- Current version uses long polling.
- This is a starter shell: payment logic, stores, product cards, CRM sync and custom flows can be added next.
