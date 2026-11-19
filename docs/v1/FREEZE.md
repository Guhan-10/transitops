# Step 0.1 — Freeze v1

Goal: keep an exact, restorable record of v1 before any v2 change ships.

| Item | How | Status |
|------|-----|--------|
| Endpoint list | [ENDPOINTS.md](ENDPOINTS.md) (30 endpoints) | Done |
| Database dump | `scripts/db/dump.sh` against the v1 database | To do: needs access to the v1 database |
| Restore check | `scripts/db/verify-restore.sh` restores into an empty DB and compares row counts | To do: run after the dump |
| Screenshots of all 8 pages | Login, Dashboard, Vehicles, Drivers, Trips, Maintenance, Fuel & Expenses, Reports → save in `docs/v1/screenshots/` | To do |
| Tag `v1.0.0` | On the last v1 commit, **before** the Stage 0 changes are committed | To do |

## Commands

```bash
DB_HOST=localhost DB_PORT=3306 DB_USER=root DB_PASSWORD=... DB_NAME=transitops scripts/db/dump.sh
```

```bash
DB_HOST=localhost DB_PORT=3306 DB_USER=root DB_PASSWORD=... scripts/db/verify-restore.sh backups/transitops-<stamp>.sql
```

Dumps go to `backups/`, which is git-ignored because they contain password hashes and
driver personal data. Keep a copy somewhere private (not in the repository).

Tag the v1 commit (run before committing the Stage 0 work, or pass the v1 commit hash):

```bash
git tag -a v1.0.0 -m "TransitOps v1 — frozen before v2" && git push origin v1.0.0
```

## Verification and validation (from the v2 plan)

- Verified: tag `v1.0.0` exists; the dump restores into an empty database with the same row counts.
- Validated: you confirm the screenshots match how v1 behaves today.
