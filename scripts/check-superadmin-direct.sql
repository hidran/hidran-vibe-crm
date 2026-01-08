-- Check if is_superadmin column exists
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles' 
  AND column_name = 'is_superadmin';

-- Check if index exists
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename = 'profiles' 
  AND indexname = 'idx_profiles_is_superadmin';

-- Check for superadmin users
SELECT p.id, p.first_name, p.last_name, p.is_superadmin, u.email
FROM public.profiles p
LEFT JOIN auth.users u ON u.id = p.id
WHERE p.is_superadmin = TRUE;

-- Check RLS policies on organizations
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'organizations'
ORDER BY policyname;

-- Check if is_superadmin function exists
SELECT routine_name, routine_type, data_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name = 'is_superadmin';
