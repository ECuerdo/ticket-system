const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function createResetFunction() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  await client.query(`
    CREATE OR REPLACE FUNCTION public.admin_reset_user_password(target_user_id UUID, new_plain_password TEXT)
    RETURNS VOID
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, auth, extensions
    AS $$
    BEGIN
      UPDATE auth.users
      SET encrypted_password = crypt(new_plain_password, gen_salt('bf')),
          updated_at = now()
      WHERE id = target_user_id;
    END;
    $$;
  `);

  console.log('Function admin_reset_user_password created successfully');
  await client.end();
}
createResetFunction();

