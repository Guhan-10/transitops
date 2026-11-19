const request = require('supertest');
const app     = require('../app');
const { pool, resetDb, createUser, insertDriver } = require('./helpers');

let auth;
beforeEach(async () => {
  await resetDb();
  const { token } = await createUser();
  auth = { Authorization: `Bearer ${token}` };
});
afterAll(() => pool.end());

test('creates a driver with default status Available', async () => {
  const res = await request(app).post('/api/drivers').set(auth).send({
    name: 'Suresh', license_number: 'TN0120190001234', license_category: 'LMV', license_expiry: '2030-01-01',
  });
  expect(res.status).toBe(201);
  expect(res.body).toMatchObject({ name: 'Suresh', status: 'Available' });
});

test('requires name and licence details', async () => {
  const res = await request(app).post('/api/drivers').set(auth).send({ name: 'Incomplete' });
  expect(res.status).toBe(400);
});

test('rule 1: license_number must be unique', async () => {
  await insertDriver({ license_number: 'KA0520200005678' });
  const res = await request(app).post('/api/drivers').set(auth).send({
    name: 'Dup', license_number: 'KA0520200005678', license_category: 'HMV', license_expiry: '2030-01-01',
  });
  expect(res.status).toBe(409);
});

test('cannot delete a driver who is On Trip', async () => {
  const d = await insertDriver({ status: 'On Trip' });
  const res = await request(app).delete(`/api/drivers/${d.id}`).set(auth);
  expect(res.status).toBe(409);
});
