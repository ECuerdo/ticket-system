const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function autoConfirm() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // 1. Confirm any registered user who hasn't been confirmed yet
    const updated = await client.query(`
      UPDATE auth.users
      SET email_confirmed_at = COALESCE(email_confirmed_at, now())
      WHERE email_confirmed_at IS NULL
      RETURNING email;
    `);
    console.log('Confirmed existing users:', updated.rows.map(r => r.email));

    // 2. Automatically confirm future signups so you don't need real emails in dev
    await client.query(`
      CREATE OR REPLACE FUNCTION public.auto_confirm_new_users()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.email_confirmed_at := now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trigger_auto_confirm_users ON auth.users;
      CREATE TRIGGER trigger_auto_confirm_users
      BEFORE INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.auto_confirm_new_users();
    `);

    console.log('SUCCESS: Auto-confirm enabled!');
    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

autoConfirm();

