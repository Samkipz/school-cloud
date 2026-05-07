# Admin Operations Guide

## Daily checks

- Open `Admin` page and confirm system cards load (users/files/uploads).
- Review recent uploads for unexpected content.
- Review media items and set approval status for marketing use.

## User management

- Go to `Admin` page.
- For each user, set the correct role (`admin`, `teacher`, `marketing`, `student`).
- Keep the number of admin users minimal.

## File governance

- Delete files only when policy requires it (sensitive/inappropriate/duplicate content).
- If metadata is wrong, edit metadata instead of deleting where possible.
- Ensure portfolio files remain linked to the right student.

## Security operations

- Never commit `.env.local`.
- Rotate credentials immediately if exposed.
- Update `CLERK_SECRET_KEY`, storage keys, and DB credentials during incident response.

## Backup and restore baseline

- Database: use Neon backup/restore workflows and scheduled snapshots.
- Object storage: use bucket versioning and lifecycle policies where available.
- Verify restore process quarterly.
