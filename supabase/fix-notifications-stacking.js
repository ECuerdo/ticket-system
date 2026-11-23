const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function migrate() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  console.log('Connected to DB');

  // 1. Create or replace the stack_notification function
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
      p_group_key TEXT DEFAULT NULL
    )
    RETURNS UUID
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      v_target_group TEXT;
      v_id UUID;
      v_stack INT;
    BEGIN
      -- Unify group key for any ticket notifications to ensure they always stack per ticket
      IF p_ticket_id IS NOT NULL THEN
        v_target_group := 'ticket-' || p_ticket_id::text;
      ELSE
        v_target_group := p_group_key;
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
  console.log('Created send_or_stack_notification function');

  // 2. Also ensure notifications table allows authenticated insert and update if needed
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'notifications' AND policyname = 'Allow system or users to manage notifications'
      ) THEN
        CREATE POLICY "Allow system or users to manage notifications" ON public.notifications
        FOR ALL USING (true) WITH CHECK (true);
      END IF;
    END $$;
  `);

  // 3. Deduplicate existing notifications in the database
  console.log('Deduplicating existing notifications...');
  const res = await client.query(`
    SELECT user_id, COALESCE('ticket-' || ticket_id::text, group_key) as grp, array_agg(id ORDER BY updated_at DESC) as ids, count(*) as cnt
    FROM public.notifications
    WHERE ticket_id IS NOT NULL OR group_key IS NOT NULL
    GROUP BY user_id, COALESCE('ticket-' || ticket_id::text, group_key)
    HAVING count(*) > 1;
  `);

  for (const row of res.rows) {
    const [latestId, ...duplicateIds] = row.ids;
    // update latestId stack_count
    await client.query(
      `UPDATE public.notifications SET stack_count = stack_count + $1, group_key = $2 WHERE id = $3`,
      [duplicateIds.length, row.grp, latestId]
    );
    // delete duplicates
    await client.query(
      `DELETE FROM public.notifications WHERE id = ANY($1::uuid[])`,
      [duplicateIds]
    );
  }
  console.log(`Deduplicated ${res.rows.length} duplicate notification groups.`);

  await client.end();
  console.log('Done!');
}

migrate().catch(console.error);
