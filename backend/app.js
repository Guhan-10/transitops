const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();

// CORS_ORIGIN is a comma-separated allow-list (e.g. https://you.github.io).
// Unset means allow all, which is fine for local dev only.
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);
app.use(cors(allowedOrigins.length ? { origin: allowedOrigins } : {}));
app.use(express.json());

// ── Health check (used by the host and by CI smoke tests) ───────────────────
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'up' });
  } catch {
    res.status(503).json({ status: 'error', db: 'down' });
  }
});

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/vehicles',    require('./routes/vehicles'));
app.use('/api/drivers',     require('./routes/drivers'));
app.use('/api/trips',       require('./routes/trips'));
app.use('/api/maintenance', require('./routes/maintenance'));
app.use('/api/fuel-logs',   require('./routes/fuel'));
app.use('/api/expenses',    require('./routes/expenses'));
app.use('/api/reports',     require('./routes/reports'));

// ── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

module.exports = app;
