-- Migration for Ticket Chat Reads and Group Chat Read Avatars
-- 1. ticket_reads table for tracking when users read ticket conversations
CREATE TABLE IF NOT EXISTS public.ticket_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_ticket_user_read UNIQUE (ticket_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ticket_reads_lookup ON public.ticket_reads (ticket_id, user_id);

ALTER TABLE public.ticket_reads ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.ticket_reads FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.ticket_reads TO authenticated;
GRANT ALL ON public.ticket_reads TO service_role;

DROP POLICY IF EXISTS "Authenticated can view ticket_reads" ON public.ticket_reads;
CREATE POLICY "Authenticated can view ticket_reads" ON public.ticket_reads
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can insert own ticket_reads" ON public.ticket_reads;
CREATE POLICY "Authenticated can insert own ticket_reads" ON public.ticket_reads
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated can update own ticket_reads" ON public.ticket_reads;
CREATE POLICY "Authenticated can update own ticket_reads" ON public.ticket_reads
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. Allow group members to view each other's group_chat_reads so Messenger-style avatars can be displayed
DROP POLICY IF EXISTS "Users can view own group_chat_reads" ON public.group_chat_reads;
DROP POLICY IF EXISTS "Group members can view group_chat_reads" ON public.group_chat_reads;
CREATE POLICY "Group members can view group_chat_reads" ON public.group_chat_reads
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND ((chat_type = 'pm'    AND p.role IN ('PM', 'ADMIN'))
          OR (chat_type = 'dev'   AND p.role IN ('DEV', 'ADMIN'))
          OR (chat_type = 'staff' AND p.role IN ('PM', 'DEV', 'ADMIN')))
    )
  );

-- 3. Add ticket_reads and group_chat_reads to supabase_realtime publication
DO $$
DECLARE t text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH t IN ARRAY ARRAY['ticket_reads', 'group_chat_reads'] LOOP
      IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                     WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
      END IF;
    END LOOP;
  END IF;
END $$;
