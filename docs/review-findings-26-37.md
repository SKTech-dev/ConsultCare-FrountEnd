# Review validation: F-26 through F-37

Reviewed against the current frontend/backend and the user's later requirements.
No environment values, database data/schema, providers or payment modes were changed.

| Finding | Current evidence and decision |
| --- | --- |
| F-26 | The reported missing label associations are not reproduced in the inspected forms. `Input.jsx` pairs label/input IDs; workspace forms generally nest their controls inside labels. Added browser checks for accessible control names and duplicate IDs on authentication, patient, doctor, lawyer and admin forms. |
| F-27 | Already handled: `IncomingConsultation.jsx` clears fallback polling on WebSocket open and effect cleanup. `setInterval` waits ten seconds before its first poll; it does not dispatch immediately. |
| F-28 | Already handled for an ordinary mounted login session: handled booking IDs remain in a ref across snapshots and renders; they reset when the account changes. A reload/remount can intentionally navigate back to an active call. |
| F-29 | Compatibility concern, not an established defect for current browsers. The drawer already has explicit Tab/Shift+Tab handling, Escape, initial focus and focus restoration, in addition to `inert`. Legacy-browser support is not claimed or polyfilled. |
| F-30 | Already handled: checkout stays busy during same-tab form navigation; exceptions restore the button and show an error. No new-tab target is set. No premature re-enabling added. |
| F-31 | Valid missing feature: no email verification or automated password recovery. Requires a delivery provider, sender configuration and account-verification/recovery policy. Not implemented in this review. |
| F-32 | Incorrect as a missing-integration claim: `app/payhere.py` contains checkout, live/sandbox URL selection and signed callback validation. Real deployment readiness is unverified. Corrected obsolete README claims; did not enable live money movement. Refund requests and professional payouts are separate from collecting payments. |
| F-33 | Valid missing malware scanning/quarantine. File type/size validation is not a malware scan. A private scanner, quarantined storage/read restrictions, retry/failure policy and existing-file handling need a dedicated implementation. No clinical/legal documents were sent to third parties. |
| F-34 | Automatic payouts are absent, but the user's newer requirement is recording payments made manually. That feature still needs its agreed workflow; do not substitute Stripe/bank integration. No paid status or actual transfer was created here. |
| F-35 | Daily video is already integrated and Daily provides relay transport. No evidence establishes that a separate TURN deployment or room-property change is needed. Corrected stale documentation; testing real restrictive networks remains necessary. |
| F-36 | Valid scaling gap: workspace still loads all visible bookings. Earlier query-count/count-scope improvements do not solve pagination. Do not silently truncate history: first add role-scoped paginated APIs and switch all history/record consumers while preserving active calls, future booked sessions and authorization. Deferred as a coordinated feature, not reported as fixed. |
| F-37 | Valid gap: audit events are recorded but there is no admin query endpoint/viewer. A dedicated admin-only, paginated viewer with action/date/actor/target filters and a safe metadata allowlist is recommended. Do not expose raw event reasons/private content indiscriminately. Not implemented here. |

## Applied changes

- Added focused Playwright checks for accessible names, duplicate IDs and clickable
  authentication labels, reusing the existing mock account setup. They make no
  backend writes or real payment requests.
- Corrected backend README claims about payment simulation routes, PayHere,
  WebSockets and scheduled maintenance.
- Corrected VIDEO-CALLS.md: completion already saves before best-effort background
  cleanup. Provider failure does not block completion, but cleanup is not guaranteed;
  durable cleanup retries remain outstanding. Added network-readiness guidance.
- No frontend runtime change was justified by F-26 through F-30. Avoided adding
  redundant labels, weakening checkout duplicate-submit protection or replacing
  working navigation behavior.

## Sources and limits

Nested controls have implicit label associations; explicit associations are also
supported. See [MDN label documentation](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/label).
Daily describes TURN relay fallback in its
[transport security documentation](https://www.daily.co/security/secure-calls/).

Browser tests do not establish full WCAG compliance or replace screen-reader,
contrast, zoom and actual-device testing. No deployed payment or real video calls
were tested. Private consultation chat is not a substitute for clinic audio, since
clinic chat is intentionally disabled.

## Follow-up decisions

1. Choose email delivery and define verification/recovery behavior, including
   existing accounts, expiring single-use tokens, abuse limits and session revocation.
2. Choose a private upload scanner and quarantine policy compatible with sensitive
   documents; do not use a public sample-sharing scanner by default.
3. Agree the manual settlement record: who marks paid, transfer date/reference,
   immutable amount snapshot, duplicate protection and correction audit trail.
4. Implement paginated history and the restricted audit viewer as separate features.
5. Verify production PayHere configuration and refund operations in a controlled
   launch checklist; do not infer deployed mode from `.env.example`.

## Verification results

- Production frontend build: passed.
- Frontend unit tests: 12 passed.
- Targeted Chromium browser tests: 7 passed (authentication labels, form accessible
  names for all four roles, mobile drawer keyboard/focus behavior, popup focus).
- The first sandboxed browser run stalled without a final report and was stopped.
  The approved rerun outside the sandbox completed successfully in 5.6 seconds.
- Diff whitespace checks passed. No full WCAG audit, legacy-browser validation,
  production configuration inspection or real provider calls were performed.
