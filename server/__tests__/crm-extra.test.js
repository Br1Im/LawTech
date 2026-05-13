/**
 * Integration tests for appointments, applications, cash-register, and
 * calendar-events. Each verifies the POST writes to the correct table.
 */
const request = require('supertest');
const { app } = require('./setup/app');
const { registerDirectorWithOffice } = require('./setup/factories');
const db = require('../db');

async function fetchOne(table, id) {
  const [rows] = await db.query(`SELECT * FROM \`${table}\` WHERE id = ?`, [id]);
  return rows[0];
}

describe('POST /api/appointments (direct visit)', () => {
  it('creates an appointment with waiting status', async () => {
    const { authHeaders, officeId, user } = await registerDirectorWithOffice(app);

    const res = await request(app)
      .post('/api/appointments')
      .set(authHeaders)
      .send({
        client_name: 'Сидоров Пётр',
        client_phone: '+7-900-123-45-67',
        appointment_date: '2026-02-01',
        appointment_time: '14:30',
        comment: 'Первичная консультация',
      });

    expect([200, 201]).toContain(res.status);
    const id = res.body.data?.id || res.body.id;
    expect(id).toBeDefined();

    const row = await fetchOne('appointments', id);
    expect(row).toBeTruthy();
    expect(row.office_id).toBe(officeId);
    expect(row.client_name).toBe('Сидоров Пётр');
    expect(row.client_phone).toBe('+7-900-123-45-67');
    expect(row.status).toBe('waiting');
    expect(row.operator_id).toBe(user.id);
  });

  it('rejects with 400 when client_name is missing', async () => {
    const { authHeaders } = await registerDirectorWithOffice(app);
    const res = await request(app)
      .post('/api/appointments')
      .set(authHeaders)
      .send({ appointment_date: '2026-02-01', appointment_time: '10:00' });
    expect(res.status).toBe(400);
  });

  it('rejects with 400 when appointment_time is missing', async () => {
    const { authHeaders } = await registerDirectorWithOffice(app);
    const res = await request(app)
      .post('/api/appointments')
      .set(authHeaders)
      .send({ client_name: 'X', appointment_date: '2026-02-01' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/applications', () => {
  it('creates an application with status="new" tied to the office', async () => {
    const { authHeaders, officeId, user } = await registerDirectorWithOffice(app);

    const res = await request(app)
      .post('/api/applications')
      .set(authHeaders)
      .send({
        client_name: 'Иванов И.И.',
        topic: 'Жалоба на ЖКХ',
        lawyer_name: 'Петрова А.С.',
        comment: 'Срочно',
      });

    expect(res.status).toBe(200);
    const id = res.body.data.id;
    const row = await fetchOne('applications', id);
    expect(row.office_id).toBe(officeId);
    expect(row.client_name).toBe('Иванов И.И.');
    expect(row.topic).toBe('Жалоба на ЖКХ');
    expect(row.status).toBe('new');
    expect(row.created_by).toBe(user.id);
  });
});

describe('POST /api/cash-register', () => {
  it('creates a cash-register entry with split amounts', async () => {
    const { authHeaders, officeId, user } = await registerDirectorWithOffice(app);

    const res = await request(app)
      .post('/api/cash-register')
      .set(authHeaders)
      .send({
        entry_date: '2026-02-05',
        client_name: 'ООО Альфа',
        contract_number: 'A-0205-26',
        action: 'income',
        cash_amount: 30000,
        noncash_amount: 50000,
        bank_amount: 0,
        expense_amount: 0,
        comment: 'Оплата по договору',
      });

    expect(res.status).toBe(200);
    const id = res.body.data.id;
    const row = await fetchOne('cash_register', id);
    expect(row.office_id).toBe(officeId);
    expect(row.client_name).toBe('ООО Альфа');
    expect(Number(row.cash_amount)).toBe(30000);
    expect(Number(row.noncash_amount)).toBe(50000);
    expect(row.created_by).toBe(user.id);
  });
});

describe('POST /api/calendar-events', () => {
  it('creates a calendar event tied to the office', async () => {
    const { authHeaders, officeId } = await registerDirectorWithOffice(app);

    const res = await request(app)
      .post('/api/calendar-events')
      .set(authHeaders)
      .send({
        title: 'Суд по делу А-1',
        description: 'Арбитражный суд Москвы',
        start_date: '2026-03-01',
        event_type: 'court',
        officeId,
      });

    expect(res.status).toBe(201);
    expect(res.body.event).toBeTruthy();
    const id = res.body.event.id;
    const row = await fetchOne('calendar_events', id);
    expect(row.title).toBe('Суд по делу А-1');
    expect(row.office_id).toBe(officeId);
    expect(row.type).toBe('court');
  });

  it('rejects with 403 when officeId does not match the user office', async () => {
    const { authHeaders } = await registerDirectorWithOffice(app);
    const other = await registerDirectorWithOffice(app);
    const res = await request(app)
      .post('/api/calendar-events')
      .set(authHeaders)
      .send({
        title: 'Foreign event',
        start_date: '2026-03-01',
        event_type: 'meeting',
        officeId: other.officeId,
      });
    expect(res.status).toBe(403);
  });

  it('rejects with 400 when required fields are missing', async () => {
    const { authHeaders, officeId } = await registerDirectorWithOffice(app);
    const res = await request(app)
      .post('/api/calendar-events')
      .set(authHeaders)
      .send({ officeId });
    expect(res.status).toBe(400);
  });
});
