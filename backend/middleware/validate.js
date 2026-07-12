/**
 * Lightweight validation helpers used across route files.
 */

/** Returns true if value is a finite number >= 0 */
function isNonNegativeNumber(val) {
  const n = parseFloat(val);
  return !isNaN(n) && isFinite(n) && n >= 0;
}

/** Returns true if string is a plausible YYYY-MM-DD date */
function isValidDate(str) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const d = new Date(str);
  return !isNaN(d.getTime());
}

/** Returns true if string looks like a valid email */
function isValidEmail(str) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
}

/** Trims a string value; returns '' if not a string */
function trim(val) {
  return typeof val === 'string' ? val.trim() : '';
}

module.exports = { isNonNegativeNumber, isValidDate, isValidEmail, trim };
