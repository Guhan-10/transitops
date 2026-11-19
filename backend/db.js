const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               Number(process.env.DB_PORT) || 3306,
  user:               process.env.DB_USER,
  password:           process.env.DB_PASSWORD,
  database:           process.env.DB_NAME     || 'transitops',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  // Managed MySQL hosts require TLS; set DB_SSL=true there, plus DB_SSL_CA
  // (the PEM text) if the provider uses its own certificate authority.
  ssl:                process.env.DB_SSL === 'true'
    ? { rejectUnauthorized: true, ca: process.env.DB_SSL_CA || undefined }
    : undefined,
});

module.exports = pool;
