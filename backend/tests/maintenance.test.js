const request = require('supertest');
const app     = require('../app');
const { pool, resetDb, createUser, insertVehicle, getRow } = require('./helpers');

let auth;
beforeEach(async () => {
  await resetDb();
  const { token } = await createUser();
  auth = { Authorization: `Bearer ${token}` };
});
afterAll(() => pool.end());

async function openRecord(vehicle) {
  const res = await request(app).post('/api/maintenance').set(auth)
    .send({ vehicle_id: vehicle.id, description: 'Brake pads', cost: 3500 });
  expect(res.status).toBe(201);
  return res.body;
}

test('rule 9: opening a record sets the vehicle In Shop', async () => {
  const v = await insertVehicle();
  const record = await openRecord(v);
  expect(record.status).toBe('Open');
  expect((await getRow('vehicles', v.id)).status).toBe('In Shop');
});

test('rule 10: closing a record sets the vehicle Available', async () => {
  const v = await insertVehicle();
  const record = await openRecord(v);
  const res = await request(app).post(`/api/maintenance/${record.id}/close`).set(auth);
  expect(res.status).toBe(200);
  expect(res.body.status).toBe('Closed');
  expect((await getRow('vehicles', v.id)).status).toBe('Available');
});

test('rule 10: closing a record leaves a Retired vehicle Retired', async () => {
  const v = await insertVehicle();
  const record = await openRecord(v);
  await pool.execute("UPDATE vehicles SET status = 'Retired' WHERE id = ?", [v.id]);
  await request(app).post(`/api/maintenance/${record.id}/close`).set(auth);
  expect((await getRow('vehicles', v.id)).status).toBe('Retired');
});

test('a closed record cannot be closed again', async () => {
  const record = await openRecord(await insertVehicle());
  await request(app).post(`/api/maintenance/${record.id}/close`).set(auth);
  const res = await request(app).post(`/api/maintenance/${record.id}/close`).set(auth);
  expect(res.status).toBe(409);
});

test('a Retired vehicle cannot get a new maintenance record', async () => {
  const v = await insertVehicle({ status: 'Retired' });
  const res = await request(app).post('/api/maintenance').set(auth)
    .send({ vehicle_id: v.id, description: 'Service' });
  expect(res.status).toBe(409);
});

test('requires vehicle_id and description', async () => {
  const res = await request(app).post('/api/maintenance').set(auth).send({});
  expect(res.status).toBe(400);
});
