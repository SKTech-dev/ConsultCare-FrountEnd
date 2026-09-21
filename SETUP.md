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

## Monthly settlements and professional earnings

Admin: open **Monthly settlements** (`/app/settlements`). Expand a month, then
Doctors or Lawyers. Each level shows its total; select a professional to see the
patient/client payments behind that month.

Doctor/lawyer: open **My earnings** (`/app/earnings`) and select a month to view
payment dates, times, names and amounts. Only your own earnings are accessible.

Months follow consultation completion in Sri Lanka time. The institution takes
no commission. Reports currently show simulated patient payments, clearly labeled.
The **Pay professional** button is a placeholder: no money moves and the month
stays unpaid. Integrating a payout provider is a separate next step.

Apply backend migrations before running the updated app:

```powershell
cd ..\backEnd
.\.venv\Scripts\python.exe -m alembic upgrade head
```
