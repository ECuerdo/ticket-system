const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function addTaglines() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  await client.query(`
    ALTER TABLE public.app_settings
      ADD COLUMN IF NOT EXISTS sidebar_subtitle TEXT NOT NULL DEFAULT 'Issue Tracking',
      ADD COLUMN IF NOT EXISTS landing_subtitle TEXT NOT NULL DEFAULT 'Supabase Edition';
  `);

  console.log('SUCCESS: subtitle columns added to app_settings!');
  await client.end();
}

addTaglines();
