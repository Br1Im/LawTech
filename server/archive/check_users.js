const db = require('./db');

db.query('SELECT id, username, email, role, office_id FROM users LIMIT 5', (err, rows) => {
    if (err) {
        console.error('Ошибка:', err);
    } else {
        console.log('Пользователи в системе:');
        rows.forEach(user => {
            console.log(`ID: ${user.id}, Username: ${user.username}, Email: ${user.email}, Role: ${user.role}, Office: ${user.office_id}`);
        });
    }
    process.exit();
});