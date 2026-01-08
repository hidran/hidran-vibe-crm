-- =============================================
-- SQUASHED MIGRATION: Complete Schema Reset
-- =============================================

-- Drop existing tables (in dependency order)
DROP TABLE IF EXISTS public.attachments CASCADE;
DROP TABLE IF EXISTS public.invoice_line_items CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.organization_members CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;
DROP TABLE IF EXISTS public.weak_password_users CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS public.is_superadmin(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.has_org_access(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_org_role(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_org_member(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_all_users() CASCADE;
DROP FUNCTION IF EXISTS public.get_organization_members(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.invite_user_to_organization(text, uuid, public.app_role) CASCADE;
DROP FUNCTION IF EXISTS public.invite_user_to_organization(text, text, text, uuid, public.app_role) CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- Drop existing enums
DROP TYPE IF EXISTS public.app_role CASCADE;
DROP TYPE IF EXISTS public.client_status CASCADE;
DROP TYPE IF EXISTS public.invoice_status CASCADE;
DROP TYPE IF EXISTS public.project_priority CASCADE;
DROP TYPE IF EXISTS public.project_status CASCADE;
DROP TYPE IF EXISTS public.task_priority CASCADE;
DROP TYPE IF EXISTS public.task_status CASCADE;

-- =============================================
-- ENUMS
-- =============================================
CREATE TYPE public.app_role AS ENUM ('superadmin', 'owner', 'admin', 'member', 'client');
CREATE TYPE public.client_status AS ENUM ('active', 'inactive', 'prospect');
CREATE TYPE public.invoice_status AS ENUM ('pending', 'sent', 'paid');
CREATE TYPE public.project_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE public.project_status AS ENUM ('planning', 'active', 'on_hold', 'completed', 'cancelled');
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE public.task_status AS ENUM ('backlog', 'todo', 'in_progress', 'review', 'done');

-- =============================================
-- TABLES
-- =============================================

-- Organizations
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  plan text DEFAULT 'free',
  legal_name text,
  tax_id text,
  website text,
  industry text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text,
  last_name text,
  avatar_url text,
  biography text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- User Roles (for superadmin)
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Organization Members
CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Clients
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  vat_number text,
  address text,
  notes text,
  status public.client_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Projects
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  status public.project_status NOT NULL DEFAULT 'planning',
  priority public.project_priority NOT NULL DEFAULT 'medium',
  budget numeric,
  start_date date,
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tasks
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  assignee_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  status public.task_status NOT NULL DEFAULT 'backlog',
  priority public.task_priority NOT NULL DEFAULT 'medium',
  position integer DEFAULT 0,
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Invoices
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  invoice_number text NOT NULL,
  total_amount numeric DEFAULT 0,
  status public.invoice_status NOT NULL DEFAULT 'pending',
  issue_date date DEFAULT CURRENT_DATE,
  due_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, invoice_number)
);

-- Invoice Line Items
CREATE TABLE public.invoice_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric DEFAULT 1,
  unit_price numeric NOT NULL,
  total numeric GENERATED ALWAYS AS (quantity * unit_price) STORED,
  position integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Attachments
CREATE TABLE public.attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  file_size integer,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_organization_members_org ON public.organization_members(organization_id);
CREATE INDEX idx_organization_members_user ON public.organization_members(user_id);
CREATE INDEX idx_clients_org ON public.clients(organization_id);
CREATE INDEX idx_projects_org ON public.projects(organization_id);
CREATE INDEX idx_projects_client ON public.projects(client_id);
CREATE INDEX idx_tasks_org ON public.tasks(organization_id);
CREATE INDEX idx_tasks_project ON public.tasks(project_id);
CREATE INDEX idx_tasks_assignee ON public.tasks(assignee_id);
CREATE INDEX idx_invoices_org ON public.invoices(organization_id);
CREATE INDEX idx_invoices_client ON public.invoices(client_id);
CREATE INDEX idx_attachments_org ON public.attachments(organization_id);
CREATE INDEX idx_attachments_project ON public.attachments(project_id);
CREATE INDEX idx_attachments_task ON public.attachments(task_id);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Check if user is superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'superadmin'
  );
$$;

-- Check if user is org member
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND organization_id = _org_id
  );
$$;

-- Get user's role in organization
CREATE OR REPLACE FUNCTION public.get_user_org_role(_user_id uuid, _org_id uuid)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.organization_members
  WHERE user_id = _user_id AND organization_id = _org_id
  LIMIT 1;
$$;

-- Check if user has access to organization
CREATE OR REPLACE FUNCTION public.has_org_access(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_superadmin(_user_id) OR public.is_org_member(_user_id, _org_id);
$$;

-- Get all users (superadmin only)
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  email text,
  first_name text,
  last_name text,
  organization_id uuid,
  organization_name text,
  role public.app_role,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_superadmin(auth.uid()) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    om.id,
    om.user_id,
    au.email::text,
    p.first_name,
    p.last_name,
    om.organization_id,
    o.name AS organization_name,
    om.role,
    om.created_at
  FROM public.organization_members om
  JOIN auth.users au ON au.id = om.user_id
  LEFT JOIN public.profiles p ON p.id = om.user_id
  LEFT JOIN public.organizations o ON o.id = om.organization_id
  ORDER BY om.created_at DESC;
END;
$$;

-- Get organization members (with auth check)
CREATE OR REPLACE FUNCTION public.get_organization_members(_org_id uuid)
RETURNS TABLE (
  user_id uuid,
  email text,
  first_name text,
  last_name text,
  role public.app_role,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_superadmin(auth.uid()) OR public.is_org_member(auth.uid(), _org_id)) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    om.user_id,
    au.email::text,
    p.first_name,
    p.last_name,
    om.role,
    om.created_at
  FROM public.organization_members om
  JOIN auth.users au ON au.id = om.user_id
  LEFT JOIN public.profiles p ON p.id = om.user_id
  WHERE om.organization_id = _org_id
  ORDER BY om.created_at;
END;
$$;

-- Invite user to organization
CREATE OR REPLACE FUNCTION public.invite_user_to_organization(
  _email text,
  _first_name text DEFAULT NULL,
  _last_name text DEFAULT NULL,
  _org_id uuid DEFAULT NULL,
  _role public.app_role DEFAULT 'member'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _temp_password text;
BEGIN
  -- Check authorization
  IF NOT (public.is_superadmin(auth.uid()) OR 
          public.get_user_org_role(auth.uid(), _org_id) IN ('owner', 'admin')) THEN
    RAISE EXCEPTION 'Not authorized to invite users';
  END IF;

  -- Check if user exists
  SELECT id INTO _user_id FROM auth.users WHERE email = _email;

  IF _user_id IS NULL THEN
    -- Generate secure temp password
    _temp_password := encode(extensions.gen_random_bytes(16), 'hex');
    
    -- Create new user
    _user_id := extensions.uuid_generate_v4();
    
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, instance_id, aud, role)
    VALUES (
      _user_id,
      _email,
      extensions.crypt(_temp_password, extensions.gen_salt('bf')),
      now(),
      now(),
      now(),
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated'
    );

    -- Create profile
    INSERT INTO public.profiles (id, first_name, last_name)
    VALUES (_user_id, _first_name, _last_name);
  END IF;

  -- Add to organization
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (_org_id, _user_id, _role)
  ON CONFLICT (organization_id, user_id) DO UPDATE SET role = _role;

  RETURN _user_id;
END;
$$;

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Handle new user (create profile)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  RETURN NEW;
END;
$$;

-- =============================================
-- TRIGGERS
-- =============================================
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- ENABLE RLS
-- =============================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Organizations
CREATE POLICY "Users can create organizations" ON public.organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Members can view their organizations" ON public.organizations
  FOR SELECT USING (is_superadmin(auth.uid()) OR is_org_member(auth.uid(), id));

CREATE POLICY "Superadmins can manage organizations" ON public.organizations
  FOR UPDATE USING (is_superadmin(auth.uid()));

CREATE POLICY "Superadmins can delete organizations" ON public.organizations
  FOR DELETE USING (is_superadmin(auth.uid()));

-- Profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Superadmins can view all profiles" ON public.profiles
  FOR SELECT USING (is_superadmin(auth.uid()));

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- User Roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Superadmins can manage all roles" ON public.user_roles
  FOR ALL USING (is_superadmin(auth.uid()));

-- Organization Members
CREATE POLICY "Members can view org members" ON public.organization_members
  FOR SELECT USING (is_superadmin(auth.uid()) OR is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can create org membership" ON public.organization_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update org members" ON public.organization_members
  FOR UPDATE USING (is_superadmin(auth.uid()) OR get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin'));

CREATE POLICY "Admins can delete org members" ON public.organization_members
  FOR DELETE USING (is_superadmin(auth.uid()) OR get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin'));

-- Clients
CREATE POLICY "Org members can view clients" ON public.clients
  FOR SELECT USING (has_org_access(auth.uid(), organization_id));

CREATE POLICY "Org members can manage clients" ON public.clients
  FOR ALL USING (is_superadmin(auth.uid()) OR get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'member'));

-- Projects
CREATE POLICY "Org members can view projects" ON public.projects
  FOR SELECT USING (has_org_access(auth.uid(), organization_id));

CREATE POLICY "Org members can manage projects" ON public.projects
  FOR ALL USING (is_superadmin(auth.uid()) OR get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'member'));

-- Tasks
CREATE POLICY "Org members can view tasks" ON public.tasks
  FOR SELECT USING (has_org_access(auth.uid(), organization_id));

CREATE POLICY "Org members can manage tasks" ON public.tasks
  FOR ALL USING (is_superadmin(auth.uid()) OR get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'member'));

-- Invoices
CREATE POLICY "Org members can view invoices" ON public.invoices
  FOR SELECT USING (has_org_access(auth.uid(), organization_id));

CREATE POLICY "Org admins can manage invoices" ON public.invoices
  FOR ALL USING (is_superadmin(auth.uid()) OR get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin'));

-- Invoice Line Items
CREATE POLICY "Users can view line items of accessible invoices" ON public.invoice_line_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id AND has_org_access(auth.uid(), i.organization_id)
    )
  );

CREATE POLICY "Admins can manage line items" ON public.invoice_line_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id AND (
        is_superadmin(auth.uid()) OR 
        get_user_org_role(auth.uid(), i.organization_id) IN ('owner', 'admin')
      )
    )
  );

-- Attachments
CREATE POLICY "Org members can view attachments" ON public.attachments
  FOR SELECT USING (has_org_access(auth.uid(), organization_id));

CREATE POLICY "Org members can manage attachments" ON public.attachments
  FOR ALL USING (is_superadmin(auth.uid()) OR get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'member'));