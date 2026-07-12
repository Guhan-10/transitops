const router = require('express').Router();
const pool   = require('../db');
const auth   = require('../middleware/auth');

router.use(auth);

router.get('/dashboard', async (req, res, next) => {
  try {
    const [[vehicleStats]] = await pool.execute(`
      SELECT
        COUNT(*) AS total_vehicles,
        SUM(status = 'Available') AS available_vehicles,
        SUM(status = 'On Trip')   AS on_trip_vehicles,
        SUM(status = 'In Shop')   AS in_maintenance_vehicles,
        SUM(status = 'Retired')   AS retired_vehicles
      FROM vehicles
    `);
    const [[tripStats]] = await pool.execute(`
      SELECT
        SUM(status = 'Dispatched') AS active_trips,
        SUM(status = 'Draft')      AS pending_trips,
        SUM(status = 'Completed')  AS completed_trips
      FROM trips
    `);
    const [[driverStats]] = await pool.execute(`
      SELECT SUM(status = 'On Trip') AS drivers_on_duty FROM drivers
    `);

    const total   = parseInt(vehicleStats.total_vehicles) || 0;
    const onTrip  = parseInt(vehicleStats.on_trip_vehicles) || 0;

    res.json({
      total_vehicles:          total,
      available_vehicles:      parseInt(vehicleStats.available_vehicles) || 0,
      on_trip_vehicles:        onTrip,
      in_maintenance_vehicles: parseInt(vehicleStats.in_maintenance_vehicles) || 0,
      retired_vehicles:        parseInt(vehicleStats.retired_vehicles) || 0,
      active_trips:            parseInt(tripStats.active_trips) || 0,
      pending_trips:           parseInt(tripStats.pending_trips) || 0,
      completed_trips:         parseInt(tripStats.completed_trips) || 0,
      drivers_on_duty:         parseInt(driverStats.drivers_on_duty) || 0,
      fleet_utilization_pct:   total > 0 ? Math.round((onTrip / total) * 100) : 0,
    });
  } catch (err) { next(err); }
});

router.get('/summary', async (req, res, next) => {
  try {
    const [rows] = await pool.execute(`
      SELECT
        v.id, v.name, v.registration_number, v.type, v.acquisition_cost, v.odometer, v.status,
        COALESCE(SUM(DISTINCT fl.cost),   0) AS total_fuel_cost,
        COALESCE(SUM(DISTINCT ml.cost),   0) AS total_maintenance_cost,
        COALESCE(SUM(DISTINCT ex.amount), 0) AS total_expense_cost,
        COALESCE(SUM(fl.liters),          0) AS total_liters,
        COALESCE(SUM(t.planned_distance), 0) AS total_distance,
        COALESCE(SUM(t.revenue),          0) AS total_revenue
      FROM vehicles v
      LEFT JOIN fuel_logs        fl ON fl.vehicle_id = v.id
      LEFT JOIN maintenance_logs ml ON ml.vehicle_id = v.id
      LEFT JOIN expenses         ex ON ex.vehicle_id = v.id
      LEFT JOIN trips            t  ON t.vehicle_id  = v.id AND t.status = 'Completed'
      GROUP BY v.id
    `);

    const result = rows.map(r => {
      const fuelCost  = parseFloat(r.total_fuel_cost)        || 0;
      const maintCost = parseFloat(r.total_maintenance_cost) || 0;
      const expCost   = parseFloat(r.total_expense_cost)     || 0;
      const totalOps  = fuelCost + maintCost + expCost;
      const liters    = parseFloat(r.total_liters)           || 0;
      const distance  = parseFloat(r.total_distance)         || 0;
      const revenue   = parseFloat(r.total_revenue)          || 0;
      const acqCost   = parseFloat(r.acquisition_cost)       || 1;
      const fuelEff   = liters > 0 ? parseFloat((distance / liters).toFixed(2)) : 0;
      const roi       = parseFloat(((revenue - (maintCost + fuelCost)) / acqCost).toFixed(4));

      return {
        ...r,
        total_fuel_cost:        fuelCost,
        total_maintenance_cost: maintCost,
        total_expense_cost:     expCost,
        total_operational_cost: parseFloat(totalOps.toFixed(2)),
        fuel_efficiency:        fuelEff,
        total_revenue:          revenue,
        roi,
      };
    });

    res.json(result);
  } catch (err) { next(err); }
});

router.get('/csv', async (req, res, next) => {
  try {
    const [rows] = await pool.execute(`
      SELECT
        v.id, v.name, v.registration_number, v.type, v.acquisition_cost, v.odometer, v.status,
        COALESCE(SUM(fl.cost),   0) AS total_fuel_cost,
        COALESCE(SUM(ml.cost),   0) AS total_maintenance_cost,
        COALESCE(SUM(ex.amount), 0) AS total_expense_cost,
        COALESCE(SUM(fl.liters), 0) AS total_liters,
        COALESCE(SUM(t.planned_distance), 0) AS total_distance,
        COALESCE(SUM(t.revenue), 0) AS total_revenue
      FROM vehicles v
      LEFT JOIN fuel_logs        fl ON fl.vehicle_id = v.id
      LEFT JOIN maintenance_logs ml ON ml.vehicle_id = v.id
      LEFT JOIN expenses         ex ON ex.vehicle_id = v.id
      LEFT JOIN trips            t  ON t.vehicle_id  = v.id AND t.status = 'Completed'
      GROUP BY v.id
    `);

    const headers = [
      'ID','Name','Registration','Type','Status','Odometer',
      'Acquisition Cost','Total Revenue','Fuel Cost','Maintenance Cost',
      'Other Expenses','Total Operational Cost','Fuel Efficiency (km/L)','ROI'
    ];

    const csvRows = rows.map(r => {
      const fuelCost  = parseFloat(r.total_fuel_cost)        || 0;
      const maintCost = parseFloat(r.total_maintenance_cost) || 0;
      const expCost   = parseFloat(r.total_expense_cost)     || 0;
      const totalOps  = fuelCost + maintCost + expCost;
      const liters    = parseFloat(r.total_liters)           || 0;
      const distance  = parseFloat(r.total_distance)         || 0;
      const revenue   = parseFloat(r.total_revenue)          || 0;
      const acqCost   = parseFloat(r.acquisition_cost)       || 1;
      const fuelEff   = liters > 0 ? (distance / liters).toFixed(2) : '0';
      const roi       = ((revenue - (maintCost + fuelCost)) / acqCost).toFixed(4);

      return [
        r.id, r.name, r.registration_number, r.type, r.status, r.odometer,
        r.acquisition_cost, revenue.toFixed(2), fuelCost.toFixed(2), maintCost.toFixed(2),
        expCost.toFixed(2), totalOps.toFixed(2), fuelEff, roi
      ].join(',');
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="transitops_report.csv"');
    res.send([headers.join(','), ...csvRows].join('\n'));
  } catch (err) { next(err); }
});

module.exports = router;
