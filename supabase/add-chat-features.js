const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database...');

    await client.query(`
      -- Group chat reads table for unread tracking
      CREATE TABLE IF NOT EXISTS public.group_chat_reads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        chat_type TEXT NOT NULL,
        last_read_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT uq_user_group_chat_read UNIQUE (user_id, chat_type)
      );

      CREATE INDEX IF NOT EXISTS idx_group_chat_reads_lookup 
        ON public.group_chat_reads (user_id, chat_type);

      ALTER TABLE public.group_chat_reads ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Users can view own group_chat_reads" ON public.group_chat_reads;
      CREATE POLICY "Users can view own group_chat_reads"
        ON public.group_chat_reads FOR SELECT TO authenticated
        USING (auth.uid() = user_id);

      DROP POLICY IF EXISTS "Users can insert own group_chat_reads" ON public.group_chat_reads;
      CREATE POLICY "Users can insert own group_chat_reads"
        ON public.group_chat_reads FOR INSERT TO authenticated
        WITH CHECK (auth.uid() = user_id);

      DROP POLICY IF EXISTS "Users can update own group_chat_reads" ON public.group_chat_reads;
      CREATE POLICY "Users can update own group_chat_reads"
        ON public.group_chat_reads FOR UPDATE TO authenticated
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);

      -- Reply Support
      ALTER TABLE public.pm_chat_messages 
        ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.pm_chat_messages(id) ON DELETE SET NULL;
      ALTER TABLE public.dev_chat_messages 
        ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.dev_chat_messages(id) ON DELETE SET NULL;
      ALTER TABLE public.staff_chat_messages 
        ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.staff_chat_messages(id) ON DELETE SET NULL;
      ALTER TABLE public.ticket_comments 
        ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.ticket_comments(id) ON DELETE SET NULL;

      CREATE INDEX IF NOT EXISTS idx_pm_chat_reply ON public.pm_chat_messages (reply_to_id) WHERE reply_to_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_dev_chat_reply ON public.dev_chat_messages (reply_to_id) WHERE reply_to_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_staff_chat_reply ON public.staff_chat_messages (reply_to_id) WHERE reply_to_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_ticket_comments_reply ON public.ticket_comments (reply_to_id) WHERE reply_to_id IS NOT NULL;

      -- Edit Support (is_edited, edited_at)
      ALTER TABLE public.pm_chat_messages 
        ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
      ALTER TABLE public.dev_chat_messages 
        ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
      ALTER TABLE public.staff_chat_messages 
        ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
      ALTER TABLE public.ticket_comments 
        ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
    `);

    console.log('SUCCESS: All database migrations applied successfully!');
    await client.end();
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  }
}

runMigration();
