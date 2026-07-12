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

### 1. Create the database

```bash
# From the transitops/ root folder
Get-Content schema.sql | mysql -u YOUR_USER -pYOUR_PASSWORD
```

### 2. Configure environment

```bash
cd backend
copy ..\\.env.example .env
```

Edit `backend/.env`:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=transitops
JWT_SECRET=run_this_to_generate: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
PORT=3001
```

### 3. Start the servers

**Backend** (port 3001):
```bash
cd backend
npm install
npm run dev
```

**Frontend** (port 5173):
```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**

---

## Project Structure

```
transitops/
├── schema.sql                    # Run to create DB and all tables
├── .env.example                  # Env variable template (no secrets)
├── backend/
│   ├── server.js                 # Express entry point
│   ├── db.js                     # mysql2 connection pool
│   ├── middleware/
│   │   ├── auth.js               # JWT Bearer verification
│   │   └── rbac.js               # requireRole() factory
│   └── routes/
│       ├── auth.js               # /api/auth/login, /signup
│       ├── vehicles.js           # /api/vehicles (CRUD)
│       ├── drivers.js            # /api/drivers (CRUD)
│       ├── trips.js              # /api/trips + dispatch/complete/cancel
│       ├── maintenance.js        # /api/maintenance + close
│       ├── fuel.js               # /api/fuel-logs
│       ├── expenses.js           # /api/expenses
│       └── reports.js            # /api/reports (dashboard, summary, csv)
└── frontend/
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
