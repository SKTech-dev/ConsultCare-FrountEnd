# Development and production deployment

Use `development` for development and `main` for production in both Git repositories.
No extra `prod` Git branch is needed. Neon database branch names are independent
of Git; backend environment variables choose the database.

| Git branch | Netlify site | Railway environment | Neon branch |
| --- | --- | --- | --- |
| development | consultcare-dev | development | development |
| main | consultcare-prod | production | production |

## Netlify setup

1. Keep the existing site for its intended environment. Create a second site
   importing `SKTech-dev/ConsultCare-FrountEnd`.
2. In each site's Build & deploy settings, select its production branch:
   `development` for the dev site, `main` for the prod site. Netlify calls the
   default branch of each site its production branch, including the dev site.
3. Use repository root as base, `npm run build:netlify` as build command,
   `dist` as publish directory, and Node 24. netlify.toml sets command and directory.
4. Set these build-scope variables separately on each site:

   | Variable | Dev site | Prod site |
   | --- | --- | --- |
   | VITE_API_BASE_URL | /api | /api |
   | BACKEND_ORIGIN | https://YOUR-DEV-API.up.railway.app | https://YOUR-PROD-API.up.railway.app |

   BACKEND_ORIGIN is the backend origin only, without `/api`. Keep all database,
   payment, and storage credentials on the backend; never put them in VITE variables.
5. Initially disable branch deploys and Deploy Previews on both sites, so feature
   previews do not inherit production API settings. Add previews later with a
   development API and corresponding allowed frontend origins.
6. Keep automatic publishing enabled. Set FRONTEND_ORIGINS on the matching
   Railway backend to the exact HTTPS frontend origin before testing login.
7. Redeploy after changing build variables. Visit `https://YOUR-SITE/api/health`:
   expect HTTP 200 and JSON. Test client-side navigation and a refreshed deep link.

The build writes dist/_redirects with API proxy first and SPA fallback second.
Missing/invalid BACKEND_ORIGIN fails deployment. There is no production fallback.
Local `npm run dev` and `npm run build` do not need BACKEND_ORIGIN. The script reads
process environment variables supplied by Netlify, not local dotenv files.

## Backend and release order

Follow the companion backend's DEPLOYMENT.md for Neon and Railway setup.
For paired releases, merge and verify the backward-compatible backend first,
then merge the frontend. These repositories deploy independently.

CI uses companion main for PRs targeting main and pushes to main, and companion
development for pushes to development. Stale companion-ref Actions variables are
ignored for these runs. Feature PRs retain explicit paired-ref overrides and
matching-branch selection with a fallback to their target branch.

Official references:
- https://docs.netlify.com/deploy/deploy-overview/
- https://docs.netlify.com/build/environment-variables/overview/
- https://docs.netlify.com/configure-builds/environment-variables
