#!/bin/bash
cd /var/www/lawtech
DB_PASS=$(grep DB_PASSWORD .env.production | cut -d= -f2-)
echo "Checking users..."
docker exec lawtech-db mysql -u lawtech_user -p"$DB_PASS" lawtech_crm -e "SELECT id, first_name, email, role FROM users;"
echo ""
echo "Creating test director..."
docker exec lawtech-backend node -e "
const bcrypt = require('bcryptjs');
const db = require('./db');
async function create() {
  const hash = await bcrypt.hash('Director123!', 10);
  try {
    await db.query('INSERT INTO users (first_name, last_name, email, password, role) VALUES (?, ?, ?, ?, ?)', ['Директор', 'Тест', 'director@lawtech.ru', hash, 'director']);
    console.log('Director created');
    await db.query('INSERT INTO users (first_name, last_name, email, password, role) VALUES (?, ?, ?, ?, ?)', ['Юрист', 'Тест', 'lawyer@lawtech.ru', hash, 'lawyer']);
    console.log('Lawyer created');
    process.exit(0);
  } catch(e) { console.error(e.message); process.exit(1); }
}
create();
"
