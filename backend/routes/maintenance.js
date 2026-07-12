const router = require('express').Router();
const pool   = require('../db');
const auth   = require('../middleware/auth');

router.use(auth);

router.get('/', async (req, res, next) => {
  try {
    const { status, vehicle_id } = req.query;
    let sql = `
      SELECT m.*, v.name AS vehicle_name, v.registration_number
      FROM maintenance_logs m
      JOIN vehicles v ON v.id = m.vehicle_id
      WHERE 1=1
    `;
    const params = [];
    if (status)     { sql += ' AND m.status = ?';     params.push(status); }
    if (vehicle_id) { sql += ' AND m.vehicle_id = ?'; params.push(vehicle_id); }
    sql += ' ORDER BY m.id DESC';
    const [rows] = await pool.execute(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

// Create Open maintenance record — automatically sets vehicle status to In Shop
router.post('/', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { vehicle_id, description, cost } = req.body;
    if (!vehicle_id || !description) {
      await conn.rollback();
      return res.status(400).json({ error: 'vehicle_id and description are required' });
    }

    const [[vehicle]] = await conn.execute('SELECT * FROM vehicles WHERE id = ? FOR UPDATE', [vehicle_id]);
    if (!vehicle) { await conn.rollback(); return res.status(404).json({ error: 'Vehicle not found' }); }
    if (vehicle.status === 'Retired') {
      await conn.rollback();
      return res.status(409).json({ error: 'Cannot create maintenance record for a Retired vehicle' });
    }

    const [result] = await conn.execute(
      `INSERT INTO maintenance_logs (vehicle_id, description, cost, status) VALUES (?, ?, ?, 'Open')`,
      [vehicle_id, description, cost || 0]
    );
    await conn.execute("UPDATE vehicles SET status = 'In Shop' WHERE id = ?", [vehicle_id]);

    await conn.commit();
    const [[record]] = await pool.execute(
      'SELECT m.*, v.name AS vehicle_name FROM maintenance_logs m JOIN vehicles v ON v.id = m.vehicle_id WHERE m.id = ?',
      [result.insertId]
    );
    res.status(201).json(record);
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

// Close maintenance record — sets vehicle back to Available unless Retired
router.post('/:id/close', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[record]] = await conn.execute('SELECT * FROM maintenance_logs WHERE id = ? FOR UPDATE', [req.params.id]);
    if (!record) { await conn.rollback(); return res.status(404).json({ error: 'Maintenance record not found' }); }
    if (record.status === 'Closed') {
      await conn.rollback();
      return res.status(409).json({ error: 'Maintenance record is already closed' });
    }

    const [[vehicle]] = await conn.execute('SELECT * FROM vehicles WHERE id = ? FOR UPDATE', [record.vehicle_id]);
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await conn.execute(
      "UPDATE maintenance_logs SET status = 'Closed', closed_at = ? WHERE id = ?",
      [now, req.params.id]
    );
    if (vehicle.status !== 'Retired') {
      await conn.execute("UPDATE vehicles SET status = 'Available' WHERE id = ?", [record.vehicle_id]);
    }

    await conn.commit();
    const [[updated]] = await pool.execute('SELECT * FROM maintenance_logs WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

module.exports = router;
