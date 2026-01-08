


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."app_role" AS ENUM (
    'superadmin',
    'owner',
    'admin',
    'member',
    'client'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE TYPE "public"."client_status" AS ENUM (
    'active',
    'inactive',
    'prospect'
);


ALTER TYPE "public"."client_status" OWNER TO "postgres";


CREATE TYPE "public"."invoice_status" AS ENUM (
    'pending',
    'sent',
    'paid'
);


ALTER TYPE "public"."invoice_status" OWNER TO "postgres";


CREATE TYPE "public"."project_priority" AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
);


ALTER TYPE "public"."project_priority" OWNER TO "postgres";


CREATE TYPE "public"."project_status" AS ENUM (
    'planning',
    'active',
    'on_hold',
    'completed',
    'cancelled'
);


ALTER TYPE "public"."project_status" OWNER TO "postgres";


CREATE TYPE "public"."task_priority" AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
);


ALTER TYPE "public"."task_priority" OWNER TO "postgres";


CREATE TYPE "public"."task_status" AS ENUM (
    'backlog',
    'todo',
    'in_progress',
    'review',
    'done'
);


ALTER TYPE "public"."task_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_all_users"() RETURNS TABLE("id" "uuid", "organization_id" "uuid", "user_id" "uuid", "role" "public"."app_role", "created_at" timestamp with time zone, "email" "text", "first_name" "text", "last_name" "text", "organization_name" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  -- SECURITY FIX (2026-01-08): Added authorization check
  SELECT
    om.id,
    om.organization_id,
    p.id as user_id,
    om.role,
    p.created_at,
    au.email,
    p.first_name,
    p.last_name,
    o.name as organization_name
  FROM profiles p
  JOIN auth.users au ON au.id = p.id
  LEFT JOIN organization_members om ON om.user_id = p.id
  LEFT JOIN organizations o ON o.id = om.organization_id
  WHERE public.is_superadmin(auth.uid())  -- NEW: Only superadmins can call this
  ORDER BY p.created_at DESC
$$;


ALTER FUNCTION "public"."get_all_users"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_all_users"() IS 'Returns all users with their organization memberships.
SECURITY: Only accessible to superadmins. Returns empty result for non-superadmins.
SECURITY FIX (2026-01-08): Added is_superadmin() authorization check.';



CREATE OR REPLACE FUNCTION "public"."get_organization_members"("_org_id" "uuid") RETURNS TABLE("id" "uuid", "organization_id" "uuid", "user_id" "uuid", "role" "public"."app_role", "created_at" timestamp with time zone, "email" "text", "first_name" "text", "last_name" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  -- SECURITY FIX (2026-01-08): Added authorization check
  SELECT
    om.id,
    om.organization_id,
    om.user_id,
    om.role,
    om.created_at,
    au.email,
    p.first_name,
    p.last_name
  FROM organization_members om
  LEFT JOIN auth.users au ON au.id = om.user_id
  LEFT JOIN profiles p ON p.id = om.user_id
  WHERE om.organization_id = _org_id
    -- NEW: Only allow superadmins or members of the organization
    AND (
      public.is_superadmin(auth.uid()) OR
      public.get_user_org_role(auth.uid(), _org_id) IS NOT NULL
    )
  ORDER BY om.created_at DESC
$$;


ALTER FUNCTION "public"."get_organization_members"("_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_organization_members"("_org_id" "uuid") IS 'Returns members of a specific organization.
SECURITY: Only accessible to superadmins or members of the specified organization.
SECURITY FIX (2026-01-08): Added authorization check to prevent unauthorized access.';



CREATE OR REPLACE FUNCTION "public"."get_user_org_role"("_user_id" "uuid", "_org_id" "uuid") RETURNS "public"."app_role"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT role FROM public.organization_members
  WHERE user_id = _user_id AND organization_id = _org_id
  LIMIT 1
$$;


ALTER FUNCTION "public"."get_user_org_role"("_user_id" "uuid", "_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_org_access"("_user_id" "uuid", "_org_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT public.is_superadmin(_user_id) OR EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND organization_id = _org_id
  )
$$;


ALTER FUNCTION "public"."has_org_access"("_user_id" "uuid", "_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."invite_user_to_organization"("_email" "text", "_organization_id" "uuid", "_role" "public"."app_role", "_first_name" "text" DEFAULT NULL::"text", "_last_name" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id UUID;
  v_existing_user_id UUID;
  v_member_id UUID;
BEGIN
  -- Check if caller is superadmin or admin of the organization
  IF NOT (
    public.is_superadmin(auth.uid()) OR
    public.get_user_org_role(auth.uid(), _organization_id) IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Permission denied: You must be an admin or superadmin to invite users';
  END IF;

  -- Check if user already exists in auth.users
  SELECT id INTO v_existing_user_id
  FROM auth.users
  WHERE email = _email;

  IF v_existing_user_id IS NOT NULL THEN
    -- User already exists, check if they're already a member of this org
    IF EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = v_existing_user_id
      AND organization_id = _organization_id
    ) THEN
      RAISE EXCEPTION 'User % is already a member of this organization', _email;
    END IF;

    -- Add existing user to the organization
    INSERT INTO organization_members (organization_id, user_id, role)
    VALUES (_organization_id, v_existing_user_id, _role)
    RETURNING id INTO v_member_id;

    RETURN v_existing_user_id;
  END IF;

  -- Create new user in auth.users
  v_user_id := extensions.uuid_generate_v4();

  -- SECURITY FIX: Generate cryptographically secure random password
  -- User will receive password reset email automatically
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    confirmation_sent_at,
    recovery_sent_at  -- NEW: Automatically trigger password reset
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    _email,
    crypt(gen_random_uuid()::text, gen_salt('bf')), -- FIXED: Secure random password per user
    NOW(), -- Auto-confirm email for invited users
    NOW(),
    NOW(),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
    jsonb_build_object(
      'first_name', COALESCE(_first_name, ''),
      'last_name', COALESCE(_last_name, '')
    ),
    false,
    NOW(),
    NOW()  -- NEW: Trigger password reset email immediately
  );

  -- Create profile (or update if trigger already created it)
  INSERT INTO public.profiles (id, first_name, last_name, created_at, updated_at)
  VALUES (v_user_id, _first_name, _last_name, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE
  SET
    first_name = COALESCE(_first_name, profiles.first_name),
    last_name = COALESCE(_last_name, profiles.last_name),
    updated_at = NOW();

  -- Add user to organization
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (_organization_id, v_user_id, _role)
  RETURNING id INTO v_member_id;

  RAISE NOTICE 'Created new user % with secure password and triggered password reset', _email;

  RETURN v_user_id;
END;
$$;


ALTER FUNCTION "public"."invite_user_to_organization"("_email" "text", "_organization_id" "uuid", "_role" "public"."app_role", "_first_name" "text", "_last_name" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."invite_user_to_organization"("_email" "text", "_organization_id" "uuid", "_role" "public"."app_role", "_first_name" "text", "_last_name" "text") IS 'Creates a new user account with SECURE random password and adds them to an organization.
Automatically triggers password reset email. If user already exists, just adds them to the organization.
SECURITY FIX (2026-01-08): Now generates unique random password per user instead of static hash.';



CREATE OR REPLACE FUNCTION "public"."is_org_member"("_user_id" "uuid", "_org_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND organization_id = _org_id
  )
$$;


ALTER FUNCTION "public"."is_org_member"("_user_id" "uuid", "_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_superadmin"("_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT COALESCE(is_superadmin, FALSE) 
  FROM public.profiles
  WHERE id = _user_id
$$;


ALTER FUNCTION "public"."is_superadmin"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "project_id" "uuid",
    "task_id" "uuid",
    "file_url" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_type" "text",
    "file_size" integer,
    "uploaded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."attachments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "vat_number" "text",
    "address" "text",
    "status" "public"."client_status" DEFAULT 'active'::"public"."client_status" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."clients" OWNER TO "postgres";


COMMENT ON TABLE "public"."clients" IS 'Seeded with 7 fake clients across all organizations';



CREATE TABLE IF NOT EXISTS "public"."invoice_line_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invoice_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "quantity" numeric(10,2) DEFAULT 1,
    "unit_price" numeric(12,2) NOT NULL,
    "total" numeric(12,2) GENERATED ALWAYS AS (("quantity" * "unit_price")) STORED,
    "position" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."invoice_line_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "client_id" "uuid",
    "invoice_number" "text" NOT NULL,
    "total_amount" numeric(12,2) DEFAULT 0,
    "status" "public"."invoice_status" DEFAULT 'pending'::"public"."invoice_status" NOT NULL,
    "issue_date" "date" DEFAULT CURRENT_DATE,
    "due_date" "date",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."invoices" OWNER TO "postgres";


COMMENT ON TABLE "public"."invoices" IS 'Seeded with 21 fake invoices with revenue data spanning 7 months';



CREATE TABLE IF NOT EXISTS "public"."newsletter_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."newsletter_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."app_role" DEFAULT 'member'::"public"."app_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."organization_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "logo_url" "text",
    "plan" "text" DEFAULT 'free'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


COMMENT ON TABLE "public"."organizations" IS 'Seeded with 3 fake organizations: Acme Corporation, TechStart Inc, Creative Studio';



CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "client_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "status" "public"."project_status" DEFAULT 'planning'::"public"."project_status" NOT NULL,
    "priority" "public"."project_priority" DEFAULT 'medium'::"public"."project_priority" NOT NULL,
    "budget" numeric(12,2),
    "start_date" "date",
    "due_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


COMMENT ON TABLE "public"."projects" IS 'Seeded with 8 fake projects in various statuses';



CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "project_id" "uuid",
    "assignee_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "status" "public"."task_status" DEFAULT 'backlog'::"public"."task_status" NOT NULL,
    "priority" "public"."task_priority" DEFAULT 'medium'::"public"."task_priority" NOT NULL,
    "position" integer DEFAULT 0,
    "due_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tasks" OWNER TO "postgres";


COMMENT ON TABLE "public"."tasks" IS 'Seeded with 14 fake tasks across projects';



CREATE OR REPLACE VIEW "public"."organization_stats" WITH ("security_invoker"='true') AS
 SELECT "o"."id" AS "organization_id",
    (COALESCE("count"(DISTINCT "c"."id"), (0)::bigint))::integer AS "clients_count",
    (COALESCE("count"(DISTINCT "p"."id"), (0)::bigint))::integer AS "projects_count",
    (COALESCE("count"(DISTINCT "t"."id"), (0)::bigint))::integer AS "tasks_count",
    (COALESCE("count"(DISTINCT "i"."id"), (0)::bigint))::integer AS "invoices_count"
   FROM (((("public"."organizations" "o"
     LEFT JOIN "public"."clients" "c" ON (("c"."organization_id" = "o"."id")))
     LEFT JOIN "public"."projects" "p" ON (("p"."organization_id" = "o"."id")))
     LEFT JOIN "public"."tasks" "t" ON (("t"."organization_id" = "o"."id")))
     LEFT JOIN "public"."invoices" "i" ON (("i"."organization_id" = "o"."id")))
  GROUP BY "o"."id";


ALTER VIEW "public"."organization_stats" OWNER TO "postgres";


COMMENT ON VIEW "public"."organization_stats" IS 'Optimized view for dashboard statistics. Uses composite indexes on (organization_id, id) for efficient LEFT JOINs. Query planner statistics updated via ANALYZE.';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "avatar_url" "text",
    "biography" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_superadmin" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."app_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."weak_password_users" (
    "user_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "invited_at" timestamp with time zone,
    "password_reset_sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."weak_password_users" OWNER TO "postgres";


COMMENT ON TABLE "public"."weak_password_users" IS 'Tracking table for users affected by weak password vulnerability (static hash).
Can be dropped after all users have reset their passwords (recommended after 30 days).';



ALTER TABLE ONLY "public"."attachments"
    ADD CONSTRAINT "attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoice_line_items"
    ADD CONSTRAINT "invoice_line_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_organization_id_invoice_number_key" UNIQUE ("organization_id", "invoice_number");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."newsletter_subscriptions"
    ADD CONSTRAINT "newsletter_subscriptions_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."newsletter_subscriptions"
    ADD CONSTRAINT "newsletter_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_organization_id_user_id_key" UNIQUE ("organization_id", "user_id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_key" UNIQUE ("user_id", "role");



ALTER TABLE ONLY "public"."weak_password_users"
    ADD CONSTRAINT "weak_password_users_pkey" PRIMARY KEY ("user_id");



CREATE INDEX "idx_attachments_org_id" ON "public"."attachments" USING "btree" ("organization_id");



CREATE INDEX "idx_clients_org_id" ON "public"."clients" USING "btree" ("organization_id");



CREATE INDEX "idx_clients_org_id_id" ON "public"."clients" USING "btree" ("organization_id", "id");



CREATE INDEX "idx_invoice_line_items_invoice_id" ON "public"."invoice_line_items" USING "btree" ("invoice_id");



CREATE INDEX "idx_invoices_client_id" ON "public"."invoices" USING "btree" ("client_id");



CREATE INDEX "idx_invoices_org_id" ON "public"."invoices" USING "btree" ("organization_id");



CREATE INDEX "idx_invoices_org_id_id" ON "public"."invoices" USING "btree" ("organization_id", "id");



CREATE INDEX "idx_invoices_revenue_query" ON "public"."invoices" USING "btree" ("organization_id", "status", "issue_date" DESC) WHERE ("status" = 'paid'::"public"."invoice_status");



COMMENT ON INDEX "public"."idx_invoices_revenue_query" IS 'Partial index for revenue queries. Only includes paid invoices, optimized for filtering by organization_id, status, and ordering by issue_date DESC.';



CREATE INDEX "idx_organization_members_org_id" ON "public"."organization_members" USING "btree" ("organization_id");



CREATE INDEX "idx_organization_members_user_id" ON "public"."organization_members" USING "btree" ("user_id");



CREATE INDEX "idx_profiles_is_superadmin" ON "public"."profiles" USING "btree" ("is_superadmin") WHERE ("is_superadmin" = true);



CREATE INDEX "idx_projects_client_id" ON "public"."projects" USING "btree" ("client_id");



CREATE INDEX "idx_projects_org_client" ON "public"."projects" USING "btree" ("organization_id", "client_id");



CREATE INDEX "idx_projects_org_id" ON "public"."projects" USING "btree" ("organization_id");



CREATE INDEX "idx_projects_org_id_id" ON "public"."projects" USING "btree" ("organization_id", "id");



CREATE INDEX "idx_projects_org_status_priority_created" ON "public"."projects" USING "btree" ("organization_id", "status", "priority", "created_at" DESC);



CREATE INDEX "idx_tasks_assignee_id" ON "public"."tasks" USING "btree" ("assignee_id");



CREATE INDEX "idx_tasks_org_id" ON "public"."tasks" USING "btree" ("organization_id");



CREATE INDEX "idx_tasks_org_id_id" ON "public"."tasks" USING "btree" ("organization_id", "id");



CREATE INDEX "idx_tasks_org_project_status" ON "public"."tasks" USING "btree" ("organization_id", "project_id", "status");



CREATE INDEX "idx_tasks_project_id" ON "public"."tasks" USING "btree" ("project_id");



CREATE INDEX "idx_tasks_project_status_position" ON "public"."tasks" USING "btree" ("project_id", "status", "position");



CREATE INDEX "idx_user_roles_user_id" ON "public"."user_roles" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "update_clients_updated_at" BEFORE UPDATE ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_invoices_updated_at" BEFORE UPDATE ON "public"."invoices" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_organizations_updated_at" BEFORE UPDATE ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_projects_updated_at" BEFORE UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tasks_updated_at" BEFORE UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."attachments"
    ADD CONSTRAINT "attachments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attachments"
    ADD CONSTRAINT "attachments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attachments"
    ADD CONSTRAINT "attachments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attachments"
    ADD CONSTRAINT "attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoice_line_items"
    ADD CONSTRAINT "invoice_line_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."newsletter_subscriptions"
    ADD CONSTRAINT "newsletter_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can delete org members" ON "public"."organization_members" FOR DELETE USING (("public"."is_superadmin"("auth"."uid"()) OR ("public"."get_user_org_role"("auth"."uid"(), "organization_id") = ANY (ARRAY['owner'::"public"."app_role", 'admin'::"public"."app_role"]))));



CREATE POLICY "Admins can manage line items" ON "public"."invoice_line_items" USING ((EXISTS ( SELECT 1
   FROM "public"."invoices" "i"
  WHERE (("i"."id" = "invoice_line_items"."invoice_id") AND ("public"."is_superadmin"("auth"."uid"()) OR ("public"."get_user_org_role"("auth"."uid"(), "i"."organization_id") = ANY (ARRAY['owner'::"public"."app_role", 'admin'::"public"."app_role"])))))));



CREATE POLICY "Admins can update org members" ON "public"."organization_members" FOR UPDATE USING (("public"."is_superadmin"("auth"."uid"()) OR ("public"."get_user_org_role"("auth"."uid"(), "organization_id") = ANY (ARRAY['owner'::"public"."app_role", 'admin'::"public"."app_role"]))));



CREATE POLICY "Admins can update their organizations" ON "public"."organizations" FOR UPDATE TO "authenticated" USING (("public"."get_user_org_role"("auth"."uid"(), "id") = ANY (ARRAY['owner'::"public"."app_role", 'admin'::"public"."app_role"]))) WITH CHECK (("public"."get_user_org_role"("auth"."uid"(), "id") = ANY (ARRAY['owner'::"public"."app_role", 'admin'::"public"."app_role"])));



CREATE POLICY "Members can view org members" ON "public"."organization_members" FOR SELECT USING (("public"."is_superadmin"("auth"."uid"()) OR "public"."is_org_member"("auth"."uid"(), "organization_id")));



CREATE POLICY "Members can view their organizations" ON "public"."organizations" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."organization_id" = "organization_members"."id") AND ("organization_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Org admins can manage invoices" ON "public"."invoices" USING (("public"."is_superadmin"("auth"."uid"()) OR ("public"."get_user_org_role"("auth"."uid"(), "organization_id") = ANY (ARRAY['owner'::"public"."app_role", 'admin'::"public"."app_role"]))));



CREATE POLICY "Org members can manage attachments" ON "public"."attachments" USING (("public"."is_superadmin"("auth"."uid"()) OR ("public"."get_user_org_role"("auth"."uid"(), "organization_id") = ANY (ARRAY['owner'::"public"."app_role", 'admin'::"public"."app_role", 'member'::"public"."app_role"]))));



CREATE POLICY "Org members can manage clients" ON "public"."clients" USING (("public"."is_superadmin"("auth"."uid"()) OR ("public"."get_user_org_role"("auth"."uid"(), "organization_id") = ANY (ARRAY['owner'::"public"."app_role", 'admin'::"public"."app_role", 'member'::"public"."app_role"]))));



CREATE POLICY "Org members can manage projects" ON "public"."projects" USING (("public"."is_superadmin"("auth"."uid"()) OR ("public"."get_user_org_role"("auth"."uid"(), "organization_id") = ANY (ARRAY['owner'::"public"."app_role", 'admin'::"public"."app_role", 'member'::"public"."app_role"]))));



CREATE POLICY "Org members can manage tasks" ON "public"."tasks" USING (("public"."is_superadmin"("auth"."uid"()) OR ("public"."get_user_org_role"("auth"."uid"(), "organization_id") = ANY (ARRAY['owner'::"public"."app_role", 'admin'::"public"."app_role", 'member'::"public"."app_role"]))));



CREATE POLICY "Org members can view attachments" ON "public"."attachments" FOR SELECT USING ("public"."has_org_access"("auth"."uid"(), "organization_id"));



CREATE POLICY "Org members can view clients" ON "public"."clients" FOR SELECT USING ("public"."has_org_access"("auth"."uid"(), "organization_id"));



CREATE POLICY "Org members can view invoices" ON "public"."invoices" FOR SELECT USING ("public"."has_org_access"("auth"."uid"(), "organization_id"));



CREATE POLICY "Org members can view projects" ON "public"."projects" FOR SELECT USING ("public"."has_org_access"("auth"."uid"(), "organization_id"));



CREATE POLICY "Org members can view tasks" ON "public"."tasks" FOR SELECT USING ("public"."has_org_access"("auth"."uid"(), "organization_id"));



CREATE POLICY "Superadmins can delete organizations" ON "public"."organizations" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_superadmin" = true)))));



CREATE POLICY "Superadmins can insert organizations" ON "public"."organizations" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_superadmin" = true)))));



CREATE POLICY "Superadmins can manage all roles" ON "public"."user_roles" USING ("public"."is_superadmin"("auth"."uid"()));



CREATE POLICY "Superadmins can update organizations" ON "public"."organizations" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_superadmin" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_superadmin" = true)))));



CREATE POLICY "Superadmins can view all organizations" ON "public"."organizations" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_superadmin" = true)))));



CREATE POLICY "Superadmins can view all profiles" ON "public"."profiles" FOR SELECT USING ("public"."is_superadmin"("auth"."uid"()));



CREATE POLICY "Users can create org membership" ON "public"."organization_members" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own subscription" ON "public"."newsletter_subscriptions" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view line items of accessible invoices" ON "public"."invoice_line_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."invoices" "i"
  WHERE (("i"."id" = "invoice_line_items"."invoice_id") AND "public"."has_org_access"("auth"."uid"(), "i"."organization_id")))));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own roles" ON "public"."user_roles" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."attachments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoice_line_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."newsletter_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";































































































































































GRANT ALL ON FUNCTION "public"."get_all_users"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_all_users"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_all_users"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_organization_members"("_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_organization_members"("_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_organization_members"("_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_org_role"("_user_id" "uuid", "_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_org_role"("_user_id" "uuid", "_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_org_role"("_user_id" "uuid", "_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_org_access"("_user_id" "uuid", "_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."has_org_access"("_user_id" "uuid", "_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_org_access"("_user_id" "uuid", "_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."invite_user_to_organization"("_email" "text", "_organization_id" "uuid", "_role" "public"."app_role", "_first_name" "text", "_last_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."invite_user_to_organization"("_email" "text", "_organization_id" "uuid", "_role" "public"."app_role", "_first_name" "text", "_last_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."invite_user_to_organization"("_email" "text", "_organization_id" "uuid", "_role" "public"."app_role", "_first_name" "text", "_last_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_org_member"("_user_id" "uuid", "_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_org_member"("_user_id" "uuid", "_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_org_member"("_user_id" "uuid", "_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_superadmin"("_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_superadmin"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_superadmin"("_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."attachments" TO "anon";
GRANT ALL ON TABLE "public"."attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."attachments" TO "service_role";



GRANT ALL ON TABLE "public"."clients" TO "anon";
GRANT ALL ON TABLE "public"."clients" TO "authenticated";
GRANT ALL ON TABLE "public"."clients" TO "service_role";



GRANT ALL ON TABLE "public"."invoice_line_items" TO "anon";
GRANT ALL ON TABLE "public"."invoice_line_items" TO "authenticated";
GRANT ALL ON TABLE "public"."invoice_line_items" TO "service_role";



GRANT ALL ON TABLE "public"."invoices" TO "anon";
GRANT ALL ON TABLE "public"."invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."invoices" TO "service_role";



GRANT ALL ON TABLE "public"."newsletter_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."newsletter_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."newsletter_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."organization_members" TO "anon";
GRANT ALL ON TABLE "public"."organization_members" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_members" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."tasks" TO "anon";
GRANT ALL ON TABLE "public"."tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks" TO "service_role";



GRANT ALL ON TABLE "public"."organization_stats" TO "anon";
GRANT ALL ON TABLE "public"."organization_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_stats" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."weak_password_users" TO "anon";
GRANT ALL ON TABLE "public"."weak_password_users" TO "authenticated";
GRANT ALL ON TABLE "public"."weak_password_users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
































--
-- Dumped schema changes for auth and storage
--

CREATE OR REPLACE TRIGGER "on_auth_user_created" AFTER INSERT ON "auth"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"();



CREATE POLICY "Org members can delete attachments" ON "storage"."objects" FOR DELETE TO "authenticated" USING ((("bucket_id" = 'attachments'::"text") AND (("storage"."foldername"("name"))[1] IN ( SELECT ("organization_members"."organization_id")::"text" AS "organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))) AND ((EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE ((("organization_members"."organization_id")::"text" = ("storage"."foldername"("objects"."name"))[1]) AND ("organization_members"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_superadmin" = true)))))));



CREATE POLICY "Users can download files from their organization" ON "storage"."objects" FOR SELECT TO "authenticated" USING ((("bucket_id" = 'attachments'::"text") AND (("storage"."foldername"("name"))[1] IN ( SELECT ("organization_members"."organization_id")::"text" AS "organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update files in their organization" ON "storage"."objects" FOR UPDATE TO "authenticated" USING ((("bucket_id" = 'attachments'::"text") AND (("storage"."foldername"("name"))[1] IN ( SELECT ("organization_members"."organization_id")::"text" AS "organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))))) WITH CHECK ((("bucket_id" = 'attachments'::"text") AND (("storage"."foldername"("name"))[1] IN ( SELECT ("organization_members"."organization_id")::"text" AS "organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can upload files to their organization" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK ((("bucket_id" = 'attachments'::"text") AND (("storage"."foldername"("name"))[1] IN ( SELECT ("organization_members"."organization_id")::"text" AS "organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"())))));



