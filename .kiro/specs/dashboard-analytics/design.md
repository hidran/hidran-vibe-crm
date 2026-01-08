# Dashboard Analytics System - Design Document

## Overview

The Dashboard Analytics System enhances the VibeManager dashboard with real-time statistics and revenue visualization. It uses SQL views for efficient data aggregation, TanStack Query for state management, and Recharts for interactive charts. The system maintains strict multi-tenant isolation while providing fast, responsive analytics.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React Frontend                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Dashboard   │  │  Stats Cards │  │ Revenue Chart│      │
│  │     Page     │  │              │  │  (Recharts)  │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                  │               │
│         └─────────────────┴──────────────────┘               │
│                           │                                  │
│                  ┌────────▼────────┐                         │
│                  │  Custom Hooks   │                         │
│                  │  (TanStack      │                         │
│                  │   Query)        │                         │
│                  └────────┬────────┘                         │
└───────────────────────────┼──────────────────────────────────┘
                            │
                  ┌─────────▼─────────┐
                  │  Supabase Client  │
                  └─────────┬─────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌───────▼────────┐  ┌──────▼──────┐
│   SQL Views    │  │  Aggregation   │  │     RLS     │
│ (org_stats)    │  │    Queries     │  │  Policies   │
└────────────────┘  └────────────────┘  └─────────────┘
```

## Components and Interfaces

### Data Models

#### Organization Statistics Type
```typescript
interface OrganizationStats {
  organization_id: string;
  clients_count: number;
  projects_count: number;
  tasks_count: number;
  invoices_count: number;
}
```

#### Revenue Data Type
```typescript
interface MonthlyRevenue {
  month: string; // Format: "YYYY-MM"
  revenue: number;
  invoice_count: number;
}

interface RevenueChartData {
  month: string; // Format: "Jan 2024"
  revenue: number;
}
```

### SQL Views

#### organization_stats View
```sql
CREATE VIEW organization_stats AS
SELECT 
  o.id as organization_id,
  COUNT(DISTINCT c.id) as clients_count,
  COUNT(DISTINCT p.id) as projects_count,
  COUNT(DISTINCT t.id) as tasks_count,
  COUNT(DISTINCT i.id) as invoices_count
FROM organizations o
LEFT JOIN clients c ON c.organization_id = o.id
LEFT JOIN projects p ON p.organization_id = o.id
LEFT JOIN tasks t ON t.organization_id = o.id
LEFT JOIN invoices i ON i.organization_id = o.id
GROUP BY o.id;
```

### Custom Hooks

#### useOrganizationStats
```typescript
const useOrganizationStats = (organizationId: string | undefined) => {
  // Returns: { data: OrganizationStats, isLoading, error }
  // Queries the organization_stats view
  // Filters by organization_id
}
```

#### useRevenueData
```typescript
const useRevenueData = (
  organizationId: string | undefined,
  months: number = 12
) => {
  // Returns: { data: MonthlyRevenue[], isLoading, error }
  // Queries invoices table
  // Filters by status = 'paid' and organization_id
  // Groups by month, sums total_amount
  // Returns last N months
}
```

### React Components

#### Dashboard (Enhanced)
- Existing component to be enhanced
- Integrates useOrganizationStats hook
- Integrates useRevenueData hook
- Replaces hardcoded "0" values with real data
- Adds RevenueChart component

#### StatCard
- Reusable statistics card component
- Props: label, value, icon, href, isLoading
- Displays loading skeleton when isLoading
- Clickable navigation to detail page
- Hover effects

#### RevenueChart
- Recharts-based line chart component
- Props: data (MonthlyRevenue[]), isLoading, error
- Responsive container
- Tooltip with formatted currency
- X-axis: Month labels
- Y-axis: Revenue amounts
- Smooth line animation
- Empty state for no data

### Data Flow

1. **Statistics Flow**:
   - Dashboard mounts → useOrganizationStats fetches → SQL view aggregates → Display in cards

2. **Revenue Chart Flow**:
   - Dashboard mounts → useRevenueData fetches → Group by month → Transform for Recharts → Display chart

3. **Navigation Flow**:
   - User clicks stat card → Navigate to detail page

## Data Models

### Database Schema

#### New SQL View: organization_stats
- Aggregates counts from multiple tables
- Filtered by organization_id
- Uses LEFT JOINs to handle empty tables
- Indexed on organization_id for performance

#### Existing Tables Used
- organizations
- clients
- projects  
- tasks
- invoices

### Query Optimization

- Use SQL view for statistics (single query vs. 4 separate queries)
- Index on organization_id in all tables (already exists)
- Limit revenue data to last 12 months
- Use RLS policies for automatic filtering



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Statistics counts match database reality
*For any* organization, the displayed counts for clients, projects, tasks, and invoices should exactly match the actual counts in the database for that organization.
**Validates: Requirements 1.1, 1.2, 1.3, 1.4**

### Property 2: SQL view respects organization boundaries
*For any* organization, querying the organization_stats view should return only data belonging to that organization.
**Validates: Requirements 2.2, 8.1, 8.3**

### Property 3: Monthly revenue calculation correctness
*For any* set of paid invoices, the monthly revenue total should equal the sum of total_amount for all paid invoices in that month.
**Validates: Requirements 3.3, 4.3**

### Property 4: Revenue data limited to 12 months
*For any* revenue query, the returned data should contain at most 12 months of data.
**Validates: Requirements 3.4**

### Property 5: Only paid invoices included in revenue
*For any* revenue calculation, all included invoices should have status "paid".
**Validates: Requirements 4.1**

### Property 6: Revenue grouped by issue date month
*For any* invoice in the revenue data, it should be grouped according to the month of its issue_date.
**Validates: Requirements 4.2**

### Property 7: Revenue filtered by organization
*For any* organization, revenue data should only include invoices belonging to that organization.
**Validates: Requirements 4.4, 8.2**

### Property 8: Currency formatting with two decimals
*For any* revenue amount displayed, it should be formatted with exactly two decimal places.
**Validates: Requirements 4.5**

### Property 9: Statistics refresh on data changes
*For any* data mutation (create, update, delete), the statistics queries should be invalidated and refetched.
**Validates: Requirements 1.5**

### Property 10: Organization switch triggers refresh
*For any* organization switch, all statistics and revenue queries should be invalidated and refetched for the new organization.
**Validates: Requirements 8.4**

### Property 11: No cross-organization data leakage
*For any* two different organizations, the statistics and revenue data for one organization should never include data from the other organization.
**Validates: Requirements 8.5**

## Error Handling

### Query Errors
- Display user-friendly error messages when statistics fail to load
- Provide retry buttons for failed queries
- Log errors for debugging
- Use error boundaries to prevent full page crashes

### Empty States
- Show "No data yet" message when counts are zero
- Display empty state in revenue chart when no paid invoices exist
- Provide helpful guidance on how to add data

### Loading States
- Show skeleton loaders for statistics cards during fetch
- Display loading spinner in chart area during revenue data fetch
- Prevent layout shift with consistent sizing

## Testing Strategy

### Unit Testing

Unit tests will verify specific examples and edge cases:

- **Statistics display**: Verify correct counts are displayed
- **Empty states**: Test UI when no data exists
- **Loading states**: Verify loading indicators appear
- **Error states**: Test error message display and retry functionality
- **Navigation**: Verify clicking cards navigates to correct pages
- **Chart rendering**: Test Recharts component renders with data

### Property-Based Testing

Property-based tests will verify universal properties across all inputs using **fast-check** (JavaScript/TypeScript property testing library):

- Each property-based test will run a minimum of 100 iterations
- Each test will be tagged with a comment referencing the design document property
- Tag format: `// Feature: dashboard-analytics, Property {number}: {property_text}`
- Each correctness property will be implemented by a SINGLE property-based test

**Property test coverage**:
- Statistics accuracy (Property 1)
- Organization isolation (Properties 2, 7, 11)
- Revenue calculations (Properties 3, 5, 6)
- Data limits (Property 4)
- Formatting (Property 8)
- Query invalidation (Properties 9, 10)

### Integration Testing

Integration tests will verify:
- Complete dashboard load with real data
- Statistics update after creating/deleting entities
- Revenue chart displays correct data from database
- Organization switching updates all data
- RLS policies enforce multi-tenant isolation

### Manual Testing Checklist

- View dashboard with various data scenarios (empty, partial, full)
- Create/update/delete entities and verify statistics update
- Switch between organizations and verify data changes
- Test revenue chart with different time ranges
- Verify chart responsiveness on different screen sizes
- Test error scenarios (network failures, database errors)
- Verify navigation from statistics cards
