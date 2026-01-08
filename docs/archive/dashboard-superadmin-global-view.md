# Dashboard - Superadmin Global View

## Overview
Updated the Dashboard to show aggregated data from all organizations when accessed by a superadmin user without an organization context.

## Changes Made

### 1. **useOrganizationStats Hook**
Enhanced to support superadmin global view.

#### New Signature:
```typescript
export const useOrganizationStats = (
  organizationId: string | undefined,
  isSuperadmin: boolean = false
)
```

#### Behavior:
- **Superadmin without organization**: Aggregates stats from all organizations
- **Superadmin with organization**: Shows stats for that specific organization
- **Regular user**: Shows stats for their organization only

#### Implementation:
```typescript
if (isSuperadmin && !organizationId) {
  // Fetch all organization stats
  const { data, error } = await supabase
    .from("organization_stats")
    .select("*");

  // Aggregate totals
  const aggregated = {
    organization_id: "all",
    clients_count: data?.reduce((sum, org) => sum + (org.clients_count || 0), 0) || 0,
    projects_count: data?.reduce((sum, org) => sum + (org.projects_count || 0), 0) || 0,
    tasks_count: data?.reduce((sum, org) => sum + (org.tasks_count || 0), 0) || 0,
    invoices_count: data?.reduce((sum, org) => sum + (org.invoices_count || 0), 0) || 0,
  };
  
  return aggregated;
}
```

### 2. **useRevenueData Hook**
Enhanced to support superadmin global view.

#### New Signature:
```typescript
export const useRevenueData = (
  organizationId: string | undefined,
  months: number = 12,
  isSuperadmin: boolean = false
)
```

#### Behavior:
- **Superadmin without organization**: Shows revenue from all organizations combined
- **Superadmin with organization**: Shows revenue for that specific organization
- **Regular user**: Shows revenue for their organization only

#### Implementation:
```typescript
let query = supabase
  .from("invoices")
  .select("issue_date, total_amount")
  .eq("status", "paid")
  .gte("issue_date", cutoffDate)
  .order("issue_date", { ascending: false });

// Only filter by organization if not a superadmin viewing all
if (!isSuperadmin || organizationId) {
  if (!organizationId) return [];
  query = query.eq("organization_id", organizationId);
}
```

### 3. **Dashboard Component**
Updated to pass `isSuperadmin` flag to both hooks.

#### Changes:
```typescript
// Import the hook
import { useIsSuperadmin } from "@/hooks/useIsSuperadmin";

// Get superadmin status
const { data: isSuperadmin } = useIsSuperadmin();

// Pass to hooks
const { data: stats } = useOrganizationStats(
  organization?.id, 
  isSuperadmin || false
);

const { data: revenueData } = useRevenueData(
  organization?.id, 
  12, 
  isSuperadmin || false
);
```

## Dashboard Display

### For Superadmins (No Organization Context)

**Statistics Cards:**
- **Clients**: Total across all organizations
- **Projects**: Total across all organizations
- **Tasks**: Total across all organizations
- **Invoices**: Total across all organizations

**Revenue Chart:**
- Shows combined revenue from all organizations
- Aggregates by month across all paid invoices
- Provides system-wide revenue overview

### For Superadmins (With Organization Context)

Same as regular users - shows data for the selected organization only.

### For Regular Users

Shows data only for their assigned organization.

## Benefits

### 1. **System-Wide Overview** 📊
- Superadmins can see total system metrics at a glance
- Understand overall platform usage
- Monitor total revenue across all customers

### 2. **No Organization Required** 🌐
- Superadmins don't need to be members of any organization
- Can view global metrics without organizational affiliation
- Maintains separation between platform admin and organization users

### 3. **Flexible Context** 🔄
- Superadmins can still view specific organization data
- Switch between global view and organization-specific view
- Maintain both macro and micro perspectives

### 4. **Accurate Aggregation** ✅
- Stats are properly summed across organizations
- Revenue is correctly aggregated by month
- No double-counting or missing data

## Example Data

### Superadmin Global View:
```
Clients: 150 (across all organizations)
Projects: 89 (across all organizations)
Tasks: 342 (across all organizations)
Invoices: 234 (across all organizations)

Revenue Chart:
- Jan 2024: $45,000 (from all orgs)
- Feb 2024: $52,000 (from all orgs)
- Mar 2024: $48,000 (from all orgs)
```

### Organization-Specific View:
```
Clients: 12 (for Acme Corp)
Projects: 8 (for Acme Corp)
Tasks: 34 (for Acme Corp)
Invoices: 21 (for Acme Corp)

Revenue Chart:
- Jan 2024: $5,000 (Acme Corp only)
- Feb 2024: $6,200 (Acme Corp only)
- Mar 2024: $5,800 (Acme Corp only)
```

## Technical Details

### Query Optimization
- Uses existing `organization_stats` view for efficient aggregation
- Leverages database indexes for fast invoice queries
- Caching prevents repeated database calls

### Cache Strategy
- **Stats**: 30 seconds stale time, 5 minutes cache
- **Revenue**: 60 seconds stale time, 10 minutes cache
- Separate cache keys for superadmin vs organization views

### Performance
- Aggregation happens in application layer (minimal overhead)
- Database queries remain efficient with proper indexes
- No N+1 query problems

## Security Considerations

### RLS Policies
- Superadmin access verified through `is_superadmin()` function
- Regular users can only access their organization's data
- No data leakage between organizations

### Access Control
- `useIsSuperadmin` hook checks user's superadmin status
- Hooks only aggregate when `isSuperadmin` is true
- Regular users cannot access global stats

## Testing

### Test Scenarios

1. **Superadmin without organization**
   - Should see aggregated stats from all organizations
   - Should see combined revenue chart
   - All numbers should be totals

2. **Superadmin with organization**
   - Should see stats for that organization only
   - Should see revenue for that organization only
   - Same behavior as regular user

3. **Regular user**
   - Should only see their organization's data
   - Cannot access global stats
   - Cannot see other organizations' data

4. **Empty state**
   - New system with no data shows zeros
   - No errors when organizations have no stats
   - Graceful handling of missing data

### Manual Testing

```bash
# As superadmin (no org membership)
1. Login as superadmin
2. Visit /dashboard
3. Verify stats show totals from all organizations
4. Verify revenue chart shows combined data

# As superadmin (with org membership)
1. Login as superadmin
2. Switch to specific organization
3. Visit /dashboard
4. Verify stats show only that organization's data

# As regular user
1. Login as regular user
2. Visit /dashboard
3. Verify stats show only their organization's data
4. Verify no access to global stats
```

## Future Enhancements

1. **Organization Breakdown**: Show per-organization breakdown in superadmin view
2. **Filters**: Allow superadmins to filter by specific organizations
3. **Comparisons**: Compare organization performance side-by-side
4. **Trends**: Show growth trends across organizations
5. **Alerts**: Notify superadmins of significant changes

## Status: ✅ COMPLETE

Dashboard now correctly shows aggregated data for superadmins viewing the global system, while maintaining organization-specific views for regular users and superadmins with organization context.
