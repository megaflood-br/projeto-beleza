<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

MegaBeauty is a single Next.js 16 (App Router, Turbopack) + Prisma + SQLite app. There is only one service to run. Standard commands live in `README.md` and `package.json` scripts (`dev`, `lint`, `test`, `build`, `db:push`, `db:seed`, `db:reset`). Non-obvious notes for this environment:

- The update script only runs `npm install` (which triggers `prisma generate` via `postinstall`). It intentionally does not touch `.env` or the database, because those are one-off setup artifacts that persist in the VM snapshot.
- Required env: `.env` (gitignored) must exist with a real `AUTH_SECRET` — `src/lib/auth.ts` throws if it's unset. If `.env` is missing, recreate it from `.env.example` and set `AUTH_SECRET` (e.g. `openssl rand -base64 32`). `DATABASE_URL="file:./dev.db"` is the dev default.
- Database: SQLite file at `prisma/dev.db` (gitignored). If it's missing/empty, run `npx prisma db push` then `npm run db:seed`. Do NOT reseed a populated DB unless you want to wipe it (`npm run db:reset` force-resets). Seeding creates two tenants to demonstrate isolation.
- Start dev with `npm run dev` (serves http://localhost:3000). Health check: `GET /api/health` returns `{"ok":true,"service":"megabeauty"}`.
- Demo login: `iris.p@example.org` / `demo1234` (salon "Studio Aurora", public booking at `/agendar/studio-aurora`). Second tenant: `alice.j@example.com` / `demo1234`.
- `OPENAI_API_KEY` and `EVOLUTION_API_URL`/`EVOLUTION_API_KEY` are optional; the AI assistant and WhatsApp inbox degrade gracefully to local/demo mode when unset, so they are not needed to run or test the app.
