# Project review — 21 September 2026

## Assessment

The project has a useful consultation-workflow foundation, but is not ready for a public, paid-consultation launch. This source review covered the frontend and relevant sibling backend paths. It is not a penetration test or an end-to-end test of every role/device. No backend changes were made in this cleanup.

Good foundations include server-authoritative roles and fees, cookie authentication/CSRF protection, password hashing, database constraints and migrations, professional verification, private-attachment access checks and monthly earnings views.

## Implemented cleanup

- Removed 23 disconnected legacy files: chatbot/WhatsApp/knowledge-base screens, old payment and unused password-reset screens, obsolete components and an unused image. These are recoverable through Git; active consultation screens remain intact.
- Removed the chatbot Redux reducer and unused session command exports; preserved the Redux theme and shared UI.
- Renamed package metadata and added test/unused-file-check commands.
- Successful writes no longer report failure merely because the following workspace refresh fails. Users receive a saved-but-refresh-failed notice.
- Added document upload success/error popups, document/prescription download progress labels and duplicate-download protection.
- Improved shared loader accessibility and corrected an undefined theme-color reference.
- Prevented blocked onboarding destinations from mounting their content and suppressed duplicate redirect handling for the same location.
- Matched the queue busy check to the backend's one-active-consultation-per-professional rule across all sessions.

## Prioritized developer recommendations

| Priority | Finding and evidence | Next action |
| --- | --- | --- |
| Before launch | `src/pages/workspace/Room.jsx` only implements local camera preview. | Connect real remote video, secure signaling, reconnect/error states; test two physical devices. |
| Before launch | Payments/refunds are simulations; monthly payout action is a placeholder. | Choose a provider before integration. Add verified callbacks, idempotency, ledger and reconciliation. Never mark payouts paid just from a button click. |
| Before launch | Dependency audit reports 16 affected packages: 11 high, 3 moderate, 2 low, including Vite, router, Axios and transitive tooling. | Upgrade in a controlled change with regression tests. Some findings are development/Node-only and do not prove browser exploitability. Some fixes require a major Vite upgrade. Do not expose the dev server publicly. |
| High | Backend `app/routes.py:create_booking` calls `services.valid_session`, which checks expiry but not the online flag. | Reject offline sessions server-side and test direct API requests. |
| High | Consultation-start timing is conditional on `is_weekly_occurrence`; no-show transition checks status without a start/grace-time check. | Unify old/recurring session rules and enforce the agreed no-show policy in both API and UI. |
| High | `app/services.py` materializes 400 days only when weekly availability is saved; no scheduled replenishment call was found. | Add an idempotent scheduled horizon-extension job with monitoring. |
| High | Weekly replacement retains booked occurrences; pending reservation expiry runs on booking/payment activity. | Validate new templates against retained dated sessions and expire reservations through a background job. Test overlap and concurrency. |
| High | Ended sessions disappear from upcoming queues even if a consultation is active. | Keep an explicit ongoing/overrun entry so the professional can finish it and release their global busy state. |
| High | `app/live.py` repeatedly rebuilds workspace snapshots including growing history. | Paginate history, reduce repeated queries, send scoped changes and add socket limits/backpressure/load tests. |
| Medium | Large page components mix data access, workflow rules and markup; no lint script is configured. | Extract focused components/domain hooks, introduce lint/type checks incrementally and run checks in CI. |
| Medium | Attachments are database blobs; preview errors are silent. | Plan private object storage, quotas, malware scanning, explicit preview failure/retry and retention policies. Preserve private/shared access controls. |
| Medium | Prescription PDFs use current issuer identity fields; no amendment workflow. | Snapshot issuer details at issuance and support audited corrections without overwriting originals. Test PDF fonts for supported languages. |
| Medium | No active secure self-service password recovery flow. | Add verified recovery, abuse protection and stronger administrator authentication. |

## Loading and feedback audit

| Flow | Current coverage | Remaining work |
| --- | --- | --- |
| Workspace startup | Shared loader, error and retry/sign-out | Test offline launch and expired sessions. |
| Profile, bookings, schedules, status | Pending overlay and centralized feedback | Prefer action-scoped busy states and avoid stacked overlays. |
| Chat | Saved messages and global pending/error handling | Replace blocking full-screen save with local sending/failed/retry states. |
| Documents | Upload busy state/popups and download progress | Add image-preview loading/failure/retry. |
| Prescriptions | Save busy/error and download progress | End-to-end PDF content/language validation. |
| Monthly earnings | Loading text, fetch-error retry and periodic refresh | Add inline spinner/skeleton and last-updated indication. |
| Authentication | Pending disabled submit and contextual errors | Keyboard testing, recovery and session-expiry messaging. |
| Onboarding | Required-step redirect and attempted-navigation notice | Intercept blocked navigation before unsaved forms unmount; test initial arrival, Back/Forward and setup transitions. |
| Shared popups | Reusable overlay | Dialog semantics, focus trap, Escape and focus restoration. |

Not every operation needs a popup. Every async action needs understandable pending/error states and safe retry. Field validation should stay next to fields; success can use a lightweight toast; destructive actions need confirmation. Full browser verification remains necessary.

## Business-owner recommendations

1. **Pilot scope:** decide whether to launch doctors or lawyers first, or staff both services. Confirm provider availability and operational ownership.
2. **Attendance policy:** define cancellation deadlines, provider cancellation, no-show grace periods, late arrivals, overruns, rescheduling and refund eligibility before coding consequences.
3. **Monthly money rules:** retain full professional fees for now; decide who absorbs processing costs, payout date, completion-month cutoff, failed payouts and refunds after settlement. Separate gross, refunded, payable and paid totals.
4. **Trust:** define credential checks, expiry/reverification, suspension and appeals. Public registration is acceptable only with server-controlled approval before consulting.
5. **Privacy:** obtain country-specific professional/legal review of consent, confidentiality, retention and emergency-use wording. Clarify doctor-versus-lawyer profile sharing. This review is not legal advice.
6. **Queue expectations:** show estimated rather than guaranteed times, delays and live connection status. Base estimates on actual session progress, not only equal division of the session.
7. **Family use:** distinguish saved family professionals from booking for dependents. Dependent accounts would need separate identity, consent and record permissions.
8. **Operations:** publish a monitored contact route for failed calls, disputes and complaints; this does not require restoring the removed in-app support feature.
9. **Metrics:** track completion, wait times, cancellation/no-show rate, failed calls, repeat bookings and unsettled balances without recording sensitive consultation data in analytics.
10. **Release gates:** run a supervised pilot and rehearse backup restoration, downtime recovery and payout reconciliation.

## Verification and maintenance

Frontend tests, production build and the static unused-file check pass. The graph reports zero disconnected source files, but does not prove every export or CSS selector is used. Dependency upgrades were not applied automatically. Backend integration tests and full role/device browser testing were not rerun for this cleanup.

Use `npm test`, `npm run build` and `npm run check:unused`. The latter is a heuristic; verify dynamic references before deleting files. Run `npm ci` and `npm run dev` for development with the backend on port 8000; Vite proxies `/api` HTTP/WebSocket requests. Production needs HTTPS, SPA fallback and its own API/WebSocket proxy, not the development server. Never put backend secrets in frontend environment variables.

Suggested order: dependency upgrades/CI → server scheduling invariants → browser/accessibility coverage → remote video → payments and reconciliation → supervised pilot. Keep financial and attendance behavior changes behind agreed business policies.
