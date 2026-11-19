const request = require('supertest');
const app     = require('../app');
const { pool } = require('./helpers');

afterAll(() => pool.end());

test('GET /api/health returns 200 when the database is reachable', async () => {
  const res = await request(app).get('/api/health');
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ status: 'ok', db: 'up' });
});
