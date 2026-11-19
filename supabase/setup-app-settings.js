const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function createAppSettings() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS public.app_settings (
      id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      project_name TEXT NOT NULL DEFAULT 'TicketFlow',
      logo_url TEXT,
      primary_color TEXT NOT NULL DEFAULT '#5b2fd4',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
    );

    INSERT INTO public.app_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

    ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "App settings readable by everyone" ON public.app_settings;
    CREATE POLICY "App settings readable by everyone"
    ON public.app_settings FOR SELECT TO anon, authenticated
    USING (true);

    DROP POLICY IF EXISTS "Admins can update app settings" ON public.app_settings;
    CREATE POLICY "Admins can update app settings"
    ON public.app_settings FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));
  `);

  console.log('SUCCESS: app_settings table and RLS policies created!');
  await client.end();
}

createAppSettings();
