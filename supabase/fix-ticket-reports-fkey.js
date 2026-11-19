const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function fixForeignKey() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  console.log('Adding foreign key constraint from ticket_reports.reporter_id to profiles.id...');

  await client.query(`
    ALTER TABLE public.ticket_reports
      DROP CONSTRAINT IF EXISTS ticket_reports_reporter_id_fkey;

    ALTER TABLE public.ticket_reports
      ADD CONSTRAINT ticket_reports_reporter_id_fkey
      FOREIGN KEY (reporter_id) REFERENCES public.profiles(id)
      ON DELETE CASCADE;

    NOTIFY pgrst, 'reload schema';
  `);

  console.log('Foreign key added and PostgREST schema reloaded successfully!');
  await client.end();
}

fixForeignKey().catch(console.error);
