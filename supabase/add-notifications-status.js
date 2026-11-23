const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  console.log('Connected to DB');

  // 1. Add ticket_status column to notifications
  await client.query(`
    ALTER TABLE public.notifications 
    ADD COLUMN IF NOT EXISTS ticket_status TEXT;
  `);
  console.log('Added ticket_status column');

  // 2. Ensure foreign key exists for ticket_id
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'notifications_ticket_id_fkey'
      ) THEN
        ALTER TABLE public.notifications
        ADD CONSTRAINT notifications_ticket_id_fkey
        FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE SET NULL;
      END IF;
    END $$;
  `);

  // 3. Backfill ticket_status for existing notifications from tickets table
  await client.query(`
    UPDATE public.notifications n
    SET ticket_status = t.status
    FROM public.tickets t
    WHERE n.ticket_id = t.id;
  `);
  console.log('Backfilled ticket_status on existing notifications');

  // 4. Find all existing send_or_stack_notification functions and drop them
  const funcs = await client.query(`
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'send_or_stack_notification';
  `);
  for (const f of funcs.rows) {
    console.log(`Dropping function public.send_or_stack_notification(${f.args})`);
    await client.query(`DROP FUNCTION public.send_or_stack_notification(${f.args});`);
  }

  // 5. Create new send_or_stack_notification function with ticket_status support
  await client.query(`
    CREATE OR REPLACE FUNCTION public.send_or_stack_notification(
      p_user_id UUID,
      p_type TEXT,
      p_title TEXT,
      p_message TEXT,
      p_ticket_id UUID DEFAULT NULL,
      p_ticket_number TEXT DEFAULT NULL,
      p_actor_id UUID DEFAULT NULL,
      p_actor_name TEXT DEFAULT NULL,
      p_action_url TEXT DEFAULT NULL,
      p_group_key TEXT DEFAULT NULL,
      p_ticket_status TEXT DEFAULT NULL
    )
    RETURNS UUID
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      v_target_group TEXT;
      v_id UUID;
      v_stack INT;
      v_status TEXT;
    BEGIN
      -- Unify group key for any ticket notifications to ensure they always stack per ticket
      IF p_ticket_id IS NOT NULL THEN
        v_target_group := 'ticket-' || p_ticket_id::text;
        -- If status not provided, fetch current status from tickets
        IF p_ticket_status IS NULL THEN
          SELECT status INTO v_status FROM public.tickets WHERE id = p_ticket_id;
        ELSE
          v_status := p_ticket_status;
        END IF;
      ELSE
        v_target_group := p_group_key;
        v_status := p_ticket_status;
      END IF;

      -- Check if an existing notification exists for this user and group
      IF v_target_group IS NOT NULL THEN
        SELECT id, stack_count INTO v_id, v_stack
        FROM public.notifications
        WHERE user_id = p_user_id
          AND (group_key = v_target_group OR (p_ticket_id IS NOT NULL AND ticket_id = p_ticket_id))
        ORDER BY updated_at DESC
        LIMIT 1;
      END IF;

      IF v_id IS NOT NULL THEN
        UPDATE public.notifications
        SET
          stack_count = COALESCE(v_stack, 1) + 1,
          type = p_type,
          title = p_title,
          message = p_message,
          ticket_id = COALESCE(p_ticket_id, ticket_id),
          ticket_number = COALESCE(p_ticket_number, ticket_number),
          ticket_status = COALESCE(v_status, ticket_status),
          actor_id = p_actor_id,
          actor_name = p_actor_name,
          action_url = COALESCE(p_action_url, action_url),
          group_key = v_target_group,
          is_read = false,
          updated_at = NOW()
        WHERE id = v_id;

        RETURN v_id;
      ELSE
        INSERT INTO public.notifications (
          user_id,
          type,
          title,
          message,
          ticket_id,
          ticket_number,
          ticket_status,
          actor_id,
          actor_name,
          action_url,
          group_key,
          stack_count,
          is_read,
          created_at,
          updated_at
        ) VALUES (
          p_user_id,
          p_type,
          p_title,
          p_message,
          p_ticket_id,
          p_ticket_number,
          v_status,
          p_actor_id,
          p_actor_name,
          p_action_url,
          v_target_group,
          1,
          false,
          NOW(),
          NOW()
        ) RETURNING id INTO v_id;

        RETURN v_id;
      END IF;
    END;
    $$;

    GRANT EXECUTE ON FUNCTION public.send_or_stack_notification TO authenticated, anon, service_role;
  `);
  console.log('Updated send_or_stack_notification function with ticket_status support');

  await client.end();
  console.log('Migration complete!');
}

run().catch(console.error);
