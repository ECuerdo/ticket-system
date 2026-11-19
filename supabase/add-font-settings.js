const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function addFontSettings() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  await client.query(`
    ALTER TABLE public.app_settings
      ADD COLUMN IF NOT EXISTS font_family TEXT NOT NULL DEFAULT 'geist',
      ADD COLUMN IF NOT EXISTS font_size TEXT NOT NULL DEFAULT 'normal';
  `);

  console.log('SUCCESS: font_family and font_size columns added to app_settings!');
  await client.end();
}

addFontSettings();
