# TransitOps

A full-stack fleet and transport management platform with role-based access control, transactional business rules, and a clean functional UI.

## Stack

| Layer    | Technology                        |
|----------|-----------------------------------|
| Frontend | React 18 + Vite + Tailwind CSS v4 |
| Backend  | Node.js + Express 4               |
| Database | MySQL 8+                          |
| Auth     | JWT (24h) + bcrypt                |

---

## Setup

Requirements: Node.js 22+, npm, MySQL 8+ (local install or Docker).

### 1. Create the database

```bash
mysql -u YOUR_USER -p < schema.sql
```

On Windows PowerShell: `Get-Content schema.sql | mysql -u YOUR_USER -p`

### 2. Configure environment

Backend: copy the template and fill in your MySQL details and a JWT secret.

```bash
cp .env.example backend/.env
```

Generate `JWT_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Frontend (optional for local dev; defaults to `http://localhost:3001`):

```bash
cp frontend/.env.example frontend/.env
```

On Windows use `copy` instead of `cp`.

### 3. Start the servers

**Backend** (port 3001):
```bash
cd backend
npm ci
npm run dev
```

**Frontend** (port 5173):
```bash
cd frontend
npm ci
npm run dev
```

Open **http://localhost:5173/transitops/** (the app is served under `/transitops/`, the same path as on GitHub Pages).

Check the API with `curl http://localhost:3001/api/health`.

### 4. Run the tests

The backend tests use a **separate** database and drop and recreate all of its tables.
The database name must end in `_test`.

```bash
cp backend/.env.test.example backend/.env.test
```

Edit `backend/.env.test` with a MySQL user that can create databases, then:

```bash
cd backend
npm test
```

No local MySQL? Start a throwaway one with Docker and set `DB_PORT=3307` in `.env.test`:

```bash
docker run -d --name transitops-test-mysql -e MYSQL_ROOT_PASSWORD=root -p 127.0.0.1:3307:3306 mysql:8.4
```

### Hosting and CI

See [docs/DEPLOY.md](docs/DEPLOY.md). Every pull request runs the tests and the frontend build;
pushes to `main` deploy only when both pass.

---

## Project Structure

```
transitops/
├── schema.sql                    # Run to create DB and all tables
├── .env.example                  # Backend env template (no secrets)
├── .github/workflows/ci.yml      # Tests on every PR; deploy on green main
├── docs/
│   ├── DEPLOY.md                 # Hosting + CI setup
│   └── v1/                       # Frozen v1 record (endpoints, freeze checklist)
├── scripts/db/
│   ├── dump.sh                   # mysqldump + exact row counts
│   └── verify-restore.sh         # Restore into empty DB, compare counts
├── backend/
│   ├── app.js                    # Express app (routes, health check, errors)
│   ├── server.js                 # Entry point: loads .env, starts listening
│   ├── db.js                     # mysql2 connection pool
│   ├── .env.test.example         # Test database template
│   ├── middleware/
│   │   ├── auth.js               # JWT Bearer verification
│   │   ├── rbac.js               # requireRole() factory
│   │   └── validate.js           # Input validation helpers
│   ├── routes/
│   │   ├── auth.js               # /api/auth/login, /signup
│   │   ├── vehicles.js           # /api/vehicles (CRUD)
│   │   ├── drivers.js            # /api/drivers (CRUD)
│   │   ├── trips.js              # /api/trips + dispatch/complete/cancel
│   │   ├── maintenance.js        # /api/maintenance + close
│   │   ├── fuel.js               # /api/fuel-logs
│   │   ├── expenses.js           # /api/expenses
│   │   └── reports.js            # /api/reports (dashboard, summary, csv)
│   └── tests/                    # Jest + Supertest (separate _test database)
└── frontend/
    ├── .env.example              # VITE_API_URL
    └── src/
        ├── App.jsx               # Router + sidebar layout + PrivateRoute
        ├── api/client.js         # Axios instance with JWT interceptor
        ├── context/AuthContext.jsx
        └── pages/
            ├── Login.jsx
            ├── Dashboard.jsx
            ├── Vehicles.jsx
            ├── Drivers.jsx
            ├── Trips.jsx
            ├── Maintenance.jsx
            ├── FuelExpenses.jsx
            └── Reports.jsx
```

---

## API Reference

Full v1 inventory (30 endpoints): [docs/v1/ENDPOINTS.md](docs/v1/ENDPOINTS.md).

### Health
| Method | Path        | Notes                                           |
|--------|-------------|-------------------------------------------------|
| GET    | /api/health | `200 {status:"ok",db:"up"}`, or `503` if the DB is unreachable |

### Auth
| Method | Path               | Body                                  |
|--------|--------------------|---------------------------------------|
| POST   | /api/auth/signup   | `{ name, email, password, role }`     |
| POST   | /api/auth/login    | `{ email, password }`                 |

### Vehicles
| Method | Path               | Notes                                 |
|--------|--------------------|---------------------------------------|
| GET    | /api/vehicles      | `?status=Available&type=Truck&region=` |
| POST   | /api/vehicles      | Create vehicle                        |
| PUT    | /api/vehicles/:id  | Update vehicle                        |
| DELETE | /api/vehicles/:id  | Blocked if status is On Trip          |

### Drivers
| Method | Path              | Notes                        |
|--------|-------------------|------------------------------|
| GET    | /api/drivers      | `?status=Available`          |
| POST   | /api/drivers      | Create driver                |
| PUT    | /api/drivers/:id  | Update driver                |
| DELETE | /api/drivers/:id  | Blocked if status is On Trip |

### Trips
| Method | Path                       | Notes                                       |
|--------|----------------------------|---------------------------------------------|
| GET    | /api/trips                 | `?status=Draft`                             |
| POST   | /api/trips                 | Create trip (Draft) — validates all rules   |
| POST   | /api/trips/:id/dispatch    | Draft → Dispatched (atomic transaction)     |
| POST   | /api/trips/:id/complete    | Dispatched → Completed (atomic transaction) |
| POST   | /api/trips/:id/cancel      | Dispatched → Cancelled (atomic transaction) |

### Maintenance
| Method | Path                       | Notes                                     |
|--------|----------------------------|-------------------------------------------|
| GET    | /api/maintenance           | `?status=Open&vehicle_id=`                |
| POST   | /api/maintenance           | Creates Open record, sets vehicle In Shop |
| POST   | /api/maintenance/:id/close | Closes record, sets vehicle Available     |

### Fuel & Expenses
| Method | Path            |
|--------|-----------------|
| GET    | /api/fuel-logs  |
| POST   | /api/fuel-logs  |
| GET    | /api/expenses   |
| POST   | /api/expenses   |

### Reports
| Method | Path                    | Notes                          |
|--------|-------------------------|--------------------------------|
| GET    | /api/reports/dashboard  | KPI counts for dashboard       |
| GET    | /api/reports/summary    | Per-vehicle cost + ROI metrics |
| GET    | /api/reports/csv        | Downloads summary as CSV       |

---

## Business Rules (enforced server-side)

All transitions run inside a single MySQL transaction.

| # | Rule |
|---|------|
| 1 | `registration_number` and `license_number` must be unique |
| 2 | Vehicles with status `Retired` or `In Shop` cannot be used in trips |
| 3 | Drivers with expired licenses or `Suspended` status cannot be assigned |
| 4 | A vehicle or driver already `On Trip` cannot be assigned again |
| 5 | `cargo_weight` cannot exceed `max_load_capacity` |
| 6 | Dispatch atomically sets vehicle + driver to `On Trip` |
| 7 | Complete requires `final_odometer` + `fuel_consumed`; updates odometer, inserts fuel log, sets both `Available` |
| 8 | Cancel reverts vehicle + driver to `Available` |
| 9 | Opening a maintenance record sets vehicle to `In Shop` |
| 10 | Closing a maintenance record sets vehicle to `Available` (unless `Retired`) |
| 11 | All status transitions are wrapped in DB transactions |

---

## Roles

| Role               | Description                            |
|--------------------|----------------------------------------|
| FleetManager       | Full access to all screens             |
| Driver             | View trips and trip status             |
| SafetyOfficer      | Maintenance and driver records         |
| FinancialAnalyst   | Fuel, expenses, and reports            |
