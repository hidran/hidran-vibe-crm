-- Verify superadmin setup

-- 1. Check if is_superadmin column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name = 'is_superadmin';

-- 2. Check if index exists
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'profiles'
  AND indexname = 'idx_profiles_is_superadmin';

-- 3. Check superadmin users
SELECT u.email, p.first_name, p.last_name, p.is_superadmin
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.is_superadmin = TRUE;

-- 4. Check RLS policies on organizations table
SELECT policyname, cmd, qual::text
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'organizations'
  AND policyname LIKE '%superadmin%'
ORDER BY policyname;
