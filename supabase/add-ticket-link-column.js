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
    ADD COLUMN IF NOT EXISTS link_url TEXT;
  `);

  console.log('Successfully added link_url column to public.tickets');
  await client.end();
}

run().catch(console.error);
