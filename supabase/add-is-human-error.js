const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  console.log('Connected to DB');

  await client.query(`
    ALTER TABLE public.tickets 
    ADD COLUMN IF NOT EXISTS is_human_error BOOLEAN DEFAULT FALSE;
  `);
  console.log('Added is_human_error column to tickets table');

  await client.end();
  console.log('Migration complete!');
}

run().catch(console.error);
