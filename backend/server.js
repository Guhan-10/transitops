require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`TransitOps API running on port ${PORT}`));
