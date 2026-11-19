const request = require('supertest');
const app     = require('../app');
const { pool, resetDb, createUser, insertVehicle } = require('./helpers');

let auth;
beforeEach(async () => {
  await resetDb();
  const { token } = await createUser();
  auth = { Authorization: `Bearer ${token}` };
});
afterAll(() => pool.end());

test('creates a vehicle with default status Available', async () => {
  const res = await request(app).post('/api/vehicles').set(auth)
    .send({ registration_number: 'MH12XY0001', name: 'Eicher Pro', type: 'Truck', max_load_capacity: 5000 });
  expect(res.status).toBe(201);
  expect(res.body).toMatchObject({ registration_number: 'MH12XY0001', status: 'Available' });
});

test('requires registration_number, name and type', async () => {
  const res = await request(app).post('/api/vehicles').set(auth).send({ name: 'No reg' });
  expect(res.status).toBe(400);
});

test('rule 1: registration_number must be unique', async () => {
  await insertVehicle({ registration_number: 'MH12XY0002' });
  const res = await request(app).post('/api/vehicles').set(auth)
    .send({ registration_number: 'MH12XY0002', name: 'Dup', type: 'Van' });
  expect(res.status).toBe(409);
});

test('filters the list by status', async () => {
  await insertVehicle({ status: 'Available' });
  await insertVehicle({ status: 'Retired' });
  const res = await request(app).get('/api/vehicles?status=Retired').set(auth);
  expect(res.status).toBe(200);
  expect(res.body).toHaveLength(1);
  expect(res.body[0].status).toBe('Retired');
});

test('updates only the fields sent', async () => {
  const v = await insertVehicle({ name: 'Old name' });
  const res = await request(app).put(`/api/vehicles/${v.id}`).set(auth).send({ name: 'New name' });
  expect(res.status).toBe(200);
  expect(res.body).toMatchObject({ name: 'New name', registration_number: v.registration_number });
});

test('returns 404 for a missing vehicle', async () => {
  const res = await request(app).get('/api/vehicles/9999').set(auth);
  expect(res.status).toBe(404);
});

test('cannot delete a vehicle that is On Trip', async () => {
  const v = await insertVehicle({ status: 'On Trip' });
  const res = await request(app).delete(`/api/vehicles/${v.id}`).set(auth);
  expect(res.status).toBe(409);
});

test('deletes an idle vehicle with no history', async () => {
  const v = await insertVehicle();
  const res = await request(app).delete(`/api/vehicles/${v.id}`).set(auth);
  expect(res.status).toBe(200);
});
