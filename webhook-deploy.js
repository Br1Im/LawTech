const express = require('express');
const { exec } = require('child_process');
const crypto = require('crypto');

const app = express();
const PORT = 9000;
const SECRET = 'your_webhook_secret_here'; // Измени на свой секрет

app.use(express.json());

app.post('/webhook', (req, res) => {
  // Проверка подписи GitHub (опционально)
  const signature = req.headers['x-hub-signature-256'];
  
  if (signature) {
    const hmac = crypto.createHmac('sha256', SECRET);
    const digest = 'sha256=' + hmac.update(JSON.stringify(req.body)).digest('hex');
    
    if (signature !== digest) {
      return res.status(401).send('Invalid signature');
    }
  }

  console.log('📦 Получен webhook от GitHub');
  
  // Выполняем деплой
  exec('cd ~/LawTech && git pull && docker-compose build --no-cache && docker-compose up -d', (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Ошибка деплоя:', error);
      return res.status(500).send('Deploy failed');
    }
    
    console.log('✅ Деплой успешен:', stdout);
    res.status(200).send('Deploy successful');
  });
});

app.listen(PORT, () => {
  console.log(`🎣 Webhook сервер запущен на порту ${PORT}`);
});
