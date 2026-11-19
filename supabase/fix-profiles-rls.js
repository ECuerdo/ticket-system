const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function fixProfilesRLS() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  await client.query(`
    -- Drop existing restrictive update policy if needed or add admin update policy
    DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
    CREATE POLICY "Admins can update all profiles"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN'
    )
    WITH CHECK (true);
  `);

  console.log('SUCCESS: Admin update policy applied on public.profiles!');
  await client.end();
}

fixProfilesRLS();

