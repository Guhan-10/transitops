/**
 * Loads test settings: real environment variables (CI) win over backend/.env.test (local).
 * Refuses to run against any database whose name does not end in _test,
 * because the suite drops and recreates every table.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.test') });

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

if (!process.env.DB_NAME || !process.env.DB_NAME.endsWith('_test')) {
  throw new Error(
    `Refusing to run tests: DB_NAME must end in "_test" (got "${process.env.DB_NAME || ''}"). ` +
    'Copy backend/.env.test.example to backend/.env.test or set DB_* variables.'
  );
}
