const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function setupComments() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // Check table structure
    const cols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'ticket_comments';
    `);
    console.log('Columns in ticket_comments:', cols.rows);

    // Make sure attachments column exists on ticket_comments as well (optional file in chat)
    await client.query(`
      ALTER TABLE public.ticket_comments 
      ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
    `);

    // Ensure RLS policies allow reading and writing comments
    await client.query(`
      ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Ticket comments viewable by participants" ON public.ticket_comments;
      CREATE POLICY "Ticket comments viewable by participants"
      ON public.ticket_comments FOR SELECT TO authenticated
      USING (true);

      DROP POLICY IF EXISTS "Users can create comments" ON public.ticket_comments;
      CREATE POLICY "Users can create comments"
      ON public.ticket_comments FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
    `);

    console.log('SUCCESS: ticket_comments table and policies configured!');
    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

setupComments();

