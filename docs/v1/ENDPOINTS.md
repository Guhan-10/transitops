# TransitOps v1 — endpoint inventory

Frozen record of every HTTP endpoint in v1 (tag `v1.0.0`), taken from the route
files rather than the README, which omits the `GET /:id` and `DELETE` routes.
This is the input to the Stage 1.1 permission matrix.

**Auth in v1:** every route except `/api/auth/*` requires a valid JWT
(`middleware/auth.js`). `requireRole` exists in `middleware/rbac.js` but is
**not used by any route**, so any signed-in user of any role can call all of them.

| # | Method | Path | Source | Notes |
|---|--------|------|--------|-------|
| 1 | POST | `/api/auth/signup` | routes/auth.js | Public. Caller chooses their own role, including FleetManager |
| 2 | POST | `/api/auth/login` | routes/auth.js | Public. Returns a 24h JWT |
| 3 | GET | `/api/vehicles` | routes/vehicles.js | Filters: `status`, `type`, `region` |
| 4 | GET | `/api/vehicles/:id` | routes/vehicles.js | |
| 5 | POST | `/api/vehicles` | routes/vehicles.js | Requires `registration_number`, `name`, `type` |
| 6 | PUT | `/api/vehicles/:id` | routes/vehicles.js | Partial update; `status` can be set directly |
| 7 | DELETE | `/api/vehicles/:id` | routes/vehicles.js | Blocked while On Trip; hard delete |
| 8 | GET | `/api/drivers` | routes/drivers.js | Filter: `status` |
| 9 | GET | `/api/drivers/:id` | routes/drivers.js | |
| 10 | POST | `/api/drivers` | routes/drivers.js | Requires name and licence fields |
| 11 | PUT | `/api/drivers/:id` | routes/drivers.js | Partial update; `status` can be set directly |
| 12 | DELETE | `/api/drivers/:id` | routes/drivers.js | Blocked while On Trip; hard delete |
| 13 | GET | `/api/trips` | routes/trips.js | Filter: `status` |
| 14 | GET | `/api/trips/:id` | routes/trips.js | |
| 15 | POST | `/api/trips` | routes/trips.js | Creates a Draft; checks vehicle, driver, licence, cargo |
| 16 | POST | `/api/trips/:id/dispatch` | routes/trips.js | Draft → Dispatched (transaction) |
| 17 | POST | `/api/trips/:id/complete` | routes/trips.js | Dispatched → Completed; writes a fuel log (transaction) |
| 18 | POST | `/api/trips/:id/cancel` | routes/trips.js | Dispatched → Cancelled (transaction) |
| 19 | GET | `/api/maintenance` | routes/maintenance.js | Filters: `status`, `vehicle_id` |
| 20 | POST | `/api/maintenance` | routes/maintenance.js | Opens a record; vehicle → In Shop (transaction) |
| 21 | POST | `/api/maintenance/:id/close` | routes/maintenance.js | Closes; vehicle → Available unless Retired |
| 22 | GET | `/api/fuel-logs` | routes/fuel.js | Filters: `vehicle_id`, `trip_id` |
| 23 | POST | `/api/fuel-logs` | routes/fuel.js | |
| 24 | DELETE | `/api/fuel-logs/:id` | routes/fuel.js | Not in README |
| 25 | GET | `/api/expenses` | routes/expenses.js | Filter: `vehicle_id` |
| 26 | POST | `/api/expenses` | routes/expenses.js | |
| 27 | DELETE | `/api/expenses/:id` | routes/expenses.js | Not in README |
| 28 | GET | `/api/reports/dashboard` | routes/reports.js | KPI counts |
| 29 | GET | `/api/reports/summary` | routes/reports.js | Per-vehicle costs and ROI |
| 30 | GET | `/api/reports/csv` | routes/reports.js | Same data as summary, as CSV |

Added in v2 Stage 0 (not part of v1): `GET /api/health`.
