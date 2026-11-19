# Step 0.3 — Hosting the backend and database

Frontend: GitHub Pages at `https://<github-user>.github.io/transitops/` (built by CI).
Backend: any Node 22 host that offers a **deploy hook URL** (Render is one example).
Database: any **managed MySQL 8** service (Aiven for MySQL is one example).

The repository must be named `transitops` for the Pages path to match `base` in
`frontend/vite.config.js`. If it is named differently, change `base` to `/<repo-name>/`.

## 1. Database

1. Create a managed MySQL 8 instance. Note host, port, user, password, and whether TLS is required
   (it almost always is: set `DB_SSL=true`). If the provider gives you a CA certificate, keep its PEM text
   for `DB_SSL_CA`.
2. Load the schema. `schema.sql` creates and uses a database named `transitops`; if your provider only
   allows a fixed database name (e.g. `defaultdb`), delete the first two statements and run the rest against it.
   ```bash
   mysql -h <host> -P <port> -u <user> -p --ssl-mode=REQUIRED < schema.sql
   ```

## 2. Backend

Create a web service from this repository:

| Setting | Value |
|---------|-------|
| Root directory | `backend` |
| Build command | `npm ci --omit=dev` |
| Start command | `npm start` |
| Health check path | `/api/health` |
| Auto-deploy | **Off**: CI deploys it only after the tests pass |

Environment variables (store as secrets on the host, never in the repository):

| Variable | Value |
|----------|-------|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | From step 1 |
| `DB_SSL` | `true` |
| `DB_SSL_CA` | Provider CA certificate (PEM), if it has one |
| `JWT_SECRET` | `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `CORS_ORIGIN` | `https://<github-user>.github.io` |
| `PORT` | Usually set by the host; otherwise `3001` |

Copy the service's **deploy hook URL**.

## 3. GitHub repository settings

| Where | Name | Value |
|-------|------|-------|
| Settings → Secrets and variables → Actions → **Variables** | `VITE_API_URL` | Backend origin, e.g. `https://transitops-api.onrender.com` (no `/api`, no trailing slash) |
| Settings → Secrets and variables → Actions → **Secrets** | `BACKEND_DEPLOY_HOOK` | The deploy hook URL from step 2 |
| Settings → Pages | Source | Deploy from branch `gh-pages` |
| Settings → Branches → rule for `main` | Required status checks | `Backend tests (Jest + Supertest)` and `Frontend build` |

## 4. Check it

- Verify: `curl -i https://<backend>/api/health` returns `200` and `{"status":"ok","db":"up"}`.
- Verify: open `https://<github-user>.github.io/transitops/vehicles` directly. It should load the app
  (the 404.html fallback) and send you to the login page under `/transitops/`.
- Validate: on your phone, sign up, log in on the Pages site, and create a vehicle.
  (Public sign-up is still open in v1; Stage 1.3 replaces it with a setup command and invites.)

## How CI deploys (step 0.4)

`.github/workflows/ci.yml` runs on every pull request and every push to `main`:

1. **Backend tests**: Jest + Supertest against a throwaway MySQL service container (`transitops_test`).
2. **Frontend build**: clean `npm ci` and `vite build` with `VITE_API_URL`.
3. **Deploy** (push to `main` only, and only if 1 and 2 passed): publishes `frontend/dist` to `gh-pages`
   and calls `BACKEND_DEPLOY_HOOK`.

To check the gate, open a pull request that breaks one test: the checks go red, and merging
it would not deploy, because the deploy job needs both jobs to pass.
