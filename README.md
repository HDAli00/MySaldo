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

Requires Node.js 20+ and a [Supabase](https://supabase.com) project (Postgres + Auth).

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment template and fill in your database URLs, Supabase
   Auth keys, and encryption key:

   ```bash
   cp .env.example .env
   # DATABASE_URL / DIRECT_URL: from your Supabase project's
   # Project Settings > Database > Connection string (Prisma needs both the
   # pooled "transaction mode" URL and the direct "session mode" URL — see
   # comments in .env.example).
   #
   # NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY: from
   # Project Settings > API.
   #
   # Generate an encryption key:
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. Apply migrations to your Supabase database (run with the privileged
   `postgres` role, i.e. your current DIRECT_URL/DATABASE_URL — this also
   creates the restricted `saldo_app` role used in the next step):

   ```bash
   npx prisma migrate deploy
   ```

4. Set a password for the restricted app role and switch `DATABASE_URL` to
   use it. This step is what makes Row Level Security actually enforced for
   the app's own queries — see [Auth & Row Level
   Security](#auth--row-level-security) below for why it matters:

   ```sql
   -- Run in the Supabase SQL editor
   ALTER ROLE saldo_app WITH PASSWORD '<a strong random password>';
   ```

   ```bash
   # .env — swap the DATABASE_URL role from postgres.<ref> to saldo_app.<ref>
   DATABASE_URL="postgresql://saldo_app.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true"
   ```

   Leave `DIRECT_URL` on the `postgres` role — future `prisma migrate`
   runs need privileges `saldo_app` intentionally doesn't have (creating
   tables, roles, policies).

5. In Supabase Auth settings, enable the **Email** provider (magic link /
   OTP). No further configuration is required for local development.

6. Start the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) and sign in with your
   email — Supabase will send you a magic link.

7. Go to **Imports** and upload an ING Netherlands CSV export to see it in
   **Accounts** and **Transactions**.

## Auth & Row Level Security

Every table that holds user data (`accounts`, `transactions`, `imports`, and
`users` itself) has Row Level Security enabled and `FORCE`d, with policies
that only allow a row through when it matches a Postgres session variable
(`app.user_id`) the app sets at the start of each request's database
transaction — see `src/lib/user-scope.ts` and the `add_auth_and_rls`
migration. There's no "all rows" fallback: if the session variable is unset,
the policy evaluates to false and the query sees nothing.

This is enforced by Postgres itself, not just by `where userId: ...` clauses
in the app code — but only for connections that don't bypass RLS. Supabase's
default `postgres` role does bypass it, which is why step 4 above matters:
without switching the app's runtime connection to the restricted `saldo_app`
role, the policies exist but are silently ignored by every query Prisma
makes.

Sign-in is a Supabase Auth magic link (passwordless). The first person to
sign in claims any pre-existing, not-yet-owned data (from before this app
had accounts at all); every signup after that gets a fresh, empty account.
See `src/lib/current-user.ts` for the claim logic and its RLS policy.

`categories` is shared reference data (no owner column) and is intentionally
readable/writable by any authenticated app connection — it isn't per-user
data.

## Tech stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Prisma ORM + Supabase (PostgreSQL, Auth, Row Level Security)
- Papa Parse for CSV parsing

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run lint` — ESLint
- `npx prisma migrate dev` — create and apply a new schema migration locally
- `npx prisma migrate deploy` — apply pending migrations to Supabase
- `npx prisma studio` — browse the database
