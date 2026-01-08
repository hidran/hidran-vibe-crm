# Requirements Document

## Introduction

The Dashboard Analytics System provides real-time aggregated statistics and visual revenue insights for organizations in the VibeManager platform. This feature transforms the static dashboard into a dynamic analytics hub, displaying key metrics (clients, projects, tasks, invoices) and revenue trends through interactive charts. The system leverages SQL views for performance optimization and Recharts for data visualization.

## Glossary

- **Dashboard System**: The analytics and statistics display system on the main dashboard page
- **Aggregation Logic**: SQL queries and views that compute statistics across multiple tables
- **Revenue Graph**: A visual chart displaying invoice revenue over time using Recharts
- **SQL View**: A database view that pre-computes aggregated statistics for performance
- **Organization**: A tenant in the multi-tenant system; all statistics are scoped to one organization
- **Recharts**: A React charting library built on D3.js for creating responsive charts

## Requirements

### Requirement 1: Real-Time Statistics Display

**User Story:** As a business owner, I want to see current counts of my clients, projects, tasks, and invoices on the dashboard, so that I can quickly understand my business activity.

#### Acceptance Criteria

1. WHEN a user views the dashboard, THE Dashboard System SHALL display the total count of active clients for the organization
2. WHEN a user views the dashboard, THE Dashboard System SHALL display the total count of projects for the organization
3. WHEN a user views the dashboard, THE Dashboard System SHALL display the total count of tasks for the organization
4. WHEN a user views the dashboard, THE Dashboard System SHALL display the total count of invoices for the organization
5. WHEN underlying data changes, THE Dashboard System SHALL update statistics in real-time through query invalidation

### Requirement 2: SQL View Performance Optimization

**User Story:** As a system architect, I want dashboard statistics computed efficiently using SQL views, so that the dashboard loads quickly even with large datasets.

#### Acceptance Criteria

1. WHEN statistics are queried, THE Dashboard System SHALL use a SQL view that aggregates counts in a single query
2. WHEN the SQL view executes, THE Dashboard System SHALL filter all data by organization_id for multi-tenant isolation
3. WHEN computing statistics, THE Dashboard System SHALL use database-level aggregation rather than client-side counting
4. WHEN the view is created, THE Dashboard System SHALL include indexes on organization_id for optimal performance
5. THE Dashboard System SHALL compute all four statistics (clients, projects, tasks, invoices) in a single database round-trip

### Requirement 3: Revenue Trend Visualization

**User Story:** As a business owner, I want to see a graph of my invoice revenue over time, so that I can track business growth and identify trends.

#### Acceptance Criteria

1. WHEN a user views the dashboard, THE Dashboard System SHALL display a line chart showing revenue by month
2. WHEN rendering the revenue chart, THE Dashboard System SHALL use Recharts library components
3. WHEN calculating revenue, THE Dashboard System SHALL sum invoice total_amount grouped by month
4. WHEN displaying revenue data, THE Dashboard System SHALL show the most recent 12 months
5. WHEN no invoice data exists, THE Dashboard System SHALL display an empty state message

### Requirement 4: Revenue Data Aggregation

**User Story:** As a business owner, I want revenue calculations to include only paid invoices, so that the graph reflects actual received revenue.

#### Acceptance Criteria

1. WHEN aggregating revenue, THE Dashboard System SHALL include only invoices with status "paid"
2. WHEN grouping revenue by month, THE Dashboard System SHALL use the invoice issue_date for grouping
3. WHEN calculating monthly totals, THE Dashboard System SHALL sum the total_amount field for all paid invoices in that month
4. WHEN filtering revenue data, THE Dashboard System SHALL enforce organization_id filtering through RLS policies
5. WHEN displaying revenue amounts, THE Dashboard System SHALL format currency values with two decimal places

### Requirement 5: Chart Interactivity and Responsiveness

**User Story:** As a user, I want the revenue chart to be interactive and responsive, so that I can explore the data on any device.

#### Acceptance Criteria

1. WHEN a user hovers over a data point, THE Dashboard System SHALL display a tooltip with the exact revenue amount and month
2. WHEN the viewport size changes, THE Dashboard System SHALL resize the chart to fit the container
3. WHEN rendering on mobile devices, THE Dashboard System SHALL maintain chart readability with appropriate sizing
4. WHEN the chart loads, THE Dashboard System SHALL use smooth animations for data visualization
5. WHEN displaying the chart, THE Dashboard System SHALL use a color scheme consistent with the application theme

### Requirement 6: Statistics Card Navigation

**User Story:** As a user, I want to click on statistics cards to navigate to the relevant section, so that I can quickly access detailed views.

#### Acceptance Criteria

1. WHEN a user clicks the clients statistics card, THE Dashboard System SHALL navigate to the clients page
2. WHEN a user clicks the projects statistics card, THE Dashboard System SHALL navigate to the projects page
3. WHEN a user clicks the tasks statistics card, THE Dashboard System SHALL navigate to the tasks page
4. WHEN a user clicks the invoices statistics card, THE Dashboard System SHALL navigate to the invoices page
5. WHEN hovering over statistics cards, THE Dashboard System SHALL provide visual feedback indicating they are clickable

### Requirement 7: Loading and Error States

**User Story:** As a user, I want clear feedback when statistics are loading or if errors occur, so that I understand the system state.

#### Acceptance Criteria

1. WHEN statistics are being fetched, THE Dashboard System SHALL display loading skeletons in place of numbers
2. WHEN the revenue chart is loading, THE Dashboard System SHALL display a loading indicator
3. IF statistics fetching fails, THEN THE Dashboard System SHALL display an error message with retry option
4. IF revenue data fetching fails, THEN THE Dashboard System SHALL display an error message in the chart area
5. WHEN data loads successfully, THE Dashboard System SHALL smoothly transition from loading state to data display

### Requirement 8: Multi-Tenant Data Isolation

**User Story:** As a system administrator, I want statistics and revenue data strictly isolated by organization, so that users only see their own data.

#### Acceptance Criteria

1. WHEN any statistics query executes, THE Dashboard System SHALL filter results by the user's organization_id
2. WHEN revenue data is queried, THE Dashboard System SHALL enforce organization_id filtering through RLS policies
3. WHEN the SQL view is queried, THE Dashboard System SHALL automatically scope results to the current organization
4. WHEN a user switches organizations, THE Dashboard System SHALL refresh all statistics for the new organization
5. THE Dashboard System SHALL prevent any cross-organization data leakage in aggregated statistics
