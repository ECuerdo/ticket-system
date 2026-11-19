const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function createPmDevsTable() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS public.pm_developers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      pm_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      dev_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
      UNIQUE(pm_id, dev_id)
    );

    ALTER TABLE public.pm_developers ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "PM developers viewable by authenticated" ON public.pm_developers;
    CREATE POLICY "PM developers viewable by authenticated"
    ON public.pm_developers FOR SELECT TO authenticated
    USING (true);

    DROP POLICY IF EXISTS "PMs can manage their own developers" ON public.pm_developers;
    CREATE POLICY "PMs can manage their own developers"
    ON public.pm_developers FOR ALL TO authenticated
    USING (pm_id = auth.uid())
    WITH CHECK (pm_id = auth.uid());
  `);

  console.log('SUCCESS: pm_developers table and RLS policies created!');
  await client.end();
}

createPmDevsTable();

