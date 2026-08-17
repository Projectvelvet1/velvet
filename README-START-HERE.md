# Project Velvet — start here

1. Read **HANDOFF.md** (full memory, rules, connections, schema, service state, Lovable notes).
2. Database: run everything in **sql/** in numeric order (velvet-01 … velvet-27), then the GSC/forms tables. All idempotent.
3. Reference: **docs/** has the blueprint (with figures), the GSC setup guide, and the state file.
4. The app itself: standard Next.js 14. `npm install`, set the env vars listed in HANDOFF.md section 3, `npm run build`.

This zip contains the WHOLE project: app code + all SQL + all reference docs + this handoff.
