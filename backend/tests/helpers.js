/**
 * Shared test helpers: wipe tables, create users with tokens, insert fixtures.
 */
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const pool   = require('../db');

let seq = 0; // unique registration/licence numbers per test run

const TABLES = ['fuel_logs', 'expenses', 'maintenance_logs', 'trips', 'drivers', 'vehicles', 'users'];

async function resetDb() {
  const conn = await pool.getConnection();
  try {
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const t of TABLES) await conn.query(`TRUNCATE TABLE ${t}`);
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
  } finally {
    conn.release();
  }
}

// Inserts the user directly (not via /signup, which Stage 1 locks down) and returns a valid token.
async function createUser({ role = 'FleetManager', email, password = 'password123' } = {}) {
  const name  = `${role} User`;
  email       = email || `${role.toLowerCase()}@test.local`;
  const hash  = await bcrypt.hash(password, 4);
  const [res] = await pool.execute(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    [name, email, hash, role]
  );
  const user  = { id: res.insertId, name, email, role };
  const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1h' });
  return { user, token, password };
}

async function insertVehicle(overrides = {}) {
  const v = {
    registration_number: `KA01AB${String(++seq).padStart(4, '0')}`,
    name: 'Tata Ace', type: 'Truck', region: 'South',
    max_load_capacity: 1000, odometer: 5000, acquisition_cost: 500000, status: 'Available',
    ...overrides,
  };
  const [res] = await pool.execute(
    `INSERT INTO vehicles (registration_number, name, type, region, max_load_capacity, odometer, acquisition_cost, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [v.registration_number, v.name, v.type, v.region, v.max_load_capacity, v.odometer, v.acquisition_cost, v.status]
  );
  return { id: res.insertId, ...v };
}

async function insertDriver(overrides = {}) {
  const d = {
    name: 'Ravi Kumar', license_number: `DL${String(++seq).padStart(6, '0')}`,
    license_category: 'HMV', license_expiry: '2099-12-31', contact_number: '9876543210',
    status: 'Available',
    ...overrides,
  };
  const [res] = await pool.execute(
    `INSERT INTO drivers (name, license_number, license_category, license_expiry, contact_number, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [d.name, d.license_number, d.license_category, d.license_expiry, d.contact_number, d.status]
  );
  return { id: res.insertId, ...d };
}

async function getRow(table, id) {
  const [[row]] = await pool.execute(`SELECT * FROM ${table} WHERE id = ?`, [id]);
  return row;
}

module.exports = { pool, resetDb, createUser, insertVehicle, insertDriver, getRow };
