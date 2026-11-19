const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function createAdminUpdateFn() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  await client.query(`
    CREATE OR REPLACE FUNCTION public.admin_update_profile(
      target_user_id UUID,
      new_role user_role DEFAULT NULL,
      new_assigned_system_type_id UUID DEFAULT NULL,
      update_system_type BOOLEAN DEFAULT false
    )
    RETURNS SETOF public.profiles
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, auth, extensions
    AS $$
    BEGIN
      IF new_role IS NOT NULL AND update_system_type THEN
        RETURN QUERY
        UPDATE public.profiles
        SET role = new_role,
            assigned_system_type_id = new_assigned_system_type_id,
            updated_at = now()
        WHERE id = target_user_id
        RETURNING *;
      ELSIF new_role IS NOT NULL THEN
        RETURN QUERY
        UPDATE public.profiles
        SET role = new_role,
            updated_at = now()
        WHERE id = target_user_id
        RETURNING *;
      ELSIF update_system_type THEN
        RETURN QUERY
        UPDATE public.profiles
        SET assigned_system_type_id = new_assigned_system_type_id,
            updated_at = now()
        WHERE id = target_user_id
        RETURNING *;
      END IF;
    END;
    $$;
  `);

  console.log('admin_update_profile function created successfully');
  await client.end();
}

createAdminUpdateFn();

