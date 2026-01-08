# Index Verification Guide

## Overview

This guide explains how to verify that all necessary indexes exist and are being used for optimal query performance.

## Verifying Indexes Exist

### Method 1: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to Database → Indexes
3. Verify the following indexes exist:

**Basic organization_id indexes:**
- `idx_clients_org_id` on `clients(organization_id)`
- `idx_projects_org_id` on `projects(organization_id)`
- `idx_tasks_org_id` on `tasks(organization_id)`
- `idx_invoices_org_id` on `invoices(organization_id)`

**Composite indexes for organization_stats view:**
- `idx_clients_org_id_id` on `clients(organization_id, id)`
- `idx_projects_org_id_id` on `projects(organization_id, id)`
- `idx_tasks_org_id_id` on `tasks(organization_id, id)`
- `idx_invoices_org_id_id` on `invoices(organization_id, id)`

**Revenue query index:**
- `idx_invoices_revenue_query` on `invoices(organization_id, status, issue_date DESC)` WHERE status = 'paid'

### Method 2: Using SQL Query

Run this query in the Supabase SQL Editor:

```sql
-- List all indexes on tables used by dashboard analytics
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('clients', 'projects', 'tasks', 'invoices', 'organizations')
ORDER BY tablename, indexname;
```

## Verifying Indexes Are Being Used

### Check organization_stats View Performance

```sql
-- Run EXPLAIN ANALYZE to see query plan
EXPLAIN ANALYZE
SELECT * FROM organization_stats 
WHERE organization_id = 'your-org-id-here';
```

**What to look for:**
- Should show "Index Scan" or "Bitmap Index Scan" (good)
- Should NOT show "Seq Scan" on large tables (bad)
- Execution time should be < 100ms for typical datasets

### Check Revenue Query Performance

```sql
-- Run EXPLAIN ANALYZE on revenue query
EXPLAIN ANALYZE
SELECT issue_date, total_amount
FROM invoices
WHERE organization_id = 'your-org-id-here'
  AND status = 'paid'
  AND issue_date >= '2024-01-01'
ORDER BY issue_date DESC;
```

**What to look for:**
- Should use `idx_invoices_revenue_query` index
- Should show "Index Scan" or "Bitmap Index Scan"
- Execution time should be < 50ms for typical datasets

## Performance Benchmarks

Expected query performance with proper indexes:

| Dataset Size | organization_stats | Revenue Query |
|--------------|-------------------|---------------|
| Empty        | 5-10ms            | 1-5ms         |
| 100 records  | 20-50ms           | 10-20ms       |
| 1,000 records| 50-100ms          | 20-40ms       |
| 10,000 records| 100-200ms        | 40-80ms       |

## Verifying Cache Configuration

### Check TanStack Query DevTools

1. Install React Query DevTools (if not already installed)
2. Open your app in development mode
3. Open the React Query DevTools panel
4. Navigate to the dashboard
5. Check the queries:
   - `organization-stats` should show cache status
   - `revenue-data` should show cache status
6. Verify queries are not refetching unnecessarily

### Expected Cache Behavior

**organization-stats:**
- Cached for 30 seconds (`staleTime`)
- Kept in memory for 5 minutes (`gcTime`)
- Should not refetch when navigating away and back within 30 seconds

**revenue-data:**
- Cached for 60 seconds (`staleTime`)
- Kept in memory for 10 minutes (`gcTime`)
- Should not refetch when navigating away and back within 60 seconds

## Manual Performance Testing

### Test 1: Empty Organization

1. Create a new organization with no data
2. Navigate to the dashboard
3. Open browser DevTools → Network tab
4. Refresh the page
5. Check the timing for `organization_stats` and `invoices` queries
6. Should complete in < 50ms

### Test 2: Organization with Data

1. Create an organization with:
   - 50 clients
   - 30 projects
   - 100 tasks
   - 20 invoices (mix of paid/pending)
2. Navigate to the dashboard
3. Check query timing in Network tab
4. Should complete in < 200ms

### Test 3: Cache Effectiveness

1. Navigate to the dashboard
2. Note the initial query time
3. Navigate away (e.g., to Clients page)
4. Navigate back to dashboard within 30 seconds
5. Queries should NOT refetch (served from cache)
6. Wait 31 seconds and navigate back
7. Queries should refetch (cache expired)

### Test 4: Organization Switch

1. Be a member of multiple organizations
2. Navigate to the dashboard
3. Switch to a different organization
4. Queries should immediately refetch with new organization_id
5. Data should update to show the new organization's stats

## Troubleshooting

### Slow Queries

If queries are slower than expected:

1. **Check if indexes exist:**
   ```sql
   SELECT indexname FROM pg_indexes 
   WHERE tablename = 'invoices' AND indexname LIKE '%org%';
   ```

2. **Update database statistics:**
   ```sql
   ANALYZE public.clients;
   ANALYZE public.projects;
   ANALYZE public.tasks;
   ANALYZE public.invoices;
   ```

3. **Check for table bloat:**
   ```sql
   SELECT schemaname, tablename, 
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
   FROM pg_tables
   WHERE schemaname = 'public'
   ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
   ```

### Cache Not Working

If queries are refetching too often:

1. Check browser console for errors
2. Verify TanStack Query is properly configured
3. Check that `queryKey` includes `organizationId`
4. Verify `staleTime` and `gcTime` are set correctly

### Indexes Not Being Used

If EXPLAIN ANALYZE shows sequential scans:

1. Verify indexes exist (see above)
2. Check if table statistics are up to date (run ANALYZE)
3. For small tables (< 100 rows), Postgres may choose seq scan (this is OK)
4. Check if RLS policies are interfering with index usage

## Monitoring in Production

### Key Metrics to Monitor

1. **Query execution time** (p50, p95, p99)
2. **Cache hit rate** (should be > 90%)
3. **Database CPU usage** (should be low)
4. **Number of queries per second**

### Setting Up Monitoring

Use Supabase's built-in monitoring or set up custom monitoring:

```sql
-- Enable pg_stat_statements extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- View slow queries
SELECT 
  query,
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE query LIKE '%organization_stats%'
   OR query LIKE '%invoices%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

## Conclusion

With proper indexes and caching:
- Dashboard should load in < 1 second
- Queries should complete in < 200ms
- Cache should reduce database load by 95%+
- System should scale to thousands of records per organization

If performance doesn't meet these benchmarks, follow the troubleshooting steps above.
