const router = require('express').Router();
const pool   = require('../db');
const auth   = require('../middleware/auth');

router.use(auth);

router.get('/', async (req, res, next) => {
  try {
    const { status } = req.query;
    let sql = `
      SELECT t.*, v.name AS vehicle_name, v.registration_number, d.name AS driver_name
      FROM trips t
      JOIN vehicles v ON v.id = t.vehicle_id
      JOIN drivers  d ON d.id = t.driver_id
      WHERE 1=1
    `;
    const params = [];
    if (status) { sql += ' AND t.status = ?'; params.push(status); }
    sql += ' ORDER BY t.id DESC';
    const [rows] = await pool.execute(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const [[row]] = await pool.execute(
      `SELECT t.*, v.name AS vehicle_name, v.registration_number, d.name AS driver_name
       FROM trips t
       JOIN vehicles v ON v.id = t.vehicle_id
       JOIN drivers  d ON d.id = t.driver_id
       WHERE t.id = ?`,
      [req.params.id]
    );
    if (!row) return res.status(404).json({ error: 'Trip not found' });
    res.json(row);
  } catch (err) { next(err); }
});

// Create trip (Draft) — validates vehicle, driver, and cargo weight
router.post('/', async (req, res, next) => {
  try {
    const { source, destination, vehicle_id, driver_id, cargo_weight, planned_distance, revenue } = req.body;
    if (!source || !destination || !vehicle_id || !driver_id) {
      return res.status(400).json({ error: 'source, destination, vehicle_id, driver_id are required' });
    }

    const [[vehicle]] = await pool.execute('SELECT * FROM vehicles WHERE id = ?', [vehicle_id]);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    if (vehicle.status !== 'Available') {
      return res.status(409).json({ error: `Vehicle is not available (status: ${vehicle.status})` });
    }

    const [[driver]] = await pool.execute('SELECT * FROM drivers WHERE id = ?', [driver_id]);
    if (!driver) return res.status(404).json({ error: 'Driver not found' });
    if (driver.status === 'Suspended') {
      return res.status(409).json({ error: 'Driver is Suspended and cannot be assigned to a trip' });
    }
    if (driver.status !== 'Available') {
      return res.status(409).json({ error: `Driver is not available (status: ${driver.status})` });
    }
    if (new Date(driver.license_expiry) < new Date()) {
      return res.status(409).json({ error: `Driver's license expired on ${driver.license_expiry}` });
    }

    const cw = parseFloat(cargo_weight) || 0;
    if (cw > parseFloat(vehicle.max_load_capacity)) {
      return res.status(409).json({
        error: `Cargo weight ${cw} exceeds vehicle max load capacity ${vehicle.max_load_capacity}`,
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO trips (source, destination, vehicle_id, driver_id, cargo_weight, planned_distance, revenue, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Draft')`,
      [source, destination, vehicle_id, driver_id, cw, planned_distance || 0, revenue || 0]
    );
    const [[trip]] = await pool.execute('SELECT * FROM trips WHERE id = ?', [result.insertId]);
    res.status(201).json(trip);
  } catch (err) { next(err); }
});

// Dispatch: Draft → Dispatched — sets vehicle + driver to On Trip (atomic)
router.post('/:id/dispatch', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[trip]] = await conn.execute('SELECT * FROM trips WHERE id = ? FOR UPDATE', [req.params.id]);
    if (!trip) { await conn.rollback(); return res.status(404).json({ error: 'Trip not found' }); }
    if (trip.status !== 'Draft') {
      await conn.rollback();
      return res.status(409).json({ error: `Cannot dispatch a trip with status: ${trip.status}` });
    }

    const [[vehicle]] = await conn.execute('SELECT * FROM vehicles WHERE id = ? FOR UPDATE', [trip.vehicle_id]);
    if (vehicle.status !== 'Available') {
      await conn.rollback();
      return res.status(409).json({ error: `Vehicle is not available (status: ${vehicle.status})` });
    }

    const [[driver]] = await conn.execute('SELECT * FROM drivers WHERE id = ? FOR UPDATE', [trip.driver_id]);
    if (driver.status !== 'Available') {
      await conn.rollback();
      return res.status(409).json({ error: `Driver is not available (status: ${driver.status})` });
    }
    if (new Date(driver.license_expiry) < new Date()) {
      await conn.rollback();
      return res.status(409).json({ error: "Driver's license has expired" });
    }

    await conn.execute("UPDATE trips    SET status = 'Dispatched' WHERE id = ?", [req.params.id]);
    await conn.execute("UPDATE vehicles SET status = 'On Trip'    WHERE id = ?", [trip.vehicle_id]);
    await conn.execute("UPDATE drivers  SET status = 'On Trip'    WHERE id = ?", [trip.driver_id]);

    await conn.commit();
    const [[updated]] = await pool.execute('SELECT * FROM trips WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

// Complete: Dispatched → Completed — requires final_odometer + fuel_consumed, inserts fuel log (atomic)
router.post('/:id/complete', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { final_odometer, fuel_consumed } = req.body;
    if (final_odometer == null || fuel_consumed == null) {
      await conn.rollback();
      return res.status(400).json({ error: 'final_odometer and fuel_consumed are required to complete a trip' });
    }

    const [[trip]] = await conn.execute('SELECT * FROM trips WHERE id = ? FOR UPDATE', [req.params.id]);
    if (!trip) { await conn.rollback(); return res.status(404).json({ error: 'Trip not found' }); }
    if (trip.status !== 'Dispatched') {
      await conn.rollback();
      return res.status(409).json({ error: `Cannot complete a trip with status: ${trip.status}` });
    }

    const fuelCost = parseFloat(req.body.fuel_cost) || 0;
    const today    = new Date().toISOString().slice(0, 10);

    await conn.execute(
      `UPDATE trips SET status = 'Completed', final_odometer = ?, fuel_consumed = ? WHERE id = ?`,
      [final_odometer, fuel_consumed, req.params.id]
    );
    await conn.execute(
      `UPDATE vehicles SET status = 'Available', odometer = ? WHERE id = ?`,
      [final_odometer, trip.vehicle_id]
    );
    await conn.execute("UPDATE drivers SET status = 'Available' WHERE id = ?", [trip.driver_id]);
    await conn.execute(
      `INSERT INTO fuel_logs (vehicle_id, trip_id, liters, cost, log_date) VALUES (?, ?, ?, ?, ?)`,
      [trip.vehicle_id, trip.id, fuel_consumed, fuelCost, today]
    );

    await conn.commit();
    const [[updated]] = await pool.execute('SELECT * FROM trips WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

// Cancel: Dispatched → Cancelled — reverts vehicle + driver to Available (atomic)
router.post('/:id/cancel', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[trip]] = await conn.execute('SELECT * FROM trips WHERE id = ? FOR UPDATE', [req.params.id]);
    if (!trip) { await conn.rollback(); return res.status(404).json({ error: 'Trip not found' }); }
    if (trip.status !== 'Dispatched') {
      await conn.rollback();
      return res.status(409).json({ error: `Cannot cancel a trip with status: ${trip.status}` });
    }

    await conn.execute("UPDATE trips    SET status = 'Cancelled'  WHERE id = ?", [req.params.id]);
    await conn.execute("UPDATE vehicles SET status = 'Available'  WHERE id = ?", [trip.vehicle_id]);
    await conn.execute("UPDATE drivers  SET status = 'Available'  WHERE id = ?", [trip.driver_id]);

    await conn.commit();
    const [[updated]] = await pool.execute('SELECT * FROM trips WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

module.exports = router;
