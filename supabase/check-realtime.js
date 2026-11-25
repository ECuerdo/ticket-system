const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkRealtime() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const res = await client.query(`
      SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
    `);
    console.log('Tables in supabase_realtime:', res.rows.map(r => r.tablename));

    // Ensure all 3 chat message tables are in supabase_realtime
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'pm_chat_messages') THEN
          ALTER PUBLICATION supabase_realtime ADD TABLE public.pm_chat_messages;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'dev_chat_messages') THEN
          ALTER PUBLICATION supabase_realtime ADD TABLE public.dev_chat_messages;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'staff_chat_messages') THEN
          ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_chat_messages;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'ticket_comments') THEN
          ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_comments;
        END IF;
      END $$;
    `);
    console.log('SUCCESS: All chat tables added to supabase_realtime publication!');
    await client.end();
  } catch (err) {
    console.error('Realtime check error:', err.message);
    process.exit(1);
  }
}

checkRealtime();
