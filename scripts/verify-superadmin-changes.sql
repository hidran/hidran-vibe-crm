-- Verify is_superadmin column exists in profiles table
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles' 
  AND column_name = 'is_superadmin';

-- Verify the index exists
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename = 'profiles' 
  AND indexname = 'idx_profiles_is_superadmin';

-- Verify RLS policies exist on organizations table
SELECT policyname, cmd, qual::text as using_clause
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'organizations'
  AND policyname LIKE '%Superadmin%';

-- Verify superadmin user exists
SELECT u.email, p.is_superadmin, p.full_name
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
WHERE p.is_superadmin = TRUE;

-- Verify is_superadmin function exists
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name = 'is_superadmin';
