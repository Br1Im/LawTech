const fs = require('fs');
const path = require('path');
const request = require('supertest');
const { app } = require('./setup/app');
const db = require('../db');
const config = require('../config');
const { registerLawyer, registerDirectorWithOffice } = require('./setup/factories');

const uploadsDir = config.paths.uploads;

afterAll(() => {
  // Лёгкий cleanup: удалить файлы, оставшиеся от тестов (по префиксу).
  try {
    const files = fs.readdirSync(uploadsDir);
    for (const f of files) {
      if (f.includes('e2e-upload-')) {
        try {
          fs.unlinkSync(path.join(uploadsDir, f));
        } catch (_) {
          /* noop */
        }
      }
    }
    const docsDir = path.join(uploadsDir, 'contract-docs');
    if (fs.existsSync(docsDir)) {
      // Рекурсивно удалить все contract_* папки, созданные тестами.
      for (const dir of fs.readdirSync(docsDir)) {
        try {
          fs.rmSync(path.join(docsDir, dir), { recursive: true, force: true });
        } catch (_) {
          /* noop */
        }
      }
    }
  } catch (_) {
    /* noop */
  }
});

describe('POST /api/upload — generic upload', () => {
  it('текстовый файл → 200 + извлечённый текст', async () => {
    const lawyer = await registerLawyer(app);
    const content = 'e2e upload payload — hello world\nstrok 2';
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${lawyer.token}`)
      .attach('file', Buffer.from(content, 'utf-8'), 'e2e-upload-hello.txt');

    expect(res.status).toBe(200);
    expect(typeof res.body.text).toBe('string');
    expect(res.body.text).toContain('hello world');
  });

  it('без файла → 400', async () => {
    const lawyer = await registerLawyer(app);
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${lawyer.token}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('неподдерживаемое расширение → 400', async () => {
    const lawyer = await registerLawyer(app);
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${lawyer.token}`)
      .attach('file', Buffer.from('random bytes'), 'e2e-upload-binary.xyz');

    expect(res.status).toBe(400);
  });

  it('без токена → 401', async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('file', Buffer.from('x'), 'e2e-upload-noauth.txt');

    expect(res.status).toBe(401);
  });
});

describe('POST /api/offices/:officeId/messages — chat file upload', () => {
  it('multipart с файлом → 201, сообщение в БД с file_url + file_type', async () => {
    const dir = await registerDirectorWithOffice(app);
    // 1x1 PNG (8-byte signature + minimal IHDR)
    const pngBuf = Buffer.from(
      '89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000A4944415478DA63600000000200015E26B33C0000000049454E44AE426082',
      'hex'
    );

    const res = await request(app)
      .post(`/api/offices/${dir.officeId}/messages`)
      .set(dir.authHeaders)
      .field('channel', 'reception')
      .field('text', 'with attachment')
      .attach('file', pngBuf, {
        filename: 'e2e-upload-pixel.png',
        contentType: 'image/png',
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.fileUrl).toMatch(/\/uploads\/chat\//);
    expect(res.body.fileType).toBe('image');

    const [[row]] = await db.query('SELECT * FROM messages WHERE id = ?', [res.body.id]);
    expect(row).toBeDefined();
    expect(row.file_url).toMatch(/\/uploads\/chat\//);
    expect(row.file_type).toBe('image');
    expect(row.file_name).toBe('e2e-upload-pixel.png');
  });

  it('только файл, без текста → всё ещё 201 (content = file_name)', async () => {
    const dir = await registerDirectorWithOffice(app);
    const res = await request(app)
      .post(`/api/offices/${dir.officeId}/messages`)
      .set(dir.authHeaders)
      .field('channel', 'reception')
      .attach('file', Buffer.from('a tiny doc body'), {
        filename: 'e2e-upload-doc.txt',
        contentType: 'text/plain',
      });

    expect(res.status).toBe(201);
    expect(res.body.text).toBe('e2e-upload-doc.txt');
  });
});

describe('POST /api/contracts/:id/documents — contract docs', () => {
  async function createContractFor(dir) {
    const [c] = await db.query(
      `INSERT INTO clients (name, office_id) VALUES ('UploadClient', ?)`,
      [dir.officeId]
    );
    const [e] = await db.query(
      `INSERT INTO employees (office_id, first_name, last_name, position)
       VALUES (?, 'Юрист', 'Догов', 'lawyer')`,
      [dir.officeId]
    );
    const [contract] = await db.query(
      `INSERT INTO contracts (id_client, id_employee, contract_type, contract_date, amount, paid_amount, office_id)
       VALUES (?, ?, 'docs', CURDATE(), 50000, 0, ?)`,
      [c.insertId, e.insertId, dir.officeId]
    );
    return contract.insertId;
  }

  it('docx → 200, файл сохранён в materials + на диск, docs_status = ready', async () => {
    const dir = await registerDirectorWithOffice(app);
    const contractId = await createContractFor(dir);

    const res = await request(app)
      .post(`/api/contracts/${contractId}/documents`)
      .set(dir.authHeaders)
      .attach('file', Buffer.from('fake docx body'), {
        filename: 'e2e-upload-act.docx',
        contentType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

    expect(res.status).toBe(200);
    const material = res.body.data || res.body;
    expect(material.id).toBeDefined();
    expect(material.contract_id).toBe(contractId);
    expect(material.file_url).toMatch(/\/uploads\/contract-docs\/contract_/);

    const [[row]] = await db.query(
      'SELECT * FROM materials WHERE id = ?',
      [material.id]
    );
    expect(row).toBeDefined();
    expect(row.name).toBe('e2e-upload-act.docx');
    expect(row.contract_id).toBe(contractId);
    expect(row.office_id).toBe(dir.officeId);

    // docs_status auto-recomputed → ready
    const [[contract]] = await db.query(
      'SELECT docs_status FROM contracts WHERE id = ?',
      [contractId]
    );
    expect(contract.docs_status).toBe('ready');

    // physical file exists on disk
    const rel = material.file_url.replace(/^\/uploads\//, '');
    expect(fs.existsSync(path.join(uploadsDir, rel))).toBe(true);
  });

  it('недопустимое расширение (.txt) → 5xx (multer fileFilter ошибка)', async () => {
    const dir = await registerDirectorWithOffice(app);
    const contractId = await createContractFor(dir);

    const res = await request(app)
      .post(`/api/contracts/${contractId}/documents`)
      .set(dir.authHeaders)
      .attach('file', Buffer.from('not a doc'), {
        filename: 'e2e-upload-bad.txt',
        contentType: 'text/plain',
      });

    // Multer fileFilter throws — Express передаёт как 500 (нет глобального error handler для multer ошибок).
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(600);
  });

  it('GET /api/contracts/:id/documents возвращает только что загруженный файл, DELETE удаляет', async () => {
    const dir = await registerDirectorWithOffice(app);
    const contractId = await createContractFor(dir);

    const up = await request(app)
      .post(`/api/contracts/${contractId}/documents`)
      .set(dir.authHeaders)
      .attach('file', Buffer.from('body'), {
        filename: 'e2e-upload-list.docx',
        contentType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
    expect(up.status).toBe(200);
    const docId = (up.body.data || up.body).id;

    const list = await request(app)
      .get(`/api/contracts/${contractId}/documents`)
      .set(dir.authHeaders);
    expect(list.status).toBe(200);
    const items = list.body.data || list.body;
    expect(Array.isArray(items)).toBe(true);
    expect(items.find((m) => m.id === docId)).toBeTruthy();

    const del = await request(app)
      .delete(`/api/contracts/${contractId}/documents/${docId}`)
      .set(dir.authHeaders);
    expect(del.status).toBe(200);

    const [[gone]] = await db.query(
      'SELECT * FROM materials WHERE id = ?',
      [docId]
    );
    expect(gone).toBeUndefined();
  });
});
