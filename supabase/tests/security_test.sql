-- Security test for sign-up roles, the admin functions, profile edits and comment visibility.
--
-- Run it ONLY against a throwaway copy of the database (for example a local supabase/postgres container
-- loaded with the schema), never against a database people use: it creates test users inside one transaction
-- and rolls everything back at the end, but it calls the admin functions on purpose.
--
--   psql -v ON_ERROR_STOP=1 -f supabase/tests/security_test.sql
--
-- Each check prints PASS or FAIL. If any check fails, the script ends with an error (psql exit code 3).

BEGIN;

-- Results of every check, kept by the user running the test (never written by the roles under test).
CREATE TEMP TABLE test_results (check_name text, passed boolean, detail text);

-- Switch to a role the way Supabase's API does: the role itself plus the signed-in user's id, if any.
CREATE FUNCTION pg_temp.act_as(p_role text, p_user uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), true);          -- older auth.uid()
  PERFORM set_config('request.jwt.claims',
    json_build_object('role', p_role, 'sub', p_user)::text, true);                         -- newer auth.uid()
  EXECUTE format('SET LOCAL ROLE %I', p_role);                                             -- anon / authenticated
END $$;

-- Back to the user running the test, with no signed-in user.
CREATE FUNCTION pg_temp.act_as_tester() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE 'RESET ROLE';
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claims', '', true);
END $$;

-- Put the admin and client back to their starting role and password, so each check only shows its own effect.
CREATE FUNCTION pg_temp.reset_state() RETURNS void LANGUAGE sql AS $$
  UPDATE public.profiles SET role = 'CLIENT' WHERE id = '00000000-0000-4000-8000-00000000000c';
  UPDATE public.profiles SET role = 'ADMIN'  WHERE id = '00000000-0000-4000-8000-00000000000a';
  UPDATE auth.users SET encrypted_password = 'old-hash-admin'  WHERE id = '00000000-0000-4000-8000-00000000000a';
  UPDATE auth.users SET encrypted_password = 'old-hash-client' WHERE id = '00000000-0000-4000-8000-00000000000c';
$$;

-- ---------------------------------------------------------------------------------------------------------
-- Test data: one admin and one client. Sign-up goes through the real triggers on auth.users.
-- ---------------------------------------------------------------------------------------------------------
INSERT INTO auth.users (id, email, encrypted_password, raw_user_meta_data, aud, role)
VALUES
  ('00000000-0000-4000-8000-00000000000a', 'admin@test.local',  'old-hash-admin',  '{"full_name":"Test Admin"}',  'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-00000000000c', 'client@test.local', 'old-hash-client', '{"full_name":"Test Client"}', 'authenticated', 'authenticated');

UPDATE public.profiles SET role = 'ADMIN' WHERE id = '00000000-0000-4000-8000-00000000000a';  -- made admin by the owner

INSERT INTO public.system_types (id, name) VALUES ('00000000-0000-4000-8000-0000000000f1', 'Test System');
INSERT INTO public.tickets (id, ticket_number, title, description, system_type_id, client_id)
VALUES ('00000000-0000-4000-8000-0000000000f2', 'TEST-1', 'Test ticket', 'Test', '00000000-0000-4000-8000-0000000000f1',
        '00000000-0000-4000-8000-00000000000c');
INSERT INTO public.ticket_comments (ticket_id, user_id, content)
VALUES ('00000000-0000-4000-8000-0000000000f2', '00000000-0000-4000-8000-00000000000c', 'Test comment');

-- ---------------------------------------------------------------------------------------------------------
-- 1. Sign-up cannot choose a role: asking for ADMIN or PM still gives CLIENT; no role gives CLIENT.
-- ---------------------------------------------------------------------------------------------------------
INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role)
VALUES
  ('00000000-0000-4000-8000-0000000000e1', 'wants-admin@test.local', '{"full_name":"A","role":"ADMIN"}', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-0000000000e2', 'wants-pm@test.local',    '{"full_name":"B","role":"PM"}',    'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-0000000000e3', 'plain@test.local',       '{"full_name":"C"}',                'authenticated', 'authenticated');

INSERT INTO test_results
SELECT '1a sign-up asking for ADMIN gets CLIENT', role = 'CLIENT', 'got ' || role
FROM public.profiles WHERE id = '00000000-0000-4000-8000-0000000000e1';
INSERT INTO test_results
SELECT '1b sign-up asking for PM gets CLIENT', role = 'CLIENT', 'got ' || role
FROM public.profiles WHERE id = '00000000-0000-4000-8000-0000000000e2';
INSERT INTO test_results
SELECT '1c sign-up with no role gets CLIENT', role = 'CLIENT', 'got ' || role
FROM public.profiles WHERE id = '00000000-0000-4000-8000-0000000000e3';

-- ---------------------------------------------------------------------------------------------------------
-- 2. A visitor who is not signed in cannot reset anyone's password or change anyone's role.
-- ---------------------------------------------------------------------------------------------------------
SELECT pg_temp.reset_state();
DO $$
DECLARE v_err text := 'no error';
BEGIN
  PERFORM pg_temp.act_as('anon', NULL);
  BEGIN
    PERFORM public.admin_reset_user_password('00000000-0000-4000-8000-00000000000a', 'taken-over');
  EXCEPTION WHEN OTHERS THEN v_err := SQLERRM;
  END;
  PERFORM pg_temp.act_as_tester();
  INSERT INTO test_results
  SELECT '2a visitor cannot reset the admin password', encrypted_password = 'old-hash-admin', v_err
  FROM auth.users WHERE id = '00000000-0000-4000-8000-00000000000a';
END $$;

SELECT pg_temp.reset_state();
DO $$
DECLARE v_err text := 'no error';
BEGIN
  PERFORM pg_temp.act_as('anon', NULL);
  BEGIN
    PERFORM public.admin_update_profile('00000000-0000-4000-8000-00000000000c', 'ADMIN');
  EXCEPTION WHEN OTHERS THEN v_err := SQLERRM;
  END;
  PERFORM pg_temp.act_as_tester();
  INSERT INTO test_results
  SELECT '2b visitor cannot change a role', role = 'CLIENT', v_err || ' / role ' || role
  FROM public.profiles WHERE id = '00000000-0000-4000-8000-00000000000c';
END $$;

-- ---------------------------------------------------------------------------------------------------------
-- 3. A signed-in client cannot use the admin functions.
-- ---------------------------------------------------------------------------------------------------------
SELECT pg_temp.reset_state();
DO $$
DECLARE v_err text := 'no error';
BEGIN
  PERFORM pg_temp.act_as('authenticated', '00000000-0000-4000-8000-00000000000c');
  BEGIN
    PERFORM public.admin_reset_user_password('00000000-0000-4000-8000-00000000000a', 'taken-over');
  EXCEPTION WHEN OTHERS THEN v_err := SQLERRM;
  END;
  PERFORM pg_temp.act_as_tester();
  INSERT INTO test_results
  SELECT '3a client cannot reset the admin password', encrypted_password = 'old-hash-admin', v_err
  FROM auth.users WHERE id = '00000000-0000-4000-8000-00000000000a';
END $$;

SELECT pg_temp.reset_state();
DO $$
DECLARE v_err text := 'no error';
BEGIN
  PERFORM pg_temp.act_as('authenticated', '00000000-0000-4000-8000-00000000000c');
  BEGIN
    PERFORM public.admin_update_profile('00000000-0000-4000-8000-00000000000c', 'ADMIN');
  EXCEPTION WHEN OTHERS THEN v_err := SQLERRM;
  END;
  PERFORM pg_temp.act_as_tester();
  INSERT INTO test_results
  SELECT '3b client cannot make themselves ADMIN through admin_update_profile', role = 'CLIENT', v_err || ' / role ' || role
  FROM public.profiles WHERE id = '00000000-0000-4000-8000-00000000000c';
END $$;

-- ---------------------------------------------------------------------------------------------------------
-- 4. A signed-in client cannot change their own role (or assigned system) by editing their profile directly,
--    but can still change their name, birthdate and picture, which the profile page uses.
-- ---------------------------------------------------------------------------------------------------------
SELECT pg_temp.reset_state();
DO $$
DECLARE v_err text := 'no error';
BEGIN
  PERFORM pg_temp.act_as('authenticated', '00000000-0000-4000-8000-00000000000c');
  BEGIN
    UPDATE public.profiles SET role = 'ADMIN' WHERE id = '00000000-0000-4000-8000-00000000000c';
  EXCEPTION WHEN OTHERS THEN v_err := SQLERRM;
  END;
  PERFORM pg_temp.act_as_tester();
  INSERT INTO test_results
  SELECT '4a client cannot set their own role by editing the profile', role = 'CLIENT', v_err || ' / role ' || role
  FROM public.profiles WHERE id = '00000000-0000-4000-8000-00000000000c';
END $$;

SELECT pg_temp.reset_state();
DO $$
DECLARE v_err text := 'no error';
BEGIN
  PERFORM pg_temp.act_as('authenticated', '00000000-0000-4000-8000-00000000000c');
  BEGIN
    UPDATE public.profiles
    SET full_name = 'Renamed Client', birthdate = '2000-01-02', avatar_url = 'https://example.test/a.png', updated_at = now()
    WHERE id = '00000000-0000-4000-8000-00000000000c';
  EXCEPTION WHEN OTHERS THEN v_err := SQLERRM;
  END;
  PERFORM pg_temp.act_as_tester();
  INSERT INTO test_results
  SELECT '4b client can still edit name, birthdate and picture', full_name = 'Renamed Client' AND birthdate = '2000-01-02', v_err
  FROM public.profiles WHERE id = '00000000-0000-4000-8000-00000000000c';
END $$;

-- ---------------------------------------------------------------------------------------------------------
-- 5. A real admin can still reset a password and change a role (the admin page keeps working).
-- ---------------------------------------------------------------------------------------------------------
SELECT pg_temp.reset_state();
DO $$
DECLARE v_err text := 'no error';
BEGIN
  PERFORM pg_temp.act_as('authenticated', '00000000-0000-4000-8000-00000000000a');
  BEGIN
    PERFORM public.admin_reset_user_password('00000000-0000-4000-8000-00000000000c', 'new-password-123');
  EXCEPTION WHEN OTHERS THEN v_err := SQLERRM;
  END;
  PERFORM pg_temp.act_as_tester();
  INSERT INTO test_results
  SELECT '5a admin can reset a password', encrypted_password <> 'old-hash-client', v_err
  FROM auth.users WHERE id = '00000000-0000-4000-8000-00000000000c';
END $$;

SELECT pg_temp.reset_state();
DO $$
DECLARE v_err text := 'no error';
BEGIN
  PERFORM pg_temp.act_as('authenticated', '00000000-0000-4000-8000-00000000000a');
  BEGIN
    PERFORM public.admin_update_profile('00000000-0000-4000-8000-0000000000e3', 'PM');
  EXCEPTION WHEN OTHERS THEN v_err := SQLERRM;
  END;
  PERFORM pg_temp.act_as_tester();
  INSERT INTO test_results
  SELECT '5b admin can change a role', role = 'PM', v_err || ' / role ' || role
  FROM public.profiles WHERE id = '00000000-0000-4000-8000-0000000000e3';
END $$;

-- ---------------------------------------------------------------------------------------------------------
-- 6. Comments: a visitor who is not signed in sees none; a signed-in user still sees them.
-- ---------------------------------------------------------------------------------------------------------
DO $$
DECLARE v_n bigint := -1; v_err text := 'no error';
BEGIN
  PERFORM pg_temp.act_as('anon', NULL);
  BEGIN
    SELECT count(*) INTO v_n FROM public.ticket_comments;
  EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; v_n := 0;
  END;
  PERFORM pg_temp.act_as_tester();
  INSERT INTO test_results VALUES ('6a visitor sees no comments', v_n = 0, 'saw ' || v_n || ' / ' || v_err);
END $$;

DO $$
DECLARE v_n bigint := -1;
BEGIN
  PERFORM pg_temp.act_as('authenticated', '00000000-0000-4000-8000-00000000000c');
  SELECT count(*) INTO v_n FROM public.ticket_comments;
  PERFORM pg_temp.act_as_tester();
  INSERT INTO test_results VALUES ('6b signed-in user still sees comments', v_n = 1, 'saw ' || v_n);
END $$;

-- ---------------------------------------------------------------------------------------------------------
-- Report, then fail the run if any check failed. Everything above is rolled back either way.
-- ---------------------------------------------------------------------------------------------------------
SELECT CASE WHEN passed THEN 'PASS' ELSE 'FAIL' END AS result, check_name, detail
FROM test_results ORDER BY check_name;

DO $$
DECLARE v_failed int;
BEGIN
  SELECT count(*) INTO v_failed FROM test_results WHERE NOT passed;
  IF v_failed > 0 THEN
    RAISE EXCEPTION '% security check(s) failed', v_failed;
  END IF;
  RAISE NOTICE 'All security checks passed';
END $$;

ROLLBACK;
