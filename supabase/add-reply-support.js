const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function addReplySupport() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database for reply columns...');

    await client.query(`
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
    `);

    console.log('SUCCESS: reply_to_id columns added to all chat and ticket tables!');
    await client.end();
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  }
}

addReplySupport();
