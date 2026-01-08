# Implementation Plan

## Completed Foundation Tasks (Phase 1 & 2)

- [x] 1. Foundation - System Plumbing
  - [x] 1.1 Scaffold React+Vite+TS and configure Tailwind and shadcn/ui
    - Set up Vite project with TypeScript
    - Configure Tailwind CSS
    - Install and configure shadcn/ui components
    - _Phase 1: Task 1.1_

  - [x] 1.2 Implement Supabase Client and Auth Context
    - Create Supabase client configuration
    - Implement AuthContext with user state management
    - Add sign in, sign up, and sign out functionality
    - _Phase 1: Task 1.2_

  - [x] 1.3 Create basic Layouts (Sidebar, Header) and Routing
    - Implement DashboardLayout component
    - Create Sidebar navigation
    - Create Header component
    - Set up React Router with protected routes
    - _Phase 1: Task 1.3_

  - [x] 1.4 Define Database Schema for organizations and profiles
    - Create organizations table
    - Create profiles table
    - Create organization_members table
    - Set up RLS policies
    - Create database functions for access control
    - _Phase 1: Task 1.4_

- [x] 2. CRM and Project Core (Phase 2)
  - [x] 2.1 Implement Client CRUD
    - Create clients table schema
    - Implement useClients hooks
    - Create ClientDialog component
    - Create Clients page with list view
    - _Phase 2: Task 2.1_

  - [x] 2.2 Implement Project CRUD and connect to Clients
    - Create projects table schema
    - Implement useProjects hooks
    - Create ProjectDialog component
    - Create Projects page with list view
    - Link projects to clients
    - _Phase 2: Task 2.2_

  - [x] 2.3 Implement Task Backend (Schema + API)
    - Create tasks table schema
    - Implement useTasks hooks
    - Create TaskDialog component
    - Add task status and priority enums
    - _Phase 2: Task 2.3_

  - [x] 2.4 Build Kanban Board UI with drag-and-drop
    - Create KanbanBoard component
    - Implement drag-and-drop with dnd-kit
    - Create TaskCard component
    - Add status columns (Backlog, To Do, In Progress, Review, Done)
    - Implement task status updates on drop
    - _Phase 2: Task 2.4_

## Dashboard Analytics Implementation (Phase 4.1 & 4.2)

- [x] 3. Create SQL view for statistics aggregation
  - [x] 3.1 Create organization_stats SQL view
    - Write migration to create view
    - Aggregate counts for clients, projects, tasks, invoices
    - Use LEFT JOINs to handle empty tables
    - Group by organization_id
    - Test view returns correct counts
    - _Requirements: 2.1, 2.2, 2.5_

  - [x] 3.2 Write property test for statistics accuracy
    - **Property 1: Statistics counts match database reality**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**

  - [x] 3.3 Write property test for organization isolation in view
    - **Property 2: SQL view respects organization boundaries**
    - **Validates: Requirements 2.2, 8.1, 8.3**

  - [x] 3.4 Add RLS policy for organization_stats view
    - Create policy to filter by organization_id
    - Test cross-organization access is denied
    - _Requirements: 8.1, 8.2, 8.5_

- [x] 4. Implement statistics data hooks
  - [x] 4.1 Create useOrganizationStats hook
    - Query organization_stats view
    - Filter by organization_id
    - Return counts for all four entities
    - Enable query only when organizationId exists
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 4.2 Write property test for query invalidation
    - **Property 9: Statistics refresh on data changes**
    - **Validates: Requirements 1.5**

  - [x] 4.3 Write property test for organization switch
    - **Property 10: Organization switch triggers refresh**
    - **Validates: Requirements 8.4**

  - [x] 4.4 Write property test for no data leakage
    - **Property 11: No cross-organization data leakage**
    - **Validates: Requirements 8.5**

- [x] 5. Create revenue data aggregation
  - [x] 5.1 Implement useRevenueData hook
    - Query invoices table
    - Filter by status = 'paid' and organization_id
    - Group by month using issue_date
    - Sum total_amount for each month
    - Limit to last 12 months
    - Order by month descending
    - _Requirements: 3.3, 3.4, 4.1, 4.2, 4.3_

  - [x] 5.2 Write property test for revenue calculation
    - **Property 3: Monthly revenue calculation correctness**
    - **Validates: Requirements 3.3, 4.3**

  - [x] 5.3 Write property test for paid invoices only
    - **Property 5: Only paid invoices included in revenue**
    - **Validates: Requirements 4.1**

  - [x] 5.4 Write property test for date grouping
    - **Property 6: Revenue grouped by issue date month**
    - **Validates: Requirements 4.2**

  - [x] 5.5 Write property test for 12-month limit
    - **Property 4: Revenue data limited to 12 months**
    - **Validates: Requirements 3.4**

  - [x] 5.6 Write property test for revenue organization filtering
    - **Property 7: Revenue filtered by organization**
    - **Validates: Requirements 4.4, 8.2**

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Create reusable StatCard component
  - [x] 7.1 Build StatCard component
    - Accept props: label, value, icon, href, isLoading
    - Display loading skeleton when isLoading
    - Show icon and label
    - Display value with large font
    - Make card clickable with navigation
    - Add hover effects
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 6.1, 6.2, 6.3, 6.4_

  - [x] 7.2 Write unit tests for StatCard
    - Test loading state displays skeleton
    - Test navigation on click
    - Test displays correct label and value
    - _Requirements: 7.1_

- [x] 8. Integrate Recharts for revenue visualization
  - [x] 8.1 Install and configure Recharts
    - Add recharts dependency
    - Import necessary components (LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer)
    - _Requirements: 3.2_

  - [x] 8.2 Create RevenueChart component
    - Accept props: data, isLoading, error
    - Use ResponsiveContainer for responsiveness
    - Create LineChart with revenue data
    - Configure XAxis with month labels
    - Configure YAxis with revenue amounts
    - Add smooth line animation
    - Style with theme colors
    - _Requirements: 3.1, 3.2, 5.4_

  - [x] 8.3 Add tooltip with formatted currency
    - Implement custom tooltip component
    - Display month and revenue amount
    - Format currency with two decimal places
    - _Requirements: 4.5, 5.1_

  - [x] 8.4 Write property test for currency formatting
    - **Property 8: Currency formatting with two decimals**
    - **Validates: Requirements 4.5**

  - [x] 8.5 Add empty state for no data
    - Display message when data array is empty
    - Provide helpful guidance
    - _Requirements: 3.5_

  - [x] 8.6 Add loading and error states
    - Show loading spinner when isLoading
    - Display error message when error exists
    - Add retry button for errors
    - _Requirements: 7.2, 7.4_

  - [x] 8.7 Write unit tests for RevenueChart
    - Test empty state displays message
    - Test loading state displays spinner
    - Test error state displays error message
    - Test chart renders with data
    - _Requirements: 3.5, 7.2, 7.4_

- [x] 9. Enhance Dashboard page with real data
  - [x] 9.1 Update Dashboard to use useOrganizationStats
    - Import and call useOrganizationStats hook
    - Pass organizationId from useOrganization
    - Replace hardcoded "0" values with real counts
    - Handle loading state
    - Handle error state
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 9.2 Replace stat cards with StatCard component
    - Use StatCard for clients count
    - Use StatCard for projects count
    - Use StatCard for tasks count
    - Use StatCard for invoices count
    - Pass isLoading state to each card
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 7.1_

  - [x] 9.3 Add RevenueChart to Dashboard
    - Import and call useRevenueData hook
    - Transform data for Recharts format
    - Add chart section to dashboard layout
    - Pass loading and error states
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 9.4 Write integration tests for Dashboard
    - Test dashboard loads with real statistics
    - Test statistics update after data changes
    - Test revenue chart displays correct data
    - Test organization switch updates data
    - _Requirements: All_

- [x] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Polish and error handling
  - [x] 11.1 Add comprehensive error boundaries
    - Wrap dashboard sections in error boundaries
    - Display fallback UI for errors
    - Log errors for debugging
    - _Requirements: 7.3, 7.4_

  - [x] 11.2 Optimize query performance
    - Verify indexes exist on organization_id
    - Test query performance with large datasets
    - Add query result caching
    - _Requirements: 2.4_

  - [x] 11.3 Add success feedback
    - Show smooth transitions from loading to data
    - Add subtle animations
    - _Requirements: 7.5_

  - [x] 11.4 Write unit tests for error scenarios
    - Test statistics fetch failure
    - Test revenue fetch failure
    - Test retry functionality
    - _Requirements: 7.3, 7.4_
