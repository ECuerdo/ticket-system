-- Database changes for the Hall of Fame / Hall of Shame, PM scopes, ticket links, the "human error" tag and the
-- notification status badge (pull request #4).
--
-- Pull request #4 made these changes with one-off scripts in supabase/*.js, which were run on the cloud test
-- database only. The automatic deploy applies only the files in supabase/migrations, so the live database did not
-- get them, and creating a ticket there failed (the app now always sends link_url).
--
-- Every statement is safe to run again: on a database that already has a change, it does nothing.
--
-- Differences from the supabase/*.js scripts, on purpose:
--   * The notifications policy "Allow system or users to manage notifications" (FOR ALL USING (true), no role)
--     is left out. It would let anyone holding the public key, including visitors who are not signed in, read,
--     change or delete every user's notifications. The app does not need it: notifications are sent with the
--     service-role key, which is not limited by these policies.
--   * send_or_stack_notification may be called only with the service-role key (as src/lib/notifications.ts does),
--     not by visitors or signed-in users directly, because it can create a notification for any user. It also
--     gets a fixed search_path, like the other SECURITY DEFINER functions.
--   * The one-off removal of duplicate notifications is left out: it deletes rows, and the old stacking is gone.
--   * pm_system_scopes gets no permissions for anon (visitors who are not signed in).


-- 1. Tickets: optional link, and the "human error" tag (shown to DEV, PM and ADMIN only; the API hides it from
--    clients).
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS link_url text;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS is_human_error boolean DEFAULT false;


-- 2. PM scopes: which system types each PM covers (a PM can now cover more than one).
CREATE TABLE IF NOT EXISTS public.pm_system_scopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pm_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  system_type_id uuid NOT NULL REFERENCES public.system_types(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (pm_id, system_type_id)
);
ALTER TABLE public.pm_system_scopes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pm_system_scopes'
                 AND policyname = 'Allow authenticated read pm_system_scopes') THEN
    CREATE POLICY "Allow authenticated read pm_system_scopes" ON public.pm_system_scopes
      FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pm_system_scopes'
                 AND policyname = 'Allow admin write pm_system_scopes') THEN
    CREATE POLICY "Allow admin write pm_system_scopes" ON public.pm_system_scopes
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));
  END IF;
END $$;

-- New tables get every permission for anon by default; take it away here (only signed-in users and the service
-- role use this table).
REVOKE ALL ON public.pm_system_scopes FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_system_scopes TO authenticated, service_role;

-- Copy each PM's existing single system type into the new table, only when the table is still empty (so running
-- this file again never brings back a scope an admin has removed).
INSERT INTO public.pm_system_scopes (pm_id, system_type_id)
SELECT p.id, p.assigned_system_type_id
FROM public.profiles p
WHERE p.assigned_system_type_id IS NOT NULL
  AND p.role = 'PM'
  AND NOT EXISTS (SELECT 1 FROM public.pm_system_scopes)
ON CONFLICT (pm_id, system_type_id) DO NOTHING;


-- 3. Notifications: the ticket's status, shown as a badge in the notification bell.
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS ticket_status text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_schema = 'public'
                 AND table_name = 'notifications' AND constraint_name = 'notifications_ticket_id_fkey') THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_ticket_id_fkey
      FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Fill in the status for existing notifications that do not have one yet.
UPDATE public.notifications n
SET ticket_status = t.status
FROM public.tickets t
WHERE n.ticket_id = t.id
  AND n.ticket_status IS NULL;


-- 4. send_or_stack_notification: one notification per user and ticket; a new event updates it and counts it.
--    The older version without p_ticket_status is removed first, so the app's call always finds this one.
DROP FUNCTION IF EXISTS public.send_or_stack_notification(uuid, text, text, text, uuid, text, uuid, text, text, text);

CREATE OR REPLACE FUNCTION public.send_or_stack_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_ticket_id uuid DEFAULT NULL,
  p_ticket_number text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL,
  p_actor_name text DEFAULT NULL,
  p_action_url text DEFAULT NULL,
  p_group_key text DEFAULT NULL,
  p_ticket_status text DEFAULT NULL
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  v_target_group text;
  v_id uuid;
  v_stack int;
  v_status text;
BEGIN
  -- Notifications about a ticket always stack per ticket.
  IF p_ticket_id IS NOT NULL THEN
    v_target_group := 'ticket-' || p_ticket_id::text;
    IF p_ticket_status IS NULL THEN
      SELECT t.status INTO v_status FROM public.tickets t WHERE t.id = p_ticket_id;
    ELSE
      v_status := p_ticket_status;
    END IF;
  ELSE
    v_target_group := p_group_key;
    v_status := p_ticket_status;
  END IF;

  -- Is there already a notification for this user and group?
  IF v_target_group IS NOT NULL THEN
    SELECT n.id, n.stack_count INTO v_id, v_stack
    FROM public.notifications n
    WHERE n.user_id = p_user_id
      AND (n.group_key = v_target_group OR (p_ticket_id IS NOT NULL AND n.ticket_id = p_ticket_id))
    ORDER BY n.updated_at DESC
    LIMIT 1;
  END IF;

  IF v_id IS NOT NULL THEN
    UPDATE public.notifications
    SET stack_count = COALESCE(v_stack, 1) + 1,
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
        updated_at = now()
    WHERE id = v_id;
    RETURN v_id;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, message, ticket_id, ticket_number, ticket_status,
                                    actor_id, actor_name, action_url, group_key, stack_count, is_read,
                                    created_at, updated_at)
  VALUES (p_user_id, p_type, p_title, p_message, p_ticket_id, p_ticket_number, v_status,
          p_actor_id, p_actor_name, p_action_url, v_target_group, 1, false, now(), now())
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.send_or_stack_notification(uuid, text, text, text, uuid, text, uuid, text, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.send_or_stack_notification(uuid, text, text, text, uuid, text, uuid, text, text, text, text)
  TO service_role;
