# Saldo

Saldo is a privacy-first personal finance web app for importing ING Netherlands
CSV exports, organizing transactions by account and category, and (in later
phases) budgeting and forecasting.

## Status: Phase 1 — Foundation

Implemented so far:

- App shell with the full primary navigation (Overview, Accounts,
  Transactions, Budgets, Forecast, Rules, Imports, Settings) and an
  account-scope selector in the header.
- ING Netherlands CSV import: delimiter auto-detection, Dutch date
  (`YYYYMMDD` / `DD-MM-YYYY`) and amount (comma-decimal) parsing, required
  column validation, per-row error reporting.
- Automatic account detection from the `Rekening` IBAN, with IBANs encrypted
  at rest (AES-256-GCM) and masked in the UI (e.g. `ING ····4821`).
- Duplicate handling at two levels: identical re-uploaded files are
  recognized via a file hash, and individual duplicate rows are skipped via a
  per-transaction fingerprint.
- Transactions list with account, date-range, and description search filters.
- Accounts list showing masked IBAN, latest balance, and transaction count.

Budgets, Forecast, Rules, and Settings are placeholder pages until their
respective phases (categorization, budgeting, recurring-payment detection)
are built.

## Getting started

Requires Node.js 20+ and a [Supabase](https://supabase.com) project (Postgres).

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment template and fill in your database URLs and
   encryption key:

   ```bash
   cp .env.example .env
   # DATABASE_URL / DIRECT_URL: from your Supabase project's
   # Project Settings > Database > Connection string (Prisma needs both the
   # pooled "transaction mode" URL and the direct "session mode" URL — see
   # comments in .env.example).
   #
   # Generate an encryption key:
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. Apply migrations to your Supabase database:

   ```bash
   npx prisma migrate deploy
   ```

4. Start the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

5. Go to **Imports** and upload an ING Netherlands CSV export to see it in
   **Accounts** and **Transactions**.

## Troubleshooting

**`PrismaClientInitializationError` / `FATAL: tenant or user "postgres.<ref>" not found`**

This comes from Supabase's connection pooler (Supavisor), not from Prisma or
this app's code — it means the pooler has no project matching the ref in
your `DATABASE_URL`. Check, in order:

1. **Project paused.** Free-tier Supabase projects auto-pause after a period
   of inactivity. Open the [Supabase dashboard](https://supabase.com/dashboard)
   and resume the project if it shows as paused.
2. **Wrong or stale project ref/password.** Re-copy both `DATABASE_URL` and
   `DIRECT_URL` from Project Settings > Database > Connection string — the
   username must be `postgres.<project-ref>` and must match the project
   you're actually running against (easy to get stale after resetting the DB
   password or switching projects).
3. **`.env` not loaded.** Confirm `.env` exists at the repo root (copied from
   `.env.example`) and that both variables are set — `next dev` only reads
   `.env`/`.env.local`, not `.env.example`.

## Tech stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Prisma ORM + Supabase (PostgreSQL)
- Papa Parse for CSV parsing

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run lint` — ESLint
- `npx prisma migrate dev` — create and apply a new schema migration locally
- `npx prisma migrate deploy` — apply pending migrations to Supabase
- `npx prisma studio` — browse the database
