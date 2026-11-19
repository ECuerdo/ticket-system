const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function migrate() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('Adding birthdate column to profiles...');
  await client.query("ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birthdate DATE;");
  console.log('Done adding birthdate column.');
  await client.end();
}

migrate().catch(console.error);
