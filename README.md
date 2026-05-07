
# School Cloud Dashboard UI

A centralized, searchable, role-based school file system built with Next.js, Drizzle, Neon Postgres, S3-compatible object storage, and Clerk authentication.

Original design: https://www.figma.com/design/jabbuGbKdcZl1AEjTur0RQ/School-Cloud-Dashboard-UI

## Core modules

- Authentication and RBAC (Clerk + app roles)
- File Management (signed uploads, metadata, download, delete, edit)
- Student Portfolios (student records and linked portfolio assets)
- Staff Resources
- Media Library with moderation workflow
- Admin Dashboard (system overview, user role management, upload monitoring)
- Search and filters (module, mime type, approval, tags, student)

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Create local env file from template:

```bash
cp .env.example .env.local
```

3. Configure required environment variables in `.env.local`:

- `DATABASE_URL`
- `STORAGE_BUCKET`
- `STORAGE_REGION`
- `STORAGE_ENDPOINT`
- `STORAGE_ACCESS_KEY_ID`
- `STORAGE_SECRET_ACCESS_KEY`
- `STORAGE_PUBLIC_BASE_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

4. Apply database migration:

```bash
npm run db:migrate
```

5. Seed demo data:

```bash
npm run db:seed
```

6. Start development server:

```bash
npm run dev
```

7. Open the app URL shown in terminal (usually `http://localhost:3000` or `http://localhost:3001`).

## Role matrix

- Admin: full control (manage users, delete any file, approve/reject media, system monitoring).
- Teacher: upload/manage own content, portfolio uploads with student linking, resource access.
- Marketing: media/resource access, media moderation actions.
- Student: portfolio reading scope (future-facing role for student portal).

## Metadata rules

- Every upload must include at least one tag.
- Portfolio uploads require a linked student.
- Media uploads use approval status (`raw`, `approved`, `rejected`).

## Primary API routes

- `GET /api/health`
- `GET /api/dashboard/overview`
- `GET /api/search?q=biology&module=portfolio&tag=Grade%2010&page=1&limit=20`
- `POST /api/uploads/sign`
- `POST /api/assets`
- `GET|PATCH|DELETE /api/assets/:id`
- `GET /api/assets/:id/download`
- `GET|POST /api/students`
- `PATCH /api/students/:id`
- `GET /api/students/:id/portfolio`
- `GET /api/admin/overview`
- `GET|POST /api/admin/users`
- `PATCH /api/admin/users/:id`
- `GET /api/admin/uploads`

## Operations and handover docs

See the `docs/` folder:

- `docs/admin-operations.md`
- `docs/teacher-quick-start.md`
- `docs/deployment-checklist.md`
- `docs/incident-credential-rotation.md`
  # school-cloud
