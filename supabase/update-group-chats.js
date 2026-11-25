const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function updateGroupChats() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database for group chat extensions...');

    await client.query(`
      -- 1. Add pin columns to all 3 group chat message tables
      ALTER TABLE public.pm_chat_messages 
        ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS pinned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

      ALTER TABLE public.dev_chat_messages 
        ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS pinned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

      ALTER TABLE public.staff_chat_messages 
        ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS pinned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

      -- 2. Indexes for pinned messages
      CREATE INDEX IF NOT EXISTS idx_pm_chat_pinned ON public.pm_chat_messages (is_pinned) WHERE is_pinned = true;
      CREATE INDEX IF NOT EXISTS idx_dev_chat_pinned ON public.dev_chat_messages (is_pinned) WHERE is_pinned = true;
      CREATE INDEX IF NOT EXISTS idx_staff_chat_pinned ON public.staff_chat_messages (is_pinned) WHERE is_pinned = true;

      -- 3. Create group_chat_reactions table
      CREATE TABLE IF NOT EXISTS public.group_chat_reactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        chat_type TEXT NOT NULL,
        message_id UUID NOT NULL,
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        emoji TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT uq_group_chat_reaction UNIQUE (chat_type, message_id, user_id, emoji)
      );

      CREATE INDEX IF NOT EXISTS idx_group_chat_reactions_lookup 
        ON public.group_chat_reactions (chat_type, message_id);

      -- 4. Enable RLS on group_chat_reactions
      ALTER TABLE public.group_chat_reactions ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Authenticated can view group_chat_reactions" ON public.group_chat_reactions;
      CREATE POLICY "Authenticated can view group_chat_reactions"
        ON public.group_chat_reactions FOR SELECT TO authenticated
        USING (true);

      DROP POLICY IF EXISTS "Authenticated can insert own group_chat_reactions" ON public.group_chat_reactions;
      CREATE POLICY "Authenticated can insert own group_chat_reactions"
        ON public.group_chat_reactions FOR INSERT TO authenticated
        WITH CHECK (auth.uid() = user_id);

      DROP POLICY IF EXISTS "Authenticated can delete own group_chat_reactions" ON public.group_chat_reactions;
      CREATE POLICY "Authenticated can delete own group_chat_reactions"
        ON public.group_chat_reactions FOR DELETE TO authenticated
        USING (auth.uid() = user_id);

      -- 5. Add update policy for pinning messages
      DROP POLICY IF EXISTS "Staff can update pm_chat_messages" ON public.pm_chat_messages;
      CREATE POLICY "Staff can update pm_chat_messages"
        ON public.pm_chat_messages FOR UPDATE TO authenticated
        USING (true)
        WITH CHECK (true);

      DROP POLICY IF EXISTS "Staff can update dev_chat_messages" ON public.dev_chat_messages;
      CREATE POLICY "Staff can update dev_chat_messages"
        ON public.dev_chat_messages FOR UPDATE TO authenticated
        USING (true)
        WITH CHECK (true);

      DROP POLICY IF EXISTS "Staff can update staff_chat_messages" ON public.staff_chat_messages;
      CREATE POLICY "Staff can update staff_chat_messages"
        ON public.staff_chat_messages FOR UPDATE TO authenticated
        USING (true)
        WITH CHECK (true);

      -- 6. Add group_chat_reactions to supabase_realtime publication
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_publication_tables 
          WHERE pubname = 'supabase_realtime' AND tablename = 'group_chat_reactions'
        ) THEN
          ALTER PUBLICATION supabase_realtime ADD TABLE public.group_chat_reactions;
        END IF;
      END $$;
    `);

    console.log('SUCCESS: Group chat schema updated with pinned columns, reactions table, and realtime!');
    await client.end();
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  }
}

updateGroupChats();
