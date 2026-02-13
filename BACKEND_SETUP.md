# Backend Setup (Vercel Postgres)

This project now includes backend APIs under `src/app/api` and uses Vercel Postgres.

## 1) Add Postgres in Vercel

1. Open your Vercel project
2. Go to `Storage` -> `Create Database` -> `Postgres`
3. Attach it to this project

Vercel will provide env vars like `POSTGRES_URL` automatically.

## 2) Configure env vars

Set these in Vercel `Settings` -> `Environment Variables`:

- `POSTGRES_URL` (auto from Vercel Postgres)
- `ADMIN_API_KEY` (your own random value)

If you use local dev with Docker/Postgres, create `.env.local`:

- `DATABASE_URL=postgres://<user>:<password>@localhost:<port>/<db>`
- `ADMIN_API_KEY=<your-random-key>`

The backend uses:

- `DATABASE_URL` for local/dev direct Postgres connections
- `POSTGRES_URL` on Vercel deployment

## 3) Initialize DB schema

Call this endpoint once after deployment:

```bash
curl -X POST "https://<your-domain>/api/admin/db/init" \
  -H "x-admin-key: <ADMIN_API_KEY>"
```

## 4) Available API routes

- `GET /api/projects` - list projects
- `POST /api/projects` - create project
- `GET /api/projects/:id` - get project
- `PATCH /api/projects/:id` - update project
- `DELETE /api/projects/:id` - delete project
- `GET /api/projects/:id/schema` - get full schema export
- `PUT /api/projects/:id/schema` - replace full schema for project

## Notes

- Current frontend still uses IndexedDB (Dexie).
- These APIs are ready for migrating frontend to server persistence next.
