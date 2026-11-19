const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function migrate() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  console.log('Creating ticket_reports table...');

  await client.query(`
    CREATE TABLE IF NOT EXISTS public.ticket_reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
      reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      admin_notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- Enable RLS
    ALTER TABLE public.ticket_reports ENABLE ROW LEVEL SECURITY;

    -- Drop old policies if any
    DROP POLICY IF EXISTS "Clients can insert own reports" ON public.ticket_reports;
    DROP POLICY IF EXISTS "Admins can view all reports" ON public.ticket_reports;
    DROP POLICY IF EXISTS "Admins can update reports" ON public.ticket_reports;
    DROP POLICY IF EXISTS "Clients can view own reports" ON public.ticket_reports;

    -- Policy: Clients can insert reports
    CREATE POLICY "Clients can insert own reports"
      ON public.ticket_reports
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = reporter_id);

    -- Policy: Clients can view own reports
    CREATE POLICY "Clients can view own reports"
      ON public.ticket_reports
      FOR SELECT
      TO authenticated
      USING (auth.uid() = reporter_id);

    -- Policy: Admins can view all reports (PM and DEV have NO access)
    CREATE POLICY "Admins can view all reports"
      ON public.ticket_reports
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'ADMIN'
        )
      );

    -- Policy: Admins can update reports
    CREATE POLICY "Admins can update reports"
      ON public.ticket_reports
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'ADMIN'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'ADMIN'
        )
      );
  `);

  console.log('ticket_reports table and security policies created successfully!');
  await client.end();
}

migrate().catch(console.error);
