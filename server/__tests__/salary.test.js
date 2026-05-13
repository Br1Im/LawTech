const request = require('supertest');
const { app } = require('./setup/app');
const db = require('../db');
const { registerDirectorWithOffice } = require('./setup/factories');

describe('salary settings + shifts', () => {
  describe('GET /api/offices/:id/salary-settings', () => {
    it('директор получает дефолтные настройки (auto-create)', async () => {
      const dir = await registerDirectorWithOffice(app);

      const res = await request(app)
        .get(`/api/offices/${dir.officeId}/salary-settings`)
        .set(dir.authHeaders);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(Number(data.lawyer_percent)).toBe(10);
      expect(Number(data.lawyer_bonus_threshold)).toBe(500000);
      expect(Number(data.admin_shift_rate)).toBe(2000);

      const [[row]] = await db.query(
        'SELECT * FROM office_salary_settings WHERE office_id = ?',
        [dir.officeId]
      );
      expect(row).toBeDefined();
      expect(row.office_id).toBe(dir.officeId);
    });

    it('директор чужого офиса получает 403', async () => {
      const dir1 = await registerDirectorWithOffice(app);
      const dir2 = await registerDirectorWithOffice(app);

      const res = await request(app)
        .get(`/api/offices/${dir2.officeId}/salary-settings`)
        .set(dir1.authHeaders);

      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/offices/:id/salary-settings', () => {
    it('директор обновляет lawyer_percent — изменения сохраняются в БД', async () => {
      const dir = await registerDirectorWithOffice(app);

      const res = await request(app)
        .put(`/api/offices/${dir.officeId}/salary-settings`)
        .set(dir.authHeaders)
        .send({ lawyer_percent: 18.5, admin_shift_rate: 2500 });

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(Number(data.lawyer_percent)).toBe(18.5);
      expect(Number(data.admin_shift_rate)).toBe(2500);

      const [[row]] = await db.query(
        'SELECT lawyer_percent, admin_shift_rate FROM office_salary_settings WHERE office_id = ?',
        [dir.officeId]
      );
      expect(Number(row.lawyer_percent)).toBe(18.5);
      expect(Number(row.admin_shift_rate)).toBe(2500);
    });
  });

  describe('shifts CRUD', () => {
    it('директор создаёт смену сотруднику → GET возвращает её → DELETE удаляет', async () => {
      const dir = await registerDirectorWithOffice(app);

      const [emp] = await db.query(
        `INSERT INTO employees (office_id, first_name, last_name, position)
         VALUES (?, 'Иван', 'Иванов', 'lawyer')`,
        [dir.officeId]
      );
      const employeeId = emp.insertId;

      const created = await request(app)
        .post('/api/shifts')
        .set(dir.authHeaders)
        .send({ employee_id: employeeId, shift_date: '2026-05-13', note: 'test shift' });
      expect(created.status).toBe(200);

      const [[dbShift]] = await db.query(
        `SELECT * FROM shifts WHERE employee_id = ? AND shift_date = ?`,
        [employeeId, '2026-05-13']
      );
      expect(dbShift).toBeDefined();
      expect(dbShift.note).toBe('test shift');
      expect(dbShift.office_id).toBe(dir.officeId);

      const list = await request(app)
        .get(`/api/shifts?office_id=${dir.officeId}`)
        .set(dir.authHeaders);
      expect(list.status).toBe(200);
      const listData = list.body.data || list.body;
      expect(Array.isArray(listData)).toBe(true);
      expect(listData.find((s) => s.id === dbShift.id)).toBeTruthy();

      const del = await request(app)
        .delete(`/api/shifts/${dbShift.id}`)
        .set(dir.authHeaders);
      expect(del.status).toBe(200);

      const [[gone]] = await db.query('SELECT * FROM shifts WHERE id = ?', [dbShift.id]);
      expect(gone).toBeUndefined();
    });

    it('дубль смены на ту же дату того же сотрудника → 409', async () => {
      const dir = await registerDirectorWithOffice(app);

      const [emp] = await db.query(
        `INSERT INTO employees (office_id, first_name, last_name, position)
         VALUES (?, 'Пётр', 'Петров', 'lawyer')`,
        [dir.officeId]
      );

      const a = await request(app)
        .post('/api/shifts')
        .set(dir.authHeaders)
        .send({ employee_id: emp.insertId, shift_date: '2026-05-14' });
      expect(a.status).toBe(200);

      const b = await request(app)
        .post('/api/shifts')
        .set(dir.authHeaders)
        .send({ employee_id: emp.insertId, shift_date: '2026-05-14' });
      expect(b.status).toBe(409);
    });
  });
});
