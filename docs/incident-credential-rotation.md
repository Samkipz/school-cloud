# Incident and Credential Rotation Runbook

## When to trigger

- Secrets exposed in repository/chat/screenshots.
- Unauthorized access suspected.
- Unexpected upload/delete activity.

## Immediate response

1. Disable compromised keys:
   - Storage access key
   - Database credentials
   - Clerk secret key
2. Issue replacements and update deployment env vars.
3. Restart application services.
4. Verify sign-in, upload, and API health.

## Audit steps

- Review recent uploads and deletions.
- Review user role changes.
- Export and store incident timeline.

## Recovery validation

- Admin dashboard loads and metrics are sane.
- Upload and download operations pass.
- No hardcoded credentials remain in source control.
