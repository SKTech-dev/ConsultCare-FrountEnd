# Review validation: F-14 through F-25

Reviewed against the current repositories and the user's later business rules.
Backend paths below are relative to `backEnd`.

| Finding | Decision | Action |
| --- | --- | --- |
| F-14 | Stale test, not a confirmed cancellation regression | Retain paid-appointment rescheduling rule; correct admin test |
| F-15 | Valid obsolete response assertion | Test the persisted notifications inbox and workspace summary |
| F-16 | Old receive-only requirement superseded by attendee microphones | Keep presence/audio permissions; correct test and README |
| F-17 | Invitation payment deadline is intentionally session start | No behavior change |
| F-18 | Patient overlap is already checked on rescheduling | No behavior change |
| F-19 | UI and backend consistently reject disputed-payment cancellation | No expansion of payment status allowlist |
| F-20 | Clinic completion timestamp follows bounded clinic lifecycle | No behavior change |
| F-21 | Next-person notification is already gated by live session time | No behavior change |
| F-22 | Professional lock serializes registration capacity checks | Retain locking; run concurrency integration test |
| F-23 | Acceptance rechecks eligibility/receiver, with unique pending transfer index | Retain implementation |
| F-24 | Booked sessions are included outside the 14-day discovery window | No behavior change |
| F-25 | API permits no-show only after start for WAITING/NEXT bookings | Retain rules; history UI convenience is a separate review |

## F-14: Paid cancellation

The later requirement explicitly specified that staff may cancel unpaid one-off
appointments, while paid appointments must be updated. `app/appointments.py::cancel`
and its `canCancel` output implement that rule for professionals and admins.
An emergency admin override would be a new policy, not a justified repair based
on an obsolete test. The corrected integration test expects 409, an unchanged paid
booking, `canCancel=False`, `canUpdate=True`, and no clinical data in admin output.
Patients retain their separate cancellation/refund-review flow.

## F-15: Handover notifications

The previous transient `transferNotifications` payload was replaced by the durable
notification system. The handover integration test now verifies exactly one
accepted-handover inbox entry, replacement name, shared reason, booking link, and
its presence in `notificationSummary.latest`. Staff response notes must not leak
into the patient's message. Test decision requests now provide required reasons.

## F-16: Clinic presence and microphones

The user subsequently requested that attendees can turn on their microphones,
while chat stays disabled. `app/clinic_video.py` grants attendees only microphone
publishing and starts them muted; video/screenshare remain unavailable.

Daily documents that participants with `hasPresence=False` cannot be seen or heard.
Applying the proposed change would conflict with the microphone requirement.
See [DailyParticipantPermissions](https://docs.daily.co/reference/daily-js/types/daily-participant-permissions).

Tests now expect presence and audio-only permissions, muted initial devices,
generic display names and registration-scoped IDs. The README no longer promises
hidden presence or full anonymity. Hiding the people panel is a UI choice, not a
security boundary; a voice may identify an attendee. Real Daily audio was not
tested as part of these API tests.

## F-17 and F-18: Deadlines and overlap

`app/services.py::payment_deadline` uses appointment start for one-off invitations.
Ordinary queue reservations retain their 30-minute/end-of-session deadline.
`app/appointments.py::update_time` calls `require_patient_available` on the proposed
date/time with the current booking excluded. It also checks the professional's
sessions, weekly template and clinic dates. Neither finding warrants removing or
rewriting these checks.

## F-19: Chargebacks

`chargedback` is deliberately not treated as an ordinary unpaid checkout. Both
the cancellation API and UI eligibility reject it, so the alleged mismatch is
absent. A chargeback can create a disputed booking requiring operational review;
automatically freeing its slot or changing its status requires an explicit dispute
policy. No extra cancellation permission was inferred from this finding.

## F-20 and F-21: Completion and next notifications

Clinics automatically complete at scheduled end if they started. Capping their
completion timestamp is consistent with this lifecycle and its completion-month
earnings. Private consultations can overrun and have their own completion rules.
`promote` already checks `session_is_live` before sending next-person notices.
Lazy loading inside this synchronous transaction does not establish a correctness
failure.

## F-22 and F-23: Concurrency

Clinic registration writers acquire the professional lock before checking and
consuming capacity. Transfer acceptance takes both professional locks, refreshes
the transfer, then rechecks session and receiver eligibility. The partial unique
index also prevents simultaneous pending transfers for a session. Existing
integration cases exercise capacity competition and acceptance rechecks.

## F-24 and F-25: Session visibility and no-shows

The workspace includes booked session IDs in addition to the discovery window for
patients and professionals. Thus a booked appointment beyond 14 days remains
visible. For no-shows, the API rejects future sessions and allows eligible queued
bookings after start. This alone does not prove that every history page offers an
ideal no-show action; that UI assertion was not made or changed here.

## Test maintenance

Affected integration tests still used removed payment/refund simulation routes
and the invalid database value `paid (mock)`. These fixtures now use valid `paid`
records and local requests to real checkout and signed callback handlers.
`tests/payment_helpers.py` signs callbacks using test-only credentials; it never
contacts PayHere or adds a simulated-payment route to the application.
Tests for removed simulation routes expect 404. Cancellation requests supply
the reasons now required by the API. The old paid-clinic staff-cancellation test
now covers rejection plus patient refund review without claiming a refund was sent.
The invitation deadline test checks that checkout is rejected at session start,
then verifies persistence through the locked maintenance expiry operation. It does
not assume that changes in a rejected checkout transaction are committed.

No database schema, real payment behavior, cookie configuration, or manual payout
feature is changed by this batch.

## Verification

- The targeted appointment, handover and clinic integration run completed with
  31 passing tests and the stale expiry assertion failing. After correcting that
  assertion as described above, its isolated rerun passed: all 32 targeted cases
  have now passed, across the two runs.
- Both runs used newly created disposable PostgreSQL databases, which the runner
  removed afterward. Existing ConsultCare data was not modified.
- Offline unit tests: 33 passed. Ruff checks on the changed Python files passed.
- The integration runner reported existing Starlette/httpx and AnyIO deprecation
  warnings. No dependency changes were made for these warnings.
- This was targeted verification, not a full-suite or browser test. Actual PayHere
  transactions and Daily audio/video behavior were not exercised.
