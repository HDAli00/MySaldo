-- ============================================================================
-- Per-user data + strict Row Level Security
--
-- Before this migration the app had no authentication at all: every route
-- called `db.user.findFirst()` and operated on whichever single `users` row
-- existed. This migration (a) adds the columns needed to tie `users` rows to
-- real Supabase Auth identities and to scope `transactions`/`imports`
-- directly by owner, and (b) turns on RLS with fail-closed policies so the
-- database itself enforces per-user isolation, not just app code.
--
-- RLS is only as strict as the role querying through it: the `postgres` role
-- (used by DIRECT_URL for migrations) has BYPASSRLS and ignores every policy
-- below. A new restricted role, `saldo_app`, is created here specifically so
-- the app's runtime connection (DATABASE_URL) can be pointed at a role that
-- cannot bypass RLS. See .env.example for the one manual step (setting its
-- password) required to finish wiring this up.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Link `users` rows to Supabase Auth identities
-- ----------------------------------------------------------------------------

ALTER TABLE "users" ADD COLUMN "auth_user_id" TEXT;
ALTER TABLE "users" ADD COLUMN "email" TEXT;

CREATE UNIQUE INDEX "users_auth_user_id_key" ON "users"("auth_user_id");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- ----------------------------------------------------------------------------
-- 2. Denormalize ownership onto `transactions` and `imports`
--
-- Both are reachable from `users` via `accounts`, but denormalizing avoids a
-- join inside every RLS policy and covers `imports` rows created before an
-- account was resolved (accountId is nullable there).
-- ----------------------------------------------------------------------------

-- Every existing account already has a non-null user_id, so every existing
-- transaction can be backfilled unconditionally.
ALTER TABLE "transactions" ADD COLUMN "user_id" TEXT;
UPDATE "transactions" t SET "user_id" = a."user_id" FROM "accounts" a WHERE a."id" = t."account_id";
ALTER TABLE "transactions" ALTER COLUMN "user_id" SET NOT NULL;

-- Imports created before any account existed (e.g. a CSV upload that failed
-- column validation before a user/account had ever been created) have no
-- account to backfill from. Make sure at least one user row exists to own
-- them, matching the "first person who signs in claims pre-auth data" plan.
INSERT INTO "users" ("id", "currency", "created_at")
SELECT gen_random_uuid()::text, 'EUR', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "users")
  AND EXISTS (SELECT 1 FROM "imports" WHERE "account_id" IS NULL);

ALTER TABLE "imports" ADD COLUMN "user_id" TEXT;
UPDATE "imports" i SET "user_id" = a."user_id" FROM "accounts" a WHERE a."id" = i."account_id";
UPDATE "imports" SET "user_id" = (SELECT "id" FROM "users" ORDER BY "created_at" ASC LIMIT 1) WHERE "user_id" IS NULL;
ALTER TABLE "imports" ALTER COLUMN "user_id" SET NOT NULL;

CREATE INDEX "transactions_user_id_idx" ON "transactions"("user_id");
CREATE INDEX "imports_user_id_idx" ON "imports"("user_id");

ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "imports" ADD CONSTRAINT "imports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- `file_hash` was globally unique, which would let one user's re-upload of a
-- byte-identical file collide with a different user's import once RLS hides
-- each user's rows from the other. Scope the uniqueness to (user_id,
-- file_hash) instead, now that every import row has an owner.
DROP INDEX "imports_file_hash_key";
CREATE UNIQUE INDEX "imports_user_id_file_hash_key" ON "imports"("user_id", "file_hash");

-- ----------------------------------------------------------------------------
-- 3. Restricted application role (does not bypass RLS)
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'saldo_app') THEN
    CREATE ROLE "saldo_app" WITH LOGIN NOBYPASSRLS;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA "public" TO "saldo_app";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "public" TO "saldo_app";
ALTER DEFAULT PRIVILEGES IN SCHEMA "public" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "saldo_app";

-- ----------------------------------------------------------------------------
-- 4. Row Level Security
--
-- The app sets two transaction-local Postgres settings per request (see
-- src/lib/current-user.ts and src/lib/user-scope.ts):
--   app.auth_user_id — the verified Supabase Auth user id, set only while
--                       resolving/creating/claiming the matching `users` row
--   app.user_id       — the resolved internal users.id, set for every other
--                       per-user query
-- current_setting(key, true) returns NULL when the setting was never made in
-- the current transaction, so every policy below fails closed: no session
-- variable means no rows, not "all rows".
-- ----------------------------------------------------------------------------

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" FORCE ROW LEVEL SECURITY;

-- A row is visible if it already belongs to the caller, or it's an unclaimed
-- legacy row (auth_user_id IS NULL) so the first person who signs in can
-- claim pre-auth data. WITH CHECK still pins every write to the caller's own
-- auth id, so a row can only ever be claimed for yourself, never reassigned
-- to or created for someone else.
CREATE POLICY "users_self_or_unclaimed" ON "users"
  FOR ALL
  USING ("auth_user_id" = current_setting('app.auth_user_id', true) OR "auth_user_id" IS NULL)
  WITH CHECK ("auth_user_id" = current_setting('app.auth_user_id', true));

ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "accounts" FORCE ROW LEVEL SECURITY;
CREATE POLICY "accounts_owner" ON "accounts"
  FOR ALL
  USING ("user_id" = current_setting('app.user_id', true))
  WITH CHECK ("user_id" = current_setting('app.user_id', true));

ALTER TABLE "transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "transactions" FORCE ROW LEVEL SECURITY;
CREATE POLICY "transactions_owner" ON "transactions"
  FOR ALL
  USING ("user_id" = current_setting('app.user_id', true))
  WITH CHECK ("user_id" = current_setting('app.user_id', true));

ALTER TABLE "imports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "imports" FORCE ROW LEVEL SECURITY;
CREATE POLICY "imports_owner" ON "imports"
  FOR ALL
  USING ("user_id" = current_setting('app.user_id', true))
  WITH CHECK ("user_id" = current_setting('app.user_id', true));

-- Categories are shared system reference data (no owner column), not
-- per-user data. RLS is still enabled for defense-in-depth, but the policy
-- is intentionally permissive so the app role can read them and upsert the
-- default set on first use.
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_shared" ON "categories"
  FOR ALL
  USING (true)
  WITH CHECK (true);
