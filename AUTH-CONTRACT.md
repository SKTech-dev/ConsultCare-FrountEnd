# Authentication contract

The Python backend in ../ConsultCare-BackEnd is the authority for users, roles, verification,
and consultation ownership. All endpoints are prefixed with /api.

- POST /auth/register: { name, email, password, role }. Roles: user, doctor, lawyer.
  Password length: 12–128 characters. Admin registration is rejected.
- POST /auth/login: { email, password }. With no other active browser session,
  establishes HttpOnly cc_session and readable cc_csrf cookies and returns
  { data: user, csrfToken }. If another session is active, returns
  { requiresSessionReplacement: true, confirmationToken, message } without
  granting access or revoking the previous session.
- POST /auth/replace-session: { token: confirmationToken }. Explicitly confirms
  replacement, revokes the previous session, and returns the usual login response.
  The proof is single-use, expires after two minutes, and requires its matching
  HttpOnly cc_login_confirmation cookie. Stale prompts return 409; expired or
  invalid prompts return 401. Ask the user to sign in again.
- POST /auth/cancel-login: { token: confirmationToken }. Discards the pending
  confirmation; the previous device remains signed in.
- POST /auth/google follows the same replacement response after verifying Google
  credentials. Do not call /auth/me or navigate to a workspace until confirmation.
- GET /auth/me: { data: { id, name, email, role, verificationStatus } } or 401.
- POST /auth/logout: revokes the session and clears both cookies.

Authenticated writes require the cc_csrf value in X-CSRF-Token. Every write also
requires an allowed Origin. The Axios client handles credentials, CSRF, session expiry,
and structured error messages. No authentication token or private workspace data is
persisted in browser storage.

Use same-origin /api routing in production (and the configured Vite proxy locally).
Role guards only improve navigation; API endpoints enforce all permissions.
Missing/unknown roles fail closed. Doctors and lawyers begin pending verification.
Admin accounts are created using the backend's interactive management command.

Email changes and automated password recovery are not exposed until a verified
recovery service is implemented. Account passwords are never repurposed database
credentials.

One active browser session is allowed per account for every role. Tabs sharing
the same cookie remain one session. Reauthentication with that cookie rotates it
without a replacement prompt. The server enforces revocation on protected routes;
401 responses with X-Session-Replaced: 1 show the replacement notice. The existing
workspace live connection emits { type: "session-ended", reason: "replaced" } and
closes with code 4409, causing the UI to clear private state and leave the room.
Focus/visibility revalidation and API 401 handling also cover sleeping tabs.

Deploy the frontend and backend together after applying migration
`w117_single_session`. See the backend SINGLE-SESSION.md for migration behavior
and test commands.
