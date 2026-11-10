-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum for User Roles
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('CLIENT', 'PM', 'DEV', 'ADMIN');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Enum for Ticket Status
DO $$ BEGIN
  CREATE TYPE ticket_status AS ENUM (
    'OPEN',
    'UNDER_REVIEW',
    'CONFIRMED_BUG',
    'IN_DEVELOPMENT',
    'RESOLVED',
    'REJECTED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Enum for Ticket Priority
DO $$ BEGIN
  CREATE TYPE ticket_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 1. Profiles Table (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'CLIENT',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. System Types (Configured by Admin)
CREATE TABLE IF NOT EXISTS public.system_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. System Choices / Categories (Configured by Admin per system type)
CREATE TABLE IF NOT EXISTS public.system_choices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_type_id UUID NOT NULL REFERENCES public.system_types(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- e.g. "Module", "Issue Type"
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Tickets Table
CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  system_type_id UUID NOT NULL REFERENCES public.system_types(id) ON DELETE RESTRICT,
  choice_id UUID REFERENCES public.system_choices(id) ON DELETE SET NULL,
  priority ticket_priority NOT NULL DEFAULT 'MEDIUM',
  status ticket_status NOT NULL DEFAULT 'OPEN',
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_pm_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_dev_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  pm_notes TEXT,
  dev_notes TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Ticket Comments / Audit Timeline
CREATE TABLE IF NOT EXISTS public.ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false, -- PM & Dev only viewable
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Sequence helper for ticket numbers (e.g. TCK-1001)
CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START 1001;

CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := 'TCK-' || nextval('ticket_number_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_ticket_number ON public.tickets;
CREATE TRIGGER trigger_generate_ticket_number
BEFORE INSERT ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION generate_ticket_number();

-- Auto-create profile on signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'CLIENT'::user_role)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_choices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by authenticated users"
ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- System Types & Choices Policies
CREATE POLICY "System types viewable by authenticated users"
ON public.system_types FOR SELECT TO authenticated USING (active = true OR EXISTS (
  SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'
));

CREATE POLICY "Admins manage system types"
ON public.system_types FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
);

CREATE POLICY "System choices viewable by authenticated users"
ON public.system_choices FOR SELECT TO authenticated USING (active = true OR EXISTS (
  SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'
));

CREATE POLICY "Admins manage system choices"
ON public.system_choices FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
);

-- Tickets Policies
CREATE POLICY "Clients see their own tickets"
ON public.tickets FOR SELECT TO authenticated USING (
  client_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('PM', 'ADMIN'))
  OR (assigned_dev_id = auth.uid())
);

CREATE POLICY "Clients can create tickets"
ON public.tickets FOR INSERT TO authenticated WITH CHECK (
  client_id = auth.uid()
);

CREATE POLICY "PM and Admin can update tickets"
ON public.tickets FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('PM', 'ADMIN'))
  OR (assigned_dev_id = auth.uid() AND status IN ('CONFIRMED_BUG', 'IN_DEVELOPMENT', 'RESOLVED'))
);

