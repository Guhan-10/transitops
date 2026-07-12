const router = require('express').Router();
const pool   = require('../db');
const auth   = require('../middleware/auth');

router.use(auth);

router.get('/', async (req, res, next) => {
  try {
    const { status, type, region } = req.query;
    let sql    = 'SELECT * FROM vehicles WHERE 1=1';
    const params = [];
    if (status) { sql += ' AND status = ?';  params.push(status); }
    if (type)   { sql += ' AND type = ?';    params.push(type); }
    if (region) { sql += ' AND region = ?';  params.push(region); }
    sql += ' ORDER BY id DESC';
    const [rows] = await pool.execute(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const [[row]] = await pool.execute('SELECT * FROM vehicles WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Vehicle not found' });
    res.json(row);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { registration_number, name, type, region, max_load_capacity, odometer, acquisition_cost, status } = req.body;
    if (!registration_number || !name || !type) {
      return res.status(400).json({ error: 'registration_number, name, and type are required' });
    }
    const [result] = await pool.execute(
      `INSERT INTO vehicles (registration_number, name, type, region, max_load_capacity, odometer, acquisition_cost, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [registration_number, name, type, region || null,
       max_load_capacity || 0, odometer || 0, acquisition_cost || 0, status || 'Available']
    );
    const [[vehicle]] = await pool.execute('SELECT * FROM vehicles WHERE id = ?', [result.insertId]);
    res.status(201).json(vehicle);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Registration number already exists' });
    }
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { registration_number, name, type, region, max_load_capacity, odometer, acquisition_cost, status } = req.body;
    const [[existing]] = await pool.execute('SELECT * FROM vehicles WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Vehicle not found' });

    await pool.execute(
      `UPDATE vehicles SET registration_number=?, name=?, type=?, region=?,
       max_load_capacity=?, odometer=?, acquisition_cost=?, status=? WHERE id=?`,
      [
        registration_number  ?? existing.registration_number,
        name                 ?? existing.name,
        type                 ?? existing.type,
        region               !== undefined ? region : existing.region,
        max_load_capacity    ?? existing.max_load_capacity,
        odometer             ?? existing.odometer,
        acquisition_cost     ?? existing.acquisition_cost,
        status               ?? existing.status,
        req.params.id,
      ]
    );
    const [[updated]] = await pool.execute('SELECT * FROM vehicles WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Registration number already exists' });
    }
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const [[vehicle]] = await pool.execute('SELECT status FROM vehicles WHERE id = ?', [req.params.id]);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    if (vehicle.status === 'On Trip') {
      return res.status(409).json({ error: 'Cannot delete a vehicle that is currently On Trip' });
    }
    await pool.execute('DELETE FROM vehicles WHERE id = ?', [req.params.id]);
    res.json({ message: 'Vehicle deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
