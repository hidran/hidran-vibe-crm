# Implementation Plan: Superadmin Organization Management

## Overview

This implementation plan covers the development of superadmin capabilities for managing organizations in the VibeManager platform. The approach follows the established patterns for data fetching, UI components, and access control while extending the system with privileged administrative features.

## Tasks

- [x] 1. Database schema and RLS policies
  - [x] 1.1 Add is_superadmin column to profiles table
    - Create migration to add boolean column
    - Set default value to false
    - Create index on is_superadmin for performance
    - _Requirements: 1.1, 1.2_

  - [x] 1.2 Create RLS policies for superadmin access
    - Create policy for SELECT on organizations
    - Create policy for INSERT on organizations
    - Create policy for UPDATE on organizations
    - Create policy for DELETE on organizations
    - All policies check is_superadmin flag
    - _Requirements: 8.2, 8.4, 8.5_

  - [x]* 1.3 Write property test for RLS policy enforcement
    - **Property 9: RLS policy enforcement**
    - **Validates: Requirements 8.4**

  - [x] 1.4 Manually designate initial superadmin user
    - Update a test user's profile with is_superadmin = true
    - Verify the flag is set correctly
    - _Requirements: 1.2_

- [x] 2. Checkpoint - Verify database changes
  - Ensure all migrations run successfully, ask the user if questions arise.

- [x] 3. Implement superadmin detection hook
  - [x] 3.1 Create useIsSuperadmin hook
    - Query current user's profile
    - Return isSuperadmin boolean and loading state
    - Cache result with TanStack Query
    - _Requirements: 1.3, 8.2_

  - [x] 3.2 Write property test for superadmin flag persistence
    - **Property 6: Superadmin flag persistence**
    - **Validates: Requirements 1.2, 1.3**

  - [x] 3.3 Write unit tests for useIsSuperadmin hook
    - Test returns true for superadmin user
    - Test returns false for regular user
    - Test loading state
    - _Requirements: 1.3_

- [x] 4. Implement organization data hooks
  - [x] 4.1 Create useOrganizations hook
    - Query all organizations with member counts
    - Use LEFT JOIN with organization_members
    - Return array of OrganizationWithStats
    - Enable query only for superadmins
    - _Requirements: 2.2, 7.1, 7.2_

  - [x] 4.2 Create useCreateOrganization hook
    - Mutation to insert new organization
    - Validate name is not empty
    - Invalidate organizations query on success
    - _Requirements: 2.1, 4.1, 4.2, 4.3_

  - [x] 4.3 Create useUpdateOrganization hook
    - Mutation to update organization
    - Validate name uniqueness
    - Invalidate organizations query on success
    - _Requirements: 2.3, 5.2, 5.3_

  - [x] 4.4 Create useDeleteOrganization hook
    - Mutation to delete organization
    - Handle cascade deletion
    - Invalidate organizations query on success
    - _Requirements: 2.4, 6.2, 6.3_

  - [x] 4.5 Create useOrganizationMembers hook
    - Query members for specific organization
    - Join with profiles to get email and name
    - Return array of OrganizationMember
    - _Requirements: 7.3, 7.4, 7.5_

  - [x] 4.6 Write property test for CRUD operations require superadmin
    - **Property 3: Organization CRUD operations require superadmin**
    - **Validates: Requirements 2.5, 8.2**

  - [x] 4.7 Write property test for organization name uniqueness
    - **Property 2: Organization name uniqueness**
    - **Validates: Requirements 4.1, 5.2**

  - [x] 4.8 Write property test for member count accuracy
    - **Property 5: Member count accuracy**
    - **Validates: Requirements 7.1, 7.2**

- [x] 5. Checkpoint - Ensure hooks work correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Create SuperadminRoute component
  - [x] 6.1 Implement SuperadminRoute wrapper
    - Use useIsSuperadmin hook
    - Show loading state while checking
    - Redirect non-superadmins to dashboard
    - Render children for superadmins
    - _Requirements: 8.1, 9.3_

  - [x] 6.2 Write property test for superadmin access control
    - **Property 1: Superadmin access control**
    - **Validates: Requirements 1.4, 8.1, 8.2**

  - [x] 6.3 Write unit tests for SuperadminRoute
    - Test redirects non-superadmin users
    - Test renders children for superadmins
    - Test shows loading state
    - _Requirements: 8.1_

- [x] 7. Create OrganizationDialog component
  - [x] 7.1 Build OrganizationDialog component
    - Accept props: open, onOpenChange, organization (null for create)
    - Use React Hook Form with Zod validation
    - Field: name (required, min 1 character)
    - Show loading state during submission
    - Display success toast on completion
    - Display error toast on failure
    - _Requirements: 4.1, 4.2, 4.5, 5.1, 5.4, 5.5, 10.1, 10.2, 10.4_

  - [x] 7.2 Write unit tests for OrganizationDialog
    - Test create mode with empty form
    - Test edit mode with pre-populated data
    - Test validation for empty name
    - Test submission and success toast
    - _Requirements: 4.1, 5.1, 10.4_

- [x] 8. Create OrganizationMembersDialog component
  - [x] 8.1 Build OrganizationMembersDialog component
    - Accept props: open, onOpenChange, organizationId
    - Use useOrganizationMembers hook
    - Display table with email, role, join date
    - Show loading state
    - Show empty state if no members
    - _Requirements: 7.3, 7.4, 7.5_

  - [x] 8.2 Write unit tests for OrganizationMembersDialog
    - Test displays member list
    - Test shows loading state
    - Test shows empty state
    - _Requirements: 7.3_

- [x] 9. Create Organizations page
  - [x] 9.1 Build Organizations page component
    - Use useOrganizations hook
    - Display table with columns: name, created date, member count, actions
    - Add "Create Organization" button
    - Add search input for filtering by name
    - Add sort functionality for name and date
    - Show loading state with skeleton
    - Show empty state if no organizations
    - _Requirements: 2.2, 3.1, 3.2, 3.3, 3.4, 3.5, 9.3, 9.4_

  - [x] 9.2 Add edit functionality to Organizations page
    - Add "Edit" button for each organization
    - Open OrganizationDialog with organization data
    - Handle update success
    - _Requirements: 2.3, 5.1, 5.4_

  - [x] 9.3 Add delete functionality to Organizations page
    - Add "Delete" button for each organization
    - Show confirmation dialog before deletion
    - Handle delete success
    - Display success notification
    - _Requirements: 2.4, 6.1, 6.4, 6.5_

  - [x] 9.4 Add member view functionality to Organizations page
    - Make member count clickable
    - Open OrganizationMembersDialog on click
    - _Requirements: 7.3_

  - [x] 9.5 Write property test for organization deletion cascades
    - **Property 4: Organization deletion cascades**
    - **Validates: Requirements 6.3, 11.1, 11.3**

  - [ ]* 9.6 Write integration tests for Organizations page
    - Test complete CRUD flow
    - Test search functionality
    - Test sort functionality
    - Test member view
    - _Requirements: All_

- [x] 10. Update navigation for superadmins
  - [x] 10.1 Add Organizations link to Sidebar
    - Use useIsSuperadmin hook
    - Show "Organizations" link only for superadmins
    - Link to /organizations route
    - Use appropriate icon (Building2 or Shield)
    - _Requirements: 9.1, 9.2, 9.5_

  - [ ]* 10.2 Write property test for navigation visibility
    - **Property 7: Navigation visibility based on role**
    - **Validates: Requirements 9.1, 9.2**

  - [ ]* 10.3 Write unit tests for navigation visibility
    - Test link visible for superadmin
    - Test link hidden for non-superadmin
    - _Requirements: 9.1, 9.2_

- [x] 11. Add route for Organizations page
  - [x] 11.1 Register /organizations route in App.tsx
    - Wrap route with SuperadminRoute
    - Import Organizations page component
    - _Requirements: 9.3_

  - [ ]* 11.2 Write integration test for route protection
    - Test superadmin can access route
    - Test non-superadmin is redirected
    - _Requirements: 8.1_

- [x] 12. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Error handling and polish
  - [x] 13.1 Add comprehensive error handling
    - Handle network errors gracefully
    - Display user-friendly error messages
    - Add retry buttons for failed operations
    - Log errors for debugging
    - _Requirements: 10.1, 10.2, 10.3, 10.5_

  - [ ]* 13.2 Write property test for error messages on validation failure
    - **Property 10: Error messages on validation failure**
    - **Validates: Requirements 10.1, 10.2, 10.4**

  - [ ]* 13.3 Write unit tests for error scenarios
    - Test network failure handling
    - Test validation error display
    - Test database error handling
    - _Requirements: 10.1, 10.2, 10.3_

  - [x] 13.4 Add loading states and animations
    - Smooth transitions for data loading
    - Skeleton loaders for table
    - Button loading states
    - _Requirements: 9.5_

  - [ ]* 13.5 Write property test for organization creation generates unique ID
    - **Property 8: Organization creation generates unique ID**
    - **Validates: Requirements 4.3**

- [x] 14. Final checkpoint - Complete testing
  - [x] Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation follows established patterns from existing features (clients, projects, tasks)
- Superadmin designation must be done manually in the database initially
- Future enhancements could include UI for managing superadmin designations
