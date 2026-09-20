# Authentication contract

The Python backend in ../backEnd is the authority for users, roles, verification,
and consultation ownership. All endpoints are prefixed with /api.

- POST /auth/register: { name, email, password, role }. Roles: user, doctor, lawyer.
  Password length: 12–128 characters. Admin registration is rejected.
- POST /auth/login: { email, password }. Establishes an HttpOnly cc_session cookie
  and a readable cc_csrf cookie; returns { data: user, csrfToken }.
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
