-- The app now talks to Postgres directly via the Supabase JS client using the
-- public anon key (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY),
-- instead of a private DATABASE_URL/DIRECT_URL connection string through Prisma.
--
-- RLS is enabled on every table (Supabase's default for new tables) but no
-- policies exist yet, which means the `anon` role currently gets zero rows
-- back from anything. The app has always enforced authorization itself in
-- application code (every query is scoped by session user id — see
-- src/lib/auth/session.ts and the various src/lib/db/*.ts helpers), the same
-- way the previous Prisma connection bypassed RLS entirely by connecting as
-- the table owner. These policies restore that same "DB is permissive, app
-- enforces access" model for the anon/authenticated roles so the anon key can
-- actually read and write.
--
-- IMPORTANT: this means the anon key alone is sufficient to read/write any
-- row in any of these tables (no ownership check at the database level). Keep
-- NEXT_PUBLIC_SUPABASE_ANON_KEY used only in server-only code paths — never
-- pass it to client components or client-side fetches, since despite the
-- NEXT_PUBLIC_ prefix it is not meant to be reachable from the browser here.
do $$
declare
  t text;
begin
  for t in select unnest(array['users', 'accounts', 'sessions', 'categories', 'transactions', 'imports'])
  loop
    execute format('drop policy if exists app_access on public.%I', t);
    execute format(
      'create policy app_access on public.%I for all to anon, authenticated using (true) with check (true)',
      t
    );
  end loop;
end $$;
