# Review validation: F-01 through F-13

Reviewed against the local frontend and backend on 2026-09-29. This covers the
13 supplied findings, not an independent certification of the entire application.
Paths starting with `app/` and `unit_tests/` refer to the backend repository.

## Individual decisions

| Finding | Verdict | Action |
| --- | --- | --- |
| F-01 | Valid query-efficiency issue; reported query count is overstated | Fixed |
| F-02 | Incorrect claim about SQLAlchemy's refresh API | Retained existing locks |
| F-03 | Claimed mid-call expiry/rejoin failure is not established | Retained short-lived join tokens |
| F-04 | Valid unnecessarily broad aggregation | Fixed |
| F-05 | No current defect; model supplies UUID default | No change |
| F-06 | Gateway protocol requirement, not a demonstrated forgery | Retained provider-compatible verification |
| F-07 | Existing stream revalidates session/account repeatedly | No change |
| F-08 | Correct private-file authorization | Added explanatory comment |
| F-09 | Valid preventive improvement on rejection path | Removed rejection-path commit |
| F-10 | Intentional separate-site deployment behavior | No change, as requested |
| F-11 | Concurrent duplicate registrations already handled | No change |
| F-12 | Exact origin allowlist already blocks path injection | No change |
| F-13 | Report does not match current admin workspace payload | Retained permissions; added regression coverage |

### F-01: Appointment list lookups

`app/appointments.py::appointments` previously called `db.get(User, ...)` inside
the page loop for the conducting professional and original scheduler. SQLAlchemy's
identity map can reuse already-loaded users, so this is not necessarily two new
queries per row. The endpoint is also paginated at 30 items, not an unbounded admin
list. Nevertheless, distinct users can cause additional round trips.

The page query now joins two aliases of `users` and selects their names. This
preserves different scheduler/conducting-professional names after handover and
avoids fetching full user objects just for display labels. Existing filters,
authorization, counts and pagination stay in place.

The new isolated database test compares one appointment against ten with distinct
professionals and schedulers: both use six SQL statements and return correct names.

### F-02: Handover row locking

`app/transfers.py::decide` locks both professionals in sorted order and then calls
`db.refresh(row, with_for_update=True)`. The installed SQLAlchemy implementation
explicitly supports this argument, expires the instance itself, and passes the
lock option to its reload query. The report's claim that the argument is silently
ignored is false. Replacing it with an ordinary ORM select can also require
`populate_existing` to refresh an already-loaded identity correctly.

No locking change was made. Reference:
[SQLAlchemy Session.refresh](https://docs.sqlalchemy.org/en/20/orm/session_api.html#sqlalchemy.orm.Session.refresh).
Actual concurrent PostgreSQL acceptance was not executed in this review.

### F-03: Daily token expiry

`app/video.py::join_video` gives participants a five-minute entry token with
`eject_at_token_exp=False`. Entry expiry does not itself eject an established call.
`src/components/workspace/VideoCall.jsx` makes a new authenticated POST on every
join/rejoin attempt; `join_video` rechecks booking access/status and requests a new
token even when reusing a room. It does not repeatedly reuse the original expired
token as the report assumes.

A user who stays in the prejoin screen for more than five minutes may need to use
Rejoin to obtain a new token. That is a possible UX tradeoff, not evidence that
normal calls end at five minutes. No four-hour bearer token extension was applied.
Reference: [Daily meeting token documentation](https://docs.daily.co/reference/rest-api/meeting-tokens/create-meeting-token).
Real Daily reconnect behavior was not exercised.

### F-04: Workspace capacity aggregation

`app/presenters.py::workspace_json` previously grouped bookings across every
session. It now loads the visible session rows once and limits the occupancy
aggregation to those session IDs. An empty visible set skips the count query.

Counts still include all patients occupying those sessions, not merely the viewing
patient's bookings. Booked historical sessions remain visible as before. Tests
verify this behavior and exclusion of unrelated historical sessions. This does
not paginate all other workspace data or establish a 500ms production benchmark.

### F-05: Audit identifiers

`AuditEvent.id` has a Python UUID default. Direct authentication audit inserts are
valid. The services helper allocates an ID earlier because notification dedupe
keys need it before flush; authentication events do not currently need that.
There is no missing-ID failure to fix.

### F-06: PayHere checksum

`app/payhere.py` follows PayHere's prescribed MD5-based checksum construction;
this construction is not HMAC-MD5. General MD5 collision concerns do not establish
an exploitable notification forgery for these constrained fields and a secret.
The code additionally checks merchant identity, amount, currency, order state and
uses constant-time comparison. Do not substitute a different hash algorithm.

No inbound IP allowlist was introduced: the submitted report supplies no verified
provider callback address ranges or supported operational policy. Blocking valid
callbacks would break payment confirmation. Reference:
[PayHere Checkout API](https://support.payhere.lk/api-%26-mobile-sdk/checkout-api).

### F-07: WebSocket authorization

`app/live.py::snapshot` checks session expiry and account status for each refresh.
Logout deletes the session, and login deletes the previous session identified by
the browser cookie. Subsequent socket refreshes reject that deleted session.
Cookies belong to the initial WebSocket handshake; a new connection uses current
cookies. The roughly two-second invalidation delay is the existing polling design.

### F-08: Private attachments

`app/routes.py::download_document` intentionally requires the viewer to be both
the current professional and the original uploader of a private attachment.
The OR between the two inequality checks implements that rule correctly.
`app/presenters.py::booking_json` uses the corresponding positive AND check.
Changing the deny check to AND would weaken access control. Added a comment
explaining the existing rule; permissions are unchanged.

### F-09: Rate-limit transaction boundary

`app/security.py::rate_limit` committed before raising HTTP 429 even though that
branch had not incremented the counter. Removed that commit. `get_db` already
rolls back when the exception propagates, releasing the row lock. Tests cover
rejection, allowed increments and window reset.

The successful branch intentionally still commits the attempt so failed logins
remain counted. Current callers invoke throttling before business mutations.
This helper must continue to be called before staging business changes; isolating
the limiter into its own transaction would be a separate refactor.

### F-10: Cross-site cookies

Kept `SameSite=None` with secure cookies and the existing Origin and session-bound
CSRF-header checks. This supports the Netlify/Railway separate-site deployment.
Different subdomains are not automatically cross-site; origin and site are
different browser concepts. No environment or authentication configuration changed.

### F-11: Registration race

`app/auth.py::register` handles the database uniqueness failure, rolls back, checks
the duplicate email and returns 409. Registration does not create a login session.
Existing workflow regression tests cover duplicate/concurrent-insert handling.

### F-12: Payment return origin

`app/payhere.py::return_url` requires an exact match to an allowed origin before
constructing the destination. A path suffix or lookalike host fails that match.
Existing tests cover attacker domains and path-bearing origins. No change needed.

### F-13: Patient profile privacy

The admin's `patients` list is already built with only id, name, email and status;
the admin `patient` object is empty. `patient_json` supplies the patient's own
profile, and professional consultation context selects medical versus legal
information by profession. The report's admin full-profile claim does not match
the current code. A new database-backed offline test protects the admin payload.

## Verification and scope

- 33 tests passed with `python -m unittest discover -s unit_tests -v`.
- 8 video unit tests passed with `python -m unittest discover -s tests -p test_video_unit.py -v`.
- Query tests use a disposable in-memory SQLite database with copied table
  metadata. They validate result content and query counts, not PostgreSQL locking
  or production latency. Production schema and ORM mappings were not changed.
- External provider calls are mocked. No live database, payment or video service
  was contacted. No migration, secret, deployment or frontend behavior changed.
- These changes do not implement the separately discussed manual payout feature.
