const router = require('express').Router();
const pool   = require('../db');
const auth   = require('../middleware/auth');

router.use(auth);

// GET /api/expenses
router.get('/', async (req, res, next) => {
  try {
    const { vehicle_id } = req.query;
    let sql = `
      SELECT e.*, v.name AS vehicle_name, v.registration_number
      FROM expenses e
      JOIN vehicles v ON v.id = e.vehicle_id
      WHERE 1=1
    `;
    const params = [];
    if (vehicle_id) { sql += ' AND e.vehicle_id = ?'; params.push(vehicle_id); }
    sql += ' ORDER BY e.id DESC';
    const [rows] = await pool.execute(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/expenses
router.post('/', async (req, res, next) => {
  try {
    const { vehicle_id, type, amount, expense_date } = req.body;
    if (!vehicle_id || !type || !amount || !expense_date) {
      return res.status(400).json({ error: 'vehicle_id, type, amount, and expense_date are required' });
    }
    const [result] = await pool.execute(
      'INSERT INTO expenses (vehicle_id, type, amount, expense_date) VALUES (?, ?, ?, ?)',
      [vehicle_id, type, amount, expense_date]
    );
    const [[row]] = await pool.execute('SELECT * FROM expenses WHERE id = ?', [result.insertId]);
    res.status(201).json(row);
  } catch (err) { next(err); }
});

// DELETE /api/expenses/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const [[row]] = await pool.execute('SELECT id FROM expenses WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Expense not found' });
    await pool.execute('DELETE FROM expenses WHERE id = ?', [req.params.id]);
    res.json({ message: 'Expense deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
