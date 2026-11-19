const request = require('supertest');
const app     = require('../app');
const { pool, resetDb, createUser, insertVehicle, insertDriver, getRow } = require('./helpers');

let auth;
beforeEach(async () => {
  await resetDb();
  const { token } = await createUser();
  auth = { Authorization: `Bearer ${token}` };
});
afterAll(() => pool.end());

function tripBody(vehicle, driver, extra = {}) {
  return {
    source: 'Bengaluru', destination: 'Mysuru', vehicle_id: vehicle.id, driver_id: driver.id,
    cargo_weight: 500, planned_distance: 150, revenue: 12000, ...extra,
  };
}

async function draftTrip(vehicle, driver) {
  const res = await request(app).post('/api/trips').set(auth).send(tripBody(vehicle, driver));
  expect(res.status).toBe(201);
  return res.body;
}

describe('creating a trip', () => {
  test('creates a Draft trip for an available vehicle and driver', async () => {
    const trip = await draftTrip(await insertVehicle(), await insertDriver());
    expect(trip.status).toBe('Draft');
  });

  test('requires source, destination, vehicle and driver', async () => {
    const res = await request(app).post('/api/trips').set(auth).send({ source: 'A' });
    expect(res.status).toBe(400);
  });

  test.each(['In Shop', 'Retired', 'On Trip'])('rules 2 and 4: rejects a vehicle that is %s', async status => {
    const res = await request(app).post('/api/trips').set(auth)
      .send(tripBody(await insertVehicle({ status }), await insertDriver()));
    expect(res.status).toBe(409);
  });

  test('rule 3: rejects a Suspended driver', async () => {
    const res = await request(app).post('/api/trips').set(auth)
      .send(tripBody(await insertVehicle(), await insertDriver({ status: 'Suspended' })));
    expect(res.status).toBe(409);
  });

  test('rule 3: rejects a driver with an expired licence', async () => {
    const res = await request(app).post('/api/trips').set(auth)
      .send(tripBody(await insertVehicle(), await insertDriver({ license_expiry: '2020-01-01' })));
    expect(res.status).toBe(409);
  });

  test('rule 4: rejects a driver who is already On Trip', async () => {
    const res = await request(app).post('/api/trips').set(auth)
      .send(tripBody(await insertVehicle(), await insertDriver({ status: 'On Trip' })));
    expect(res.status).toBe(409);
  });

  test('rule 5: rejects cargo heavier than the vehicle capacity', async () => {
    const res = await request(app).post('/api/trips').set(auth)
      .send(tripBody(await insertVehicle({ max_load_capacity: 1000 }), await insertDriver(), { cargo_weight: 1001 }));
    expect(res.status).toBe(409);
  });
});

describe('trip lifecycle', () => {
  test('rule 6: dispatch sets the trip Dispatched and vehicle + driver On Trip', async () => {
    const v = await insertVehicle(); const d = await insertDriver();
    const trip = await draftTrip(v, d);

    const res = await request(app).post(`/api/trips/${trip.id}/dispatch`).set(auth);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Dispatched');
    expect((await getRow('vehicles', v.id)).status).toBe('On Trip');
    expect((await getRow('drivers', d.id)).status).toBe('On Trip');
  });

  test('only a Draft trip can be dispatched', async () => {
    const trip = await draftTrip(await insertVehicle(), await insertDriver());
    await request(app).post(`/api/trips/${trip.id}/dispatch`).set(auth);
    const res = await request(app).post(`/api/trips/${trip.id}/dispatch`).set(auth);
    expect(res.status).toBe(409);
  });

  test('rule 7: complete requires final_odometer and fuel_consumed', async () => {
    const trip = await draftTrip(await insertVehicle(), await insertDriver());
    await request(app).post(`/api/trips/${trip.id}/dispatch`).set(auth);
    const res = await request(app).post(`/api/trips/${trip.id}/complete`).set(auth).send({});
    expect(res.status).toBe(400);
  });

  test('rule 7: complete updates odometer, logs fuel and frees vehicle + driver', async () => {
    const v = await insertVehicle({ odometer: 5000 }); const d = await insertDriver();
    const trip = await draftTrip(v, d);
    await request(app).post(`/api/trips/${trip.id}/dispatch`).set(auth);

    const res = await request(app).post(`/api/trips/${trip.id}/complete`).set(auth)
      .send({ final_odometer: 5150, fuel_consumed: 20, fuel_cost: 2000 });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Completed');

    const vehicle = await getRow('vehicles', v.id);
    expect(vehicle.status).toBe('Available');
    expect(Number(vehicle.odometer)).toBe(5150);
    expect((await getRow('drivers', d.id)).status).toBe('Available');

    const [logs] = await pool.execute('SELECT * FROM fuel_logs WHERE trip_id = ?', [trip.id]);
    expect(logs).toHaveLength(1);
    expect(Number(logs[0].liters)).toBe(20);
    expect(Number(logs[0].cost)).toBe(2000);
  });

  test('rule 8: cancel reverts vehicle + driver to Available', async () => {
    const v = await insertVehicle(); const d = await insertDriver();
    const trip = await draftTrip(v, d);
    await request(app).post(`/api/trips/${trip.id}/dispatch`).set(auth);

    const res = await request(app).post(`/api/trips/${trip.id}/cancel`).set(auth);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Cancelled');
    expect((await getRow('vehicles', v.id)).status).toBe('Available');
    expect((await getRow('drivers', d.id)).status).toBe('Available');
  });

  test('returns 404 for a missing trip', async () => {
    const res = await request(app).post('/api/trips/9999/dispatch').set(auth);
    expect(res.status).toBe(404);
  });
});
