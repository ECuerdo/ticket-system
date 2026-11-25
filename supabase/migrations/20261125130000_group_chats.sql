-- Database tables for the group chats (PM chat, dev chat, staff chat) and their on/off settings (pull request #7).
--
-- Pull request #7 created these with the one-off script supabase/setup-group-chats.js, run on the cloud test
-- database only. The automatic deploy applies only the files in supabase/migrations, so the live database did not
-- get them and the chats could not load or send messages there.
--
-- Every statement is safe to run again: on a database that already has a change, it does nothing.
--
-- Differences from supabase/setup-group-chats.js, on purpose:
--   * Who may read and post is enforced by the database, matching the roles the API already checks
--     (src/app/api/group-chats): PM chat = PM and ADMIN, dev chat = DEV and ADMIN, staff chat = PM, DEV and ADMIN.
--     The script's rules let every signed-in user, including clients, read and post in all three chats, and the
--     browser reads these tables directly, so the API's checks alone do not protect them.
--   * Posting while a chat is switched off is allowed only for ADMIN, as in the API.
--   * Only ADMIN may change group_chat_settings (the script let every signed-in user change them).
--   * Visitors who are not signed in get no permissions on these tables.


-- 1. Tables
CREATE TABLE IF NOT EXISTS public.pm_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dev_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.staff_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.group_chat_settings (
  id int PRIMARY KEY DEFAULT 1,
  pm_chat_enabled boolean DEFAULT true,
  dev_chat_enabled boolean DEFAULT true,
  staff_chat_enabled boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

INSERT INTO public.group_chat_settings (id, pm_chat_enabled, dev_chat_enabled, staff_chat_enabled)
VALUES (1, true, true, true)
ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_pm_chat_messages_created_at ON public.pm_chat_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dev_chat_messages_created_at ON public.dev_chat_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_chat_messages_created_at ON public.staff_chat_messages (created_at DESC);


-- 2. Permissions: new tables get every permission for anon by default; signed-in users get only what the rules
--    below need.
ALTER TABLE public.pm_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dev_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_chat_settings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.pm_chat_messages, public.dev_chat_messages, public.staff_chat_messages,
              public.group_chat_settings FROM anon, authenticated;
GRANT SELECT, INSERT ON public.pm_chat_messages, public.dev_chat_messages, public.staff_chat_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.group_chat_settings TO authenticated;
GRANT ALL ON public.pm_chat_messages, public.dev_chat_messages, public.staff_chat_messages,
             public.group_chat_settings TO service_role;


-- 3. Rules. The script's rules (same names) are replaced; each chat is limited to the roles the API allows.
DROP POLICY IF EXISTS "Anyone authenticated can view group_chat_settings" ON public.group_chat_settings;
CREATE POLICY "Anyone authenticated can view group_chat_settings" ON public.group_chat_settings
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can update group_chat_settings" ON public.group_chat_settings;
CREATE POLICY "Admins can update group_chat_settings" ON public.group_chat_settings
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN'));

-- PM chat: PM and ADMIN
DROP POLICY IF EXISTS "PM and Admin can view pm_chat_messages" ON public.pm_chat_messages;
CREATE POLICY "PM and Admin can view pm_chat_messages" ON public.pm_chat_messages
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('PM', 'ADMIN')));

DROP POLICY IF EXISTS "PM and Admin can insert pm_chat_messages" ON public.pm_chat_messages;
CREATE POLICY "PM and Admin can insert pm_chat_messages" ON public.pm_chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('PM', 'ADMIN')
                AND (p.role = 'ADMIN'
                     OR EXISTS (SELECT 1 FROM public.group_chat_settings s WHERE s.id = 1 AND s.pm_chat_enabled)))
  );

-- Dev chat: DEV and ADMIN
DROP POLICY IF EXISTS "DEV and Admin can view dev_chat_messages" ON public.dev_chat_messages;
CREATE POLICY "DEV and Admin can view dev_chat_messages" ON public.dev_chat_messages
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('DEV', 'ADMIN')));

DROP POLICY IF EXISTS "DEV and Admin can insert dev_chat_messages" ON public.dev_chat_messages;
CREATE POLICY "DEV and Admin can insert dev_chat_messages" ON public.dev_chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('DEV', 'ADMIN')
                AND (p.role = 'ADMIN'
                     OR EXISTS (SELECT 1 FROM public.group_chat_settings s WHERE s.id = 1 AND s.dev_chat_enabled)))
  );

-- Staff chat: PM, DEV and ADMIN
DROP POLICY IF EXISTS "Staff can view staff_chat_messages" ON public.staff_chat_messages;
CREATE POLICY "Staff can view staff_chat_messages" ON public.staff_chat_messages
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('PM', 'DEV', 'ADMIN')));

DROP POLICY IF EXISTS "Staff can insert staff_chat_messages" ON public.staff_chat_messages;
CREATE POLICY "Staff can insert staff_chat_messages" ON public.staff_chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('PM', 'DEV', 'ADMIN')
                AND (p.role = 'ADMIN'
                     OR EXISTS (SELECT 1 FROM public.group_chat_settings s WHERE s.id = 1 AND s.staff_chat_enabled)))
  );


-- 4. Live updates in the chat window (Supabase realtime), when the realtime publication exists.
DO $$
DECLARE t text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH t IN ARRAY ARRAY['pm_chat_messages', 'dev_chat_messages', 'staff_chat_messages'] LOOP
      IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                     WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
      END IF;
    END LOOP;
  END IF;
END $$;
