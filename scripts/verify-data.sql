-- Verify superadmin user and fake data

-- Check superadmin user
SELECT 
  'Superadmin User' as check_type,
  u.id,
  u.email,
  u.email_confirmed_at IS NOT NULL as email_confirmed,
  ur.role,
  p.first_name,
  p.last_name
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'hidran@gmail.com';

-- Count organizations
SELECT 'Organizations' as entity, COUNT(*) as count FROM public.organizations;

-- List organizations
SELECT 'Organization Details' as check_type, id, name, slug, plan FROM public.organizations;

-- Count clients per organization
SELECT 
  'Clients per Org' as check_type,
  o.name as organization,
  COUNT(c.id) as client_count
FROM public.organizations o
LEFT JOIN public.clients c ON c.organization_id = o.id
GROUP BY o.id, o.name
ORDER BY o.name;

-- Count projects per organization
SELECT 
  'Projects per Org' as check_type,
  o.name as organization,
  COUNT(p.id) as project_count
FROM public.organizations o
LEFT JOIN public.projects p ON p.organization_id = o.id
GROUP BY o.id, o.name
ORDER BY o.name;

-- Count tasks per organization
SELECT 
  'Tasks per Org' as check_type,
  o.name as organization,
  COUNT(t.id) as task_count
FROM public.organizations o
LEFT JOIN public.tasks t ON t.organization_id = o.id
GROUP BY o.id, o.name
ORDER BY o.name;

-- Count invoices per organization
SELECT 
  'Invoices per Org' as check_type,
  o.name as organization,
  COUNT(i.id) as invoice_count,
  SUM(CASE WHEN i.status = 'paid' THEN 1 ELSE 0 END) as paid_count
FROM public.organizations o
LEFT JOIN public.invoices i ON i.organization_id = o.id
GROUP BY o.id, o.name
ORDER BY o.name;

-- Revenue summary per organization
SELECT 
  'Revenue per Org' as check_type,
  o.name as organization,
  SUM(CASE WHEN i.status = 'paid' THEN i.total_amount ELSE 0 END) as total_paid_revenue
FROM public.organizations o
LEFT JOIN public.invoices i ON i.organization_id = o.id
GROUP BY o.id, o.name
ORDER BY o.name;

-- Check organization_stats view
SELECT 
  'Organization Stats View' as check_type,
  o.name as organization,
  os.clients_count,
  os.projects_count,
  os.tasks_count,
  os.invoices_count
FROM public.organization_stats os
JOIN public.organizations o ON o.id = os.organization_id
ORDER BY o.name;
