# API-connected frontend

The earlier always-signed-in demo has been replaced by authenticated API access.
There is no role switcher and the application no longer reads or writes the old
localStorage workspace or IndexedDB demo files.

Start the Python backend in ../backEnd, then run npm.cmd run dev here. Open
http://localhost:5173 and register or log in. Use the same host consistently;
Vite proxies /api to 127.0.0.1:8000.

Professional signup requires completion of the profile and administrator approval
before sessions can be published. The initial admin is provisioned with the backend's
interactive create-admin command. There are no shared or default credentials.

Patients see their own bookings, queue position, documents, and history. Professionals
see their own consultations; admins see operational data and account-management tools.
Permissions are enforced by the API, not just by React.

Queue/chat state refreshes from the API every five seconds and after successful
writes. Documents are uploaded/downloaded through authenticated API endpoints.
Private professional notes are never included in patient responses.

Local development enables mock checkout explicitly. Production settings disable it.
The room still has a local camera preview; remote video calls and a real payment
provider require their next integrations. See ../backEnd/README.md for full setup,
migrations, tests, and deployment boundaries.
