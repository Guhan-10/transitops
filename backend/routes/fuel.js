const router = require('express').Router();
const pool   = require('../db');
const auth   = require('../middleware/auth');

router.use(auth);

// GET /api/fuel-logs
router.get('/', async (req, res, next) => {
  try {
    const { vehicle_id, trip_id } = req.query;
    let sql = `
      SELECT f.*, v.name AS vehicle_name, v.registration_number
      FROM fuel_logs f
      JOIN vehicles v ON v.id = f.vehicle_id
      WHERE 1=1
    `;
    const params = [];
    if (vehicle_id) { sql += ' AND f.vehicle_id = ?'; params.push(vehicle_id); }
    if (trip_id)    { sql += ' AND f.trip_id = ?';    params.push(trip_id); }
    sql += ' ORDER BY f.id DESC';
    const [rows] = await pool.execute(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/fuel-logs
router.post('/', async (req, res, next) => {
  try {
    const { vehicle_id, trip_id, liters, cost, log_date } = req.body;
    if (!vehicle_id || !liters || !cost || !log_date) {
      return res.status(400).json({ error: 'vehicle_id, liters, cost, and log_date are required' });
    }
    const [result] = await pool.execute(
      'INSERT INTO fuel_logs (vehicle_id, trip_id, liters, cost, log_date) VALUES (?, ?, ?, ?, ?)',
      [vehicle_id, trip_id || null, liters, cost, log_date]
    );
    const [[row]] = await pool.execute('SELECT * FROM fuel_logs WHERE id = ?', [result.insertId]);
    res.status(201).json(row);
  } catch (err) { next(err); }
});

// DELETE /api/fuel-logs/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const [[row]] = await pool.execute('SELECT id FROM fuel_logs WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Fuel log not found' });
    await pool.execute('DELETE FROM fuel_logs WHERE id = ?', [req.params.id]);
    res.json({ message: 'Fuel log deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
