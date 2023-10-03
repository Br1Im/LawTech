const mysql = require('mysql2');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '141427',
    database: 'lawtech'
})

module.exports = pool.promise();