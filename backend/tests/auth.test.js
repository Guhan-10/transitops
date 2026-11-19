const request = require('supertest');
const app     = require('../app');
const { pool, resetDb, createUser } = require('./helpers');

beforeEach(resetDb);
afterAll(() => pool.end());

describe('POST /api/auth/login', () => {
  test('returns a token and the user for valid credentials', async () => {
    const { user, password } = await createUser({ role: 'FleetManager' });
    const res = await request(app).post('/api/auth/login').send({ email: user.email, password });
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toEqual({ id: user.id, name: user.name, email: user.email, role: 'FleetManager' });
  });

  test('rejects a wrong password with 401', async () => {
    const { user } = await createUser();
    const res = await request(app).post('/api/auth/login').send({ email: user.email, password: 'nope' });
    expect(res.status).toBe(401);
  });

  test('rejects an unknown email with 401', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'ghost@test.local', password: 'x' });
    expect(res.status).toBe(401);
  });

  test('requires email and password', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
  });
});

describe('protected routes', () => {
  test('reject requests without a token', async () => {
    const res = await request(app).get('/api/vehicles');
    expect(res.status).toBe(401);
  });

  test('reject an invalid token', async () => {
    const res = await request(app).get('/api/vehicles').set('Authorization', 'Bearer not-a-jwt');
    expect(res.status).toBe(401);
  });

  test('accept a valid token', async () => {
    const { token } = await createUser();
    const res = await request(app).get('/api/vehicles').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
