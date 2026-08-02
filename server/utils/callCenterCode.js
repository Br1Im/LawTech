const crypto = require('crypto');

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomBlock(length = 4) {
  let value = '';
  for (let i = 0; i < length; i += 1) {
    value += ALPHABET[crypto.randomInt(0, ALPHABET.length)];
  }
  return value;
}

function generateConnectionCode() {
  return `LAWTECH-${randomBlock()}-${randomBlock()}`;
}

async function generateUniqueConnectionCode(connection) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = generateConnectionCode();
    const [rows] = await connection.query(
      'SELECT id FROM call_centers WHERE connection_code = ? LIMIT 1',
      [code]
    );
    if (!rows.length) return code;
  }
  throw new Error('Не удалось сгенерировать уникальный код подключения');
}

module.exports = { generateConnectionCode, generateUniqueConnectionCode };
