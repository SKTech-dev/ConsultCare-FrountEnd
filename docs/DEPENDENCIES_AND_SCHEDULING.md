# Dependency and scheduling update — 22 September 2026

## Frontend dependencies

Upgraded Vite to 8.3, the React plugin to 6.1, React Router to 7.18,
Axios to 1.20, Redux Toolkit to 2.12 and compatible supporting dependencies.
React stays on 18.3 and Tailwind on 3.4. The committed lockfile records exact versions.
`npm audit` reports zero vulnerabilities for the installed dependency tree at this check.
This is an advisory check, not a security certification.

Use Node 22.12+ within Node 22, or Node 24+. This workstation uses Node 24.
After pulling these changes, run `npm ci`, then restart the Vite server.
The Vite configuration continues to forward `/api` and WebSockets to the backend.

The upgrades were checked against the [Vite migration guide](https://vite.dev/guide/migration)
and [React Router changelog](https://reactrouter.com/changelog). Vite 8's default build
target covers Chrome/Edge 111, Firefox 114 and Safari 16.4 or newer; test supported
customer devices before release.

## Scheduling behavior

- Offline sessions reject bookings and payment attempts on the backend.
- Calling a patient requires the scheduled time window for both legacy and weekly sessions.
- No-show actions are disabled/rejected before the session starts. An additional attendance grace period remains a business decision.
- Weekly edits reject overlaps with retained booked appointments. Existing appointment records and booked capacities remain intact; adjacent slots are allowed.
- Recurring sessions are extended automatically through the next 400 days at API startup and daily, using Sri Lankan dates. Existing overlapping/offline occurrences are preserved.
- Unpaid reservations expire after 30 minutes or session end; maintenance checks every minute while the backend is running. Paid bookings are unaffected.
- Maintenance uses the same per-professional database locks as bookings/payments, retries busy rows and failures, and stops with the API.
- An ongoing consultation that has run past its slot is shown separately in the professional queue, with a link back to its room. It continues to block another consultation until completed.

Restart the backend to activate maintenance. No schema changes or new database migrations
are needed. `SCHEDULE_MAINTENANCE_ENABLED` defaults to `true`; the worker is disabled
automatically in test environments. See the sibling backend README for operational details.

## Verification commands

```powershell
npm ci
npm test
npm run build
npm audit
npm run check:unused
```

Browser tests run against the production build with mocked API responses. They cover
signed-out redirects, all four role workspaces, future/live queue controls, overruns,
and the single approval-error popup. They do not create real accounts or bookings.

```powershell
# Use installed Chrome, as on this workstation:
$env:PLAYWRIGHT_CHANNEL='chrome'
npm run test:browser
```

Alternatively install Playwright's Chromium with `npx playwright install chromium` and
run the browser tests without `PLAYWRIGHT_CHANNEL`. Run `npm run build` before browser
tests whenever source changes; the preview server serves the existing production build.

From the backend directory, run `.\.venv\Scripts\python.exe -m pytest -q`.
Backend integration tests use only `consultcare_test`, migrate it and clear its tables.
They include real API/database/WebSocket checks plus scheduling boundaries, overlap
rollback, maintenance renewal/expiry, lock contention and worker startup/shutdown.
