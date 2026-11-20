-- Lock down sign-up roles, the admin functions, profile edits and comment visibility.
--
-- Before this change:
--   * sign-up took the account's role from the sign-up details, so anyone could register as ADMIN;
--   * admin_reset_user_password and admin_update_profile did not check who was calling them, and visitors who
--     were not signed in could call them, so anyone could set any user's password or role;
--   * a signed-in user could change their own role by editing their profile row directly;
--   * visitors who were not signed in could read every ticket comment.
-- Test: supabase/tests/security_test.sql (run against a throwaway copy of the database).


-- 1. Sign-up: every new account starts as CLIENT. Any role in the sign-up details is ignored; only an admin can
--    change a role afterwards, through admin_update_profile.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'CLIENT'::public.user_role
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = EXCLUDED.full_name;          -- an existing profile keeps its role
  RETURN NEW;
END;
$function$;


-- 2. Password reset: only a signed-in ADMIN may reset someone's password.
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(target_user_id uuid, new_plain_password text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN') THEN
    RAISE EXCEPTION 'Only an admin can reset passwords' USING ERRCODE = '42501';
  END IF;

  UPDATE auth.users
  SET encrypted_password = crypt(new_plain_password, gen_salt('bf')),
      updated_at = now()
  WHERE id = target_user_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_reset_user_password(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reset_user_password(uuid, text) TO authenticated, service_role;


-- 3. Role and system assignment: only a signed-in ADMIN may change them.
CREATE OR REPLACE FUNCTION public.admin_update_profile(
  target_user_id uuid,
  new_role public.user_role DEFAULT NULL::public.user_role,
  new_assigned_system_type_id uuid DEFAULT NULL::uuid,
  update_system_type boolean DEFAULT false
)
 RETURNS SETOF public.profiles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN') THEN
    RAISE EXCEPTION 'Only an admin can change roles or system assignments' USING ERRCODE = '42501';
  END IF;

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
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_update_profile(uuid, public.user_role, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_profile(uuid, public.user_role, uuid, boolean) TO authenticated, service_role;


-- 4. Profile edits: signed-in users may change only the fields the profile page edits. Role and system assignment
--    change only through admin_update_profile above.
REVOKE UPDATE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (full_name, avatar_url, birthdate, updated_at) ON public.profiles TO authenticated;


-- 5. Comments: readable only by signed-in users (until now, also by visitors who were not signed in).
DROP POLICY IF EXISTS "Ticket comments viewable by participants" ON public.ticket_comments;
CREATE POLICY "Ticket comments viewable by signed-in users"
  ON public.ticket_comments
  FOR SELECT
  TO authenticated
  USING (true);
