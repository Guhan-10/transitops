/**
 * Runs once before the whole suite: (re)creates the test database from schema.sql.
 */
const fs    = require('fs');
const path  = require('path');
const mysql = require('mysql2/promise');

module.exports = async () => {
  require('./env');
  const dbName = process.env.DB_NAME;

  // schema.sql creates and USEs `transitops`; strip those lines and load into the test DB instead
  const schema = fs.readFileSync(path.join(__dirname, '..', '..', 'schema.sql'), 'utf8')
    .replace(/^\s*CREATE DATABASE[\s\S]*?;\s*$/m, '')
    .replace(/^\s*USE\s+\w+\s*;\s*$/m, '');

  const conn = await mysql.createConnection({
    host:               process.env.DB_HOST || 'localhost',
    port:               Number(process.env.DB_PORT) || 3306,
    user:               process.env.DB_USER,
    password:           process.env.DB_PASSWORD,
    multipleStatements: true,
  });
  try {
    await conn.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    await conn.query(`CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await conn.query(`USE \`${dbName}\``);
    await conn.query(schema);
  } finally {
    await conn.end();
  }
};
