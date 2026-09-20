# Connected application

The backend is in ../backEnd. Its README includes database setup, migrations,
administrator provisioning, production configuration, and API documentation.

Start the backend:

```powershell
cd ..\backEnd
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

In another terminal, from this frontend folder:

```powershell
npm.cmd run dev
```

Open http://localhost:5173. Register a patient or professional account.
Administrator accounts must be created with the backend's create-admin command;
there are no default credentials. The demo login bypass is removed.

The frontend defaults to /api and Vite proxies to localhost:8000. No database
passwords or other secrets belong in VITE_ environment variables.

Checks: node --test tests/*.test.js and npm.cmd run build.
