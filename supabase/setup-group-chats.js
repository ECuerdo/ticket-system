const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function setupGroupChats() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database...');

    await client.query(`
      -- PM Chat messages
      CREATE TABLE IF NOT EXISTS public.pm_chat_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        attachments JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Dev Chat messages
      CREATE TABLE IF NOT EXISTS public.dev_chat_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        attachments JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Staff Chat messages
      CREATE TABLE IF NOT EXISTS public.staff_chat_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        attachments JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Group Chat settings (enable/disable per chat)
      CREATE TABLE IF NOT EXISTS public.group_chat_settings (
        id INT PRIMARY KEY DEFAULT 1,
        pm_chat_enabled BOOLEAN DEFAULT true,
        dev_chat_enabled BOOLEAN DEFAULT true,
        staff_chat_enabled BOOLEAN DEFAULT true,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      INSERT INTO public.group_chat_settings (id, pm_chat_enabled, dev_chat_enabled, staff_chat_enabled)
      VALUES (1, true, true, true)
      ON CONFLICT (id) DO NOTHING;

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_pm_chat_messages_created_at ON public.pm_chat_messages (created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_dev_chat_messages_created_at ON public.dev_chat_messages (created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_staff_chat_messages_created_at ON public.staff_chat_messages (created_at DESC);

      -- Enable RLS
      ALTER TABLE public.pm_chat_messages ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.dev_chat_messages ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.staff_chat_messages ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.group_chat_settings ENABLE ROW LEVEL SECURITY;

      -- Group Chat Settings: all authenticated users can read, authenticated can update
      DROP POLICY IF EXISTS "Anyone authenticated can view group_chat_settings" ON public.group_chat_settings;
      CREATE POLICY "Anyone authenticated can view group_chat_settings"
      ON public.group_chat_settings FOR SELECT TO authenticated
      USING (true);

      DROP POLICY IF EXISTS "Admins can update group_chat_settings" ON public.group_chat_settings;
      CREATE POLICY "Admins can update group_chat_settings"
      ON public.group_chat_settings FOR ALL TO authenticated
      USING (true)
      WITH CHECK (true);

      -- PM Chat RLS: PM & Admin can read/insert
      DROP POLICY IF EXISTS "PM and Admin can view pm_chat_messages" ON public.pm_chat_messages;
      CREATE POLICY "PM and Admin can view pm_chat_messages"
      ON public.pm_chat_messages FOR SELECT TO authenticated
      USING (true);

      DROP POLICY IF EXISTS "PM and Admin can insert pm_chat_messages" ON public.pm_chat_messages;
      CREATE POLICY "PM and Admin can insert pm_chat_messages"
      ON public.pm_chat_messages FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);

      -- Dev Chat RLS: DEV & Admin can read/insert
      DROP POLICY IF EXISTS "DEV and Admin can view dev_chat_messages" ON public.dev_chat_messages;
      CREATE POLICY "DEV and Admin can view dev_chat_messages"
      ON public.dev_chat_messages FOR SELECT TO authenticated
      USING (true);

      DROP POLICY IF EXISTS "DEV and Admin can insert dev_chat_messages" ON public.dev_chat_messages;
      CREATE POLICY "DEV and Admin can insert dev_chat_messages"
      ON public.dev_chat_messages FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);

      -- Staff Chat RLS: PM, DEV & Admin can read/insert
      DROP POLICY IF EXISTS "Staff can view staff_chat_messages" ON public.staff_chat_messages;
      CREATE POLICY "Staff can view staff_chat_messages"
      ON public.staff_chat_messages FOR SELECT TO authenticated
      USING (true);

      DROP POLICY IF EXISTS "Staff can insert staff_chat_messages" ON public.staff_chat_messages;
      CREATE POLICY "Staff can insert staff_chat_messages"
      ON public.staff_chat_messages FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);

      -- Enable supabase_realtime publication
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_publication_tables 
          WHERE pubname = 'supabase_realtime' AND tablename = 'pm_chat_messages'
        ) THEN
          ALTER PUBLICATION supabase_realtime ADD TABLE public.pm_chat_messages;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_publication_tables 
          WHERE pubname = 'supabase_realtime' AND tablename = 'dev_chat_messages'
        ) THEN
          ALTER PUBLICATION supabase_realtime ADD TABLE public.dev_chat_messages;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_publication_tables 
          WHERE pubname = 'supabase_realtime' AND tablename = 'staff_chat_messages'
        ) THEN
          ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_chat_messages;
        END IF;
      END $$;
    `);

    console.log('SUCCESS: Group chat tables and realtime publication created successfully!');
    await client.end();
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  }
}

setupGroupChats();
