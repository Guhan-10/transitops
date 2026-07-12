const router = require('express').Router();
const pool   = require('../db');
const auth   = require('../middleware/auth');

router.use(auth);

// GET /api/drivers
router.get('/', async (req, res, next) => {
  try {
    const { status } = req.query;
    let sql = 'SELECT * FROM drivers WHERE 1=1';
    const params = [];
    if (status) { sql += ' AND status = ?'; params.push(status); }
    sql += ' ORDER BY id DESC';
    const [rows] = await pool.execute(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/drivers/:id
router.get('/:id', async (req, res, next) => {
  try {
    const [[row]] = await pool.execute('SELECT * FROM drivers WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Driver not found' });
    res.json(row);
  } catch (err) { next(err); }
});

// POST /api/drivers
router.post('/', async (req, res, next) => {
  try {
    const { name, license_number, license_category, license_expiry, contact_number, safety_score, status } = req.body;
    if (!name || !license_number || !license_category || !license_expiry) {
      return res.status(400).json({ error: 'name, license_number, license_category, license_expiry are required' });
    }
    const [result] = await pool.execute(
      `INSERT INTO drivers (name, license_number, license_category, license_expiry, contact_number, safety_score, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, license_number, license_category, license_expiry,
       contact_number || null, safety_score ?? 100, status || 'Available']
    );
    const [[driver]] = await pool.execute('SELECT * FROM drivers WHERE id = ?', [result.insertId]);
    res.status(201).json(driver);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'License number already exists' });
    }
    next(err);
  }
});

// PUT /api/drivers/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { name, license_number, license_category, license_expiry, contact_number, safety_score, status } = req.body;
    const [[existing]] = await pool.execute('SELECT * FROM drivers WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Driver not found' });

    await pool.execute(
      `UPDATE drivers SET name=?, license_number=?, license_category=?, license_expiry=?,
       contact_number=?, safety_score=?, status=? WHERE id=?`,
      [
        name             ?? existing.name,
        license_number   ?? existing.license_number,
        license_category ?? existing.license_category,
        license_expiry   ?? existing.license_expiry,
        contact_number   !== undefined ? contact_number : existing.contact_number,
        safety_score     ?? existing.safety_score,
        status           ?? existing.status,
        req.params.id,
      ]
    );
    const [[updated]] = await pool.execute('SELECT * FROM drivers WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'License number already exists' });
    }
    next(err);
  }
});

// DELETE /api/drivers/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const [[driver]] = await pool.execute('SELECT status FROM drivers WHERE id = ?', [req.params.id]);
    if (!driver) return res.status(404).json({ error: 'Driver not found' });
    if (driver.status === 'On Trip') {
      return res.status(409).json({ error: 'Cannot delete a driver who is currently On Trip' });
    }
    await pool.execute('DELETE FROM drivers WHERE id = ?', [req.params.id]);
    res.json({ message: 'Driver deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
