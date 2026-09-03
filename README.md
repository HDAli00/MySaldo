# Saldo

Saldo is a privacy-first personal finance web app for importing ING Netherlands
CSV exports, organizing transactions by account and category, and (in later
phases) budgeting and forecasting.

## Status: Phase 1 — Foundation

Implemented so far:

- Email/password authentication with database-backed sessions. All accounts,
  transactions, and imports are scoped to the signed-in user.
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

5. Visit [http://localhost:3000/signup](http://localhost:3000/signup) to
   create an account, then go to **Imports** and upload an ING Netherlands
   CSV export to see it in **Accounts** and **Transactions**.

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
