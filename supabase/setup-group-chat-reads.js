const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function setupGroupChatReads() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database for unread status table...');

    await client.query(`
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
    `);

    console.log('SUCCESS: group_chat_reads table created successfully!');
    await client.end();
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  }
}

setupGroupChatReads();
