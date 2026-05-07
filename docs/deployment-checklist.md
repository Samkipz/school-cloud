# Deployment and Environment Checklist

## Pre-deploy

- Confirm latest migration SQL is applied.
- Confirm seed data is not used in production.
- Verify Clerk keys are environment-specific.
- Verify storage bucket and CORS policy for signed uploads.

## Required environment variables

- `DATABASE_URL`
- `STORAGE_BUCKET`
- `STORAGE_REGION`
- `STORAGE_ENDPOINT`
- `STORAGE_ACCESS_KEY_ID`
- `STORAGE_SECRET_ACCESS_KEY`
- `STORAGE_PUBLIC_BASE_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

## Post-deploy smoke tests

- Sign in flow works.
- Upload + metadata save works.
- Download link generation works.
- Search endpoint returns results.
- Admin dashboard loads overview/users/uploads.

## Rollback plan

- Revert to previous release.
- Re-apply previous environment variables.
- Validate DB compatibility before rollback if migration changed schema.
