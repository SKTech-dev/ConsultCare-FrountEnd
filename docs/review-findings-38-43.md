# Review validation: F-38 through F-43

| Finding | Verdict | Action |
| --- | --- | --- |
| F-38 | Valid stale settlement fixtures | Use `paid`, `refunded` and `failed`, not obsolete mock-status strings; add a PostgreSQL constraint rejection regression test. |
| F-39 | Partly addressed in previous batch, additional coverage valid | Clinic integration tests already call signed local PayHere callbacks. Add offline clinic-specific callback tests for successful confirmation, late/expired/cancelled seats, unavailable clinics, chargeback, pending/failure/cancellation, final-state replays, invalid signatures/amounts and stale orders after locking. |
| F-40 | Incorrect for the stated September 2026 review date | Keep Python 3.14. Python 3.14.0 was released October 7, 2025; PostgreSQL 18 on September 25, 2025. A version downgrade is not justified by this finding. |
| F-41 | Already guarded | Add a development-only notice to `.env.example`; production security validation remains unchanged. No actual environment values modified. |
| F-42 | Valid readiness gap | Health now checks actual Alembic heads against packaged migration heads, returning generic 503 on mismatch or database/check failure. No automatic migration/stamping. |
| F-43 | Not a defect | Dockerfile already provides a backend deployment artifact. Compose/Kubernetes is not required simply because Netlify config exists. No orchestration platform introduced. |

## Clarifications

SQLAlchemy does not bypass PostgreSQL CHECK constraints. An invalid payment status
fails when its INSERT is executed, including an ORM flush during commit; ordinary
transaction isolation does not turn off CHECK enforcement. The settlement fixture
was wrong, not a special ORM validation mode. The one remaining `paid (mock)` in
the settlement test is deliberately invalid input for the rejection regression.

The previous recommendations to loosen paid cancellation, hide clinic audio
participants, extend join tokens, or assume PayHere is absent are not reapplied.
See the earlier review reports for the current workflow and evidence. Manual
settlement recording remains a separate agreed feature, not an automatic payout
provider integration.

The settlement API still exposes the legacy `testPayments: true` metadata field.
This is not evidence that deployed PayHere checkout is sandboxed; per-transaction
payment-mode provenance and financial reporting need a separate review. No live
merchant settings or financial-state transitions were changed here.

## Readiness scope

`app/readiness.py` uses Alembic's `MigrationContext.get_current_heads()` and
`ScriptDirectory.get_heads()` with exact set comparison (including multiple heads).
Migration files are resolved relative to the application, not the shell's working
directory. Expected heads are cached for the immutable application process; actual
database heads are checked on each request.

Tests cover a missing version table, empty version table, behind/unknown/extra
revisions, matching multiple heads and sanitized endpoint responses. Matching
revision IDs is not proof against manual schema drift or improper `alembic stamp`.
Health does not repair schemas, expose revision IDs/credentials, or execute a
migration. Exact readiness requires coordinated migration/traffic cutover during
rolling deployments; see the backend README.

## Sources

- [Python 3.14.0 release](https://www.python.org/downloads/release/python-3140/)
- [PostgreSQL 18 release](https://www.postgresql.org/about/news/postgresql-18-released-3142/)
- [Alembic cookbook: checking whether a database is up to date](https://alembic.sqlalchemy.org/en/latest/cookbook.html)

## Verification

- Offline backend unit tests: 43 passed, including the new clinic callback and
  readiness cases.
- Isolated PostgreSQL integration tests: 6 passed (settlement suite plus current
  migrated health endpoint). The generated test database was removed afterward.
  The invalid-status test confirmed PostgreSQL's `ck_payment_status` rejection.
- Ruff and diff whitespace checks passed.
- Docker CLI is installed, but the Docker daemon is unavailable. An image build
  was not verified; the release-date correction alone is not a container-build test.
- Existing Starlette/httpx and AnyIO deprecation warnings remain. No dependency
  upgrade or CVE scan was performed in this batch.
- No application data, actual environment secrets, database migrations, live
  provider calls or deployment settings were changed. `.env.example` changes
  only add comments; the health endpoint behavior is the runtime change to deploy.
