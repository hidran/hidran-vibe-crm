#!/bin/bash

# Script to set up superadmin user and seed fake data
# This script creates the superadmin user and applies the seed migration

echo "🚀 Setting up superadmin user and fake data..."
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if we're in a Supabase project
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Not in a Supabase project directory"
    exit 1
fi

echo "📦 Applying seed migration..."
supabase db reset

echo ""
echo "👤 Creating superadmin user..."
echo "   Email: hidran@gmail.com"
echo "   Password: Hidran.123"
echo ""

# Create the user via Supabase Auth
# Note: This requires the Supabase local instance to be running
USER_ID=$(supabase db execute "
  SELECT id FROM auth.users WHERE email = 'hidran@gmail.com';
" --format csv | tail -n 1)

if [ -z "$USER_ID" ]; then
    echo "Creating new user..."
    
    # Create user using SQL (for local development)
    supabase db execute "
      -- Insert into auth.users
      INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        'hidran@gmail.com',
        crypt('Hidran.123', gen_salt('bf')),
        NOW(),
        '{\"provider\":\"email\",\"providers\":[\"email\"]}',
        '{\"first_name\":\"Hidran\",\"last_name\":\"Admin\"}',
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
      )
      ON CONFLICT (email) DO NOTHING
      RETURNING id;
    "
    
    # Get the user ID
    USER_ID=$(supabase db execute "
      SELECT id FROM auth.users WHERE email = 'hidran@gmail.com';
    " --format csv | tail -n 1)
fi

if [ -z "$USER_ID" ]; then
    echo "❌ Failed to create or find user"
    exit 1
fi

echo "✅ User created/found with ID: $USER_ID"
echo ""

echo "🔐 Assigning superadmin role..."
supabase db execute "
  INSERT INTO public.user_roles (user_id, role)
  VALUES ('$USER_ID', 'superadmin')
  ON CONFLICT (user_id, role) DO NOTHING;
"

echo "✅ Superadmin role assigned"
echo ""

echo "📊 Verifying data..."
echo ""

# Count organizations
ORG_COUNT=$(supabase db execute "SELECT COUNT(*) FROM public.organizations;" --format csv | tail -n 1)
echo "   Organizations: $ORG_COUNT"

# Count clients
CLIENT_COUNT=$(supabase db execute "SELECT COUNT(*) FROM public.clients;" --format csv | tail -n 1)
echo "   Clients: $CLIENT_COUNT"

# Count projects
PROJECT_COUNT=$(supabase db execute "SELECT COUNT(*) FROM public.projects;" --format csv | tail -n 1)
echo "   Projects: $PROJECT_COUNT"

# Count tasks
TASK_COUNT=$(supabase db execute "SELECT COUNT(*) FROM public.tasks;" --format csv | tail -n 1)
echo "   Tasks: $TASK_COUNT"

# Count invoices
INVOICE_COUNT=$(supabase db execute "SELECT COUNT(*) FROM public.invoices;" --format csv | tail -n 1)
echo "   Invoices: $INVOICE_COUNT"

echo ""
echo "✅ Setup complete!"
echo ""
echo "🎉 You can now log in with:"
echo "   Email: hidran@gmail.com"
echo "   Password: Hidran.123"
echo ""
echo "📝 Organizations created:"
echo "   1. Acme Corporation (acme-corp)"
echo "   2. TechStart Inc (techstart-inc)"
echo "   3. Creative Studio (creative-studio)"
echo ""
