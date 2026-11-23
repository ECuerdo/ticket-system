const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  console.log('Connected to DB');

  // 1. Create pm_system_scopes table
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.pm_system_scopes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      pm_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      system_type_id UUID NOT NULL REFERENCES public.system_types(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
      UNIQUE (pm_id, system_type_id)
    );

    ALTER TABLE public.pm_system_scopes ENABLE ROW LEVEL SECURITY;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'pm_system_scopes' AND policyname = 'Allow authenticated read pm_system_scopes'
      ) THEN
        CREATE POLICY "Allow authenticated read pm_system_scopes" ON public.pm_system_scopes
          FOR SELECT TO authenticated USING (true);
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'pm_system_scopes' AND policyname = 'Allow admin write pm_system_scopes'
      ) THEN
        CREATE POLICY "Allow admin write pm_system_scopes" ON public.pm_system_scopes
          FOR ALL TO authenticated USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
          );
      END IF;
    END $$;

    GRANT ALL ON public.pm_system_scopes TO authenticated, anon, service_role;
  `);
  console.log('Created pm_system_scopes table and policies');

  // 2. Backfill existing assigned_system_type_id from profiles
  await client.query(`
    INSERT INTO public.pm_system_scopes (pm_id, system_type_id)
    SELECT id, assigned_system_type_id
    FROM public.profiles
    WHERE assigned_system_type_id IS NOT NULL AND role = 'PM'
    ON CONFLICT (pm_id, system_type_id) DO NOTHING;
  `);
  console.log('Backfilled existing PM scopes');

  await client.end();
  console.log('Migration complete!');
}

run().catch(console.error);
