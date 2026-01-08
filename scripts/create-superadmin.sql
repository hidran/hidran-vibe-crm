-- Script to create superadmin user manually
-- Run this after creating the user via Supabase Dashboard

-- Step 1: Create user via Supabase Dashboard (Authentication > Users)
--   Email: hidran@gmail.com
--   Password: Hidran.123
--   Auto Confirm User: YES

-- Step 2: After creating the user, get the user_id and run this script
-- Replace 'YOUR_USER_ID_HERE' with the actual UUID from the created user

-- Example:
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'superadmin');

-- For local development with Supabase CLI, you can create the user directly:
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Check if user already exists
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'hidran@gmail.com';

  -- If user doesn't exist, create it
  IF v_user_id IS NULL THEN
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
      '{"provider":"email","providers":["email"]}',
      '{"first_name":"Hidran","last_name":"Admin"}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO v_user_id;

    RAISE NOTICE 'Created user with ID: %', v_user_id;
  ELSE
    RAISE NOTICE 'User already exists with ID: %', v_user_id;
  END IF;

  -- Assign superadmin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'superadmin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RAISE NOTICE 'Superadmin role assigned to user: %', v_user_id;

  -- Create profile if it doesn't exist
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (v_user_id, 'Hidran', 'Admin')
  ON CONFLICT (id) DO UPDATE
  SET first_name = 'Hidran', last_name = 'Admin';

  RAISE NOTICE 'Profile created/updated for user: %', v_user_id;
END $$;

-- Verify the setup
SELECT 
  u.id,
  u.email,
  u.email_confirmed_at,
  ur.role,
  p.first_name,
  p.last_name
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'hidran@gmail.com';
