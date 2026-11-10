const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function inspectAndFix() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // 1. Inspect table columns of public.profiles
    const cols = await client.query(`
      SELECT column_name, data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'profiles';
    `);
    console.log('Columns in profiles:', cols.rows);

    // 2. Fix handle_new_user trigger function safely
    await client.query(`
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS TRIGGER AS $$
      DECLARE
        user_role_val public.user_role;
        user_full_name TEXT;
      BEGIN
        -- Safely extract full_name
        user_full_name := COALESCE(
          NEW.raw_user_meta_data->>'full_name',
          split_part(NEW.email, '@', 1)
        );

        -- Safely parse or fallback role
        BEGIN
          user_role_val := (NEW.raw_user_meta_data->>'role')::public.user_role;
        EXCEPTION WHEN OTHERS THEN
          user_role_val := 'CLIENT'::public.user_role;
        END;

        IF user_role_val IS NULL THEN
          user_role_val := 'CLIENT'::public.user_role;
        END IF;

        INSERT INTO public.profiles (id, email, full_name, role)
        VALUES (
          NEW.id,
          NEW.email,
          user_full_name,
          user_role_val
        )
        ON CONFLICT (id) DO UPDATE
        SET
          email = EXCLUDED.email,
          full_name = EXCLUDED.full_name,
          role = EXCLUDED.role;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

    console.log('Successfully updated handle_new_user trigger function!');
    await client.end();
  } catch (err) {
    console.error('Error:', err);
  }
}

inspectAndFix();

