# Consultation authentication integration

Current frontend mode: always signed in with synthetic workspaces, as requested.
See FRONTEND-PREVIEW.md for the implemented local flow. The authentication API
contract below describes future backend integration and is not active in App.jsx.

This repository implements the frontend flow. No backend was provided, and live authentication has not been verified.

Configure VITE_API_BASE_URL for the API. Requests use cookie credentials.

## Required endpoints

- POST /auth/register accepts { name, email, password, role }. Public roles: user, doctor, lawyer. Reject admin and all unknown roles server-side. Registration does not imply login. Doctor and lawyer accounts require verification.
- POST /auth/login accepts { email, password } and establishes a server session.
- GET /auth/me returns { data: { id, name, email, role, verificationStatus } }. role is user, doctor, lawyer, or admin. verificationStatus for professionals is pending, verified, or suspended. Unauthenticated requests return 401.
- POST /auth/logout invalidates the server session.

Login resolves identity through /auth/me, not through a role selected in the browser. Admin accounts must be provisioned privately. Unknown roles fail closed. Both /signup and the existing /setup route show registration.

The API must enforce roles, professional approval/suspension, and per-record ownership on every request. React route guards only control navigation; they are not a security boundary. Use secure HttpOnly session cookies and appropriate CSRF protection. The API must check passwords and validate all registration fields independently.

## Current screens

Public consultation entry pages: /consult/doctors and /consult/lawyers.
Dashboards: /dashboard, /doctor/dashboard, /lawyer/dashboard, /admin/dashboard.
These dashboards are role-specific entry screens, not completed booking, queue, or administration tools.

Legacy chatbot routes remain in the code and are restricted to admins; they are not linked from consultation navigation.
