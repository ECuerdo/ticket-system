-- Database changes for pinning, replying, editing, deleting and reacting in the group chats, unread counts, and
-- replies / edits on ticket comments (pull request #9).
--
-- Pull request #9 made these with one-off scripts (supabase/update-group-chats.js, setup-group-chat-soft-delete.js,
-- add-chat-features.js, add-reply-support.js, setup-group-chat-reads.js, check-realtime.js), run on the cloud test
-- database only. The automatic deploy applies only the files in supabase/migrations, so the live database did not
-- get them and the group chats could not load there.
--
-- Every statement is safe to run again: on a database that already has a change, it does nothing.
--
-- Differences from the scripts, on purpose (the same rules the API in src/app/api/group-chats already applies):
--   * Changing chat messages: the scripts let every signed-in user, clients included, change any message in any
--     chat. Here only members of a chat may update its messages (to pin or unpin), and only the author or an
--     ADMIN may edit or delete a message; a message's author and time can never be changed.
--   * Reactions: the scripts let every signed-in user see all reactions and react in any chat. Here only members
--     of a chat may see and add reactions in it, and everyone removes only their own.
--   * Visitors who are not signed in get no permissions on the new tables.


-- 1. Who may use which chat (the API's roles): pm = PM and ADMIN, dev = DEV and ADMIN, staff = PM, DEV and ADMIN.
CREATE OR REPLACE FUNCTION public.can_use_group_chat(p_chat_type text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND ((p_chat_type = 'pm'    AND p.role IN ('PM', 'ADMIN'))
        OR (p_chat_type = 'dev'   AND p.role IN ('DEV', 'ADMIN'))
        OR (p_chat_type = 'staff' AND p.role IN ('PM', 'DEV', 'ADMIN')))
  )
$function$;
REVOKE ALL ON FUNCTION public.can_use_group_chat(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_use_group_chat(text) TO authenticated, service_role;


-- 2. New columns on the three chat tables: pinning, deleting (kept, marked deleted), replies, edits.
ALTER TABLE public.pm_chat_messages
  ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS pinned_at timestamptz,
  ADD COLUMN IF NOT EXISTS pinned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.pm_chat_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_edited boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz;

ALTER TABLE public.dev_chat_messages
  ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS pinned_at timestamptz,
  ADD COLUMN IF NOT EXISTS pinned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.dev_chat_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_edited boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz;

ALTER TABLE public.staff_chat_messages
  ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS pinned_at timestamptz,
  ADD COLUMN IF NOT EXISTS pinned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.staff_chat_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_edited boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_pm_chat_pinned ON public.pm_chat_messages (is_pinned) WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_dev_chat_pinned ON public.dev_chat_messages (is_pinned) WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_staff_chat_pinned ON public.staff_chat_messages (is_pinned) WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_pm_chat_reply ON public.pm_chat_messages (reply_to_id) WHERE reply_to_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dev_chat_reply ON public.dev_chat_messages (reply_to_id) WHERE reply_to_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_staff_chat_reply ON public.staff_chat_messages (reply_to_id) WHERE reply_to_id IS NOT NULL;


-- 3. Changing chat messages: members of the chat may update (pin / unpin); only the author or an ADMIN may change
--    the text, attachments, reply or deleted state; nobody may change the author or the time.
CREATE OR REPLACE FUNCTION public.guard_group_chat_message_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN                      -- the service role and database administrators
    RETURN NEW;
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'The author and time of a chat message cannot be changed.' USING ERRCODE = '42501';
  END IF;
  IF (NEW.message IS DISTINCT FROM OLD.message OR NEW.attachments IS DISTINCT FROM OLD.attachments
      OR NEW.reply_to_id IS DISTINCT FROM OLD.reply_to_id
      OR NEW.is_edited IS DISTINCT FROM OLD.is_edited OR NEW.edited_at IS DISTINCT FROM OLD.edited_at
      OR NEW.is_deleted IS DISTINCT FROM OLD.is_deleted OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
      OR NEW.deleted_by IS DISTINCT FROM OLD.deleted_by)
     AND OLD.user_id <> auth.uid()
     AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN') THEN
    RAISE EXCEPTION 'Only the author or an admin can edit or delete this message.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.guard_group_chat_message_update() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS guard_pm_chat_message_update ON public.pm_chat_messages;
CREATE TRIGGER guard_pm_chat_message_update BEFORE UPDATE ON public.pm_chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.guard_group_chat_message_update();
DROP TRIGGER IF EXISTS guard_dev_chat_message_update ON public.dev_chat_messages;
CREATE TRIGGER guard_dev_chat_message_update BEFORE UPDATE ON public.dev_chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.guard_group_chat_message_update();
DROP TRIGGER IF EXISTS guard_staff_chat_message_update ON public.staff_chat_messages;
CREATE TRIGGER guard_staff_chat_message_update BEFORE UPDATE ON public.staff_chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.guard_group_chat_message_update();

GRANT UPDATE ON public.pm_chat_messages, public.dev_chat_messages, public.staff_chat_messages TO authenticated;

DROP POLICY IF EXISTS "Staff can update pm_chat_messages" ON public.pm_chat_messages;
CREATE POLICY "Staff can update pm_chat_messages" ON public.pm_chat_messages
  FOR UPDATE TO authenticated
  USING (public.can_use_group_chat('pm')) WITH CHECK (public.can_use_group_chat('pm'));
DROP POLICY IF EXISTS "Staff can update dev_chat_messages" ON public.dev_chat_messages;
CREATE POLICY "Staff can update dev_chat_messages" ON public.dev_chat_messages
  FOR UPDATE TO authenticated
  USING (public.can_use_group_chat('dev')) WITH CHECK (public.can_use_group_chat('dev'));
DROP POLICY IF EXISTS "Staff can update staff_chat_messages" ON public.staff_chat_messages;
CREATE POLICY "Staff can update staff_chat_messages" ON public.staff_chat_messages
  FOR UPDATE TO authenticated
  USING (public.can_use_group_chat('staff')) WITH CHECK (public.can_use_group_chat('staff'));


-- 4. Reactions on chat messages: members of the chat see and add them; everyone removes only their own.
CREATE TABLE IF NOT EXISTS public.group_chat_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_type text NOT NULL,
  message_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT uq_group_chat_reaction UNIQUE (chat_type, message_id, user_id, emoji)
);
CREATE INDEX IF NOT EXISTS idx_group_chat_reactions_lookup ON public.group_chat_reactions (chat_type, message_id);
ALTER TABLE public.group_chat_reactions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.group_chat_reactions FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.group_chat_reactions TO authenticated;
GRANT ALL ON public.group_chat_reactions TO service_role;

DROP POLICY IF EXISTS "Authenticated can view group_chat_reactions" ON public.group_chat_reactions;
CREATE POLICY "Authenticated can view group_chat_reactions" ON public.group_chat_reactions
  FOR SELECT TO authenticated
  USING (public.can_use_group_chat(chat_type));
DROP POLICY IF EXISTS "Authenticated can insert own group_chat_reactions" ON public.group_chat_reactions;
CREATE POLICY "Authenticated can insert own group_chat_reactions" ON public.group_chat_reactions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.can_use_group_chat(chat_type));
DROP POLICY IF EXISTS "Authenticated can delete own group_chat_reactions" ON public.group_chat_reactions;
CREATE POLICY "Authenticated can delete own group_chat_reactions" ON public.group_chat_reactions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());


-- 5. When each user last read each chat (unread counts): everyone sees and changes only their own.
CREATE TABLE IF NOT EXISTS public.group_chat_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  chat_type text NOT NULL,
  last_read_at timestamptz DEFAULT now(),
  CONSTRAINT uq_user_group_chat_read UNIQUE (user_id, chat_type)
);
CREATE INDEX IF NOT EXISTS idx_group_chat_reads_lookup ON public.group_chat_reads (user_id, chat_type);
ALTER TABLE public.group_chat_reads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.group_chat_reads FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.group_chat_reads TO authenticated;
GRANT ALL ON public.group_chat_reads TO service_role;

DROP POLICY IF EXISTS "Users can view own group_chat_reads" ON public.group_chat_reads;
CREATE POLICY "Users can view own group_chat_reads" ON public.group_chat_reads
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own group_chat_reads" ON public.group_chat_reads;
CREATE POLICY "Users can insert own group_chat_reads" ON public.group_chat_reads
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own group_chat_reads" ON public.group_chat_reads;
CREATE POLICY "Users can update own group_chat_reads" ON public.group_chat_reads
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- 6. Ticket comments: replies and edits.
ALTER TABLE public.ticket_comments
  ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.ticket_comments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_edited boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_ticket_comments_reply ON public.ticket_comments (reply_to_id) WHERE reply_to_id IS NOT NULL;


-- 7. Live updates (Supabase realtime) for reactions, chat messages and ticket comments, when the publication exists.
DO $$
DECLARE t text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH t IN ARRAY ARRAY['group_chat_reactions', 'pm_chat_messages', 'dev_chat_messages', 'staff_chat_messages',
                             'ticket_comments'] LOOP
      IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                     WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
      END IF;
    END LOOP;
  END IF;
END $$;
