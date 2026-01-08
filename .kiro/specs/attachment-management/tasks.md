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

## Attachment Management Implementation (Phase 4.3)

- [ ] 3. Set up Supabase Storage infrastructure
  - [ ] 3.1 Create Supabase Storage bucket
    - Create "attachments" storage bucket
    - Enable RLS on bucket
    - Configure bucket settings (max file size, allowed types)
    - _Requirements: 1.1, 8.5_

  - [ ] 3.2 Create storage bucket RLS policies
    - Policy: Users can upload to their organization path
    - Policy: Users can download from their organization path
    - Policy: Users can delete their own uploads or if admin
    - Test policies with multiple organizations
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ] 3.3 Write property test for storage path structure
    - **Property 20: Storage path organization structure**
    - **Validates: Requirements 7.2, 8.1**

- [ ] 4. Implement attachment data hooks
  - [ ] 4.1 Create useAttachments hook
    - Query attachments table
    - Filter by project_id or task_id
    - Join with profiles to get uploader info
    - Order by created_at descending
    - Enable query only when organizationId exists
    - _Requirements: 4.1, 4.2, 4.5, 10.5_

  - [ ] 4.2 Write property test for project filtering
    - **Property 9: Project attachment filtering**
    - **Validates: Requirements 4.1**

  - [ ] 4.3 Write property test for task filtering
    - **Property 10: Task attachment filtering**
    - **Validates: Requirements 4.2**

  - [ ] 4.4 Write property test for attachment ordering
    - **Property 12: Attachment ordering**
    - **Validates: Requirements 4.5**

  - [ ] 4.5 Write property test for organization filtering
    - **Property 19: Organization filtering**
    - **Validates: Requirements 7.1, 7.5**

  - [ ] 4.6 Write property test for uploader information retrieval
    - **Property 25: Uploader information retrieval**
    - **Validates: Requirements 10.5**

- [ ] 5. Implement file upload functionality
  - [ ] 5.1 Create useUploadAttachment hook
    - Accept file, organizationId, projectId or taskId
    - Validate file size (max 10MB)
    - Validate file type (documents and images)
    - Generate storage path: {org_id}/{project|task}/{filename}
    - Handle filename conflicts with unique generation
    - Upload to Supabase Storage
    - Create attachment database record
    - Track upload progress
    - Invalidate queries on success
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.2, 8.1, 8.2, 8.3_

  - [ ] 5.2 Write property test for upload creates records
    - **Property 1: File upload creates storage and database record**
    - **Validates: Requirements 1.1, 1.2**

  - [ ] 5.3 Write property test for organization ID assignment
    - **Property 2: Organization ID auto-assignment**
    - **Validates: Requirements 1.3**

  - [ ] 5.4 Write property test for uploader tracking
    - **Property 3: Uploader tracking**
    - **Validates: Requirements 1.4, 10.1**

  - [ ] 5.5 Write property test for file size validation
    - **Property 6: File size validation**
    - **Validates: Requirements 3.1**

  - [ ] 5.6 Write property test for document type acceptance
    - **Property 7: Document type acceptance**
    - **Validates: Requirements 3.3**

  - [ ] 5.7 Write property test for image type acceptance
    - **Property 8: Image type acceptance**
    - **Validates: Requirements 3.4**

  - [ ] 5.8 Write property test for unique filename generation
    - **Property 22: Unique filename generation**
    - **Validates: Requirements 8.2, 8.3**

  - [ ] 5.9 Write unit tests for file validation
    - Test oversized file rejection
    - Test unsupported file type rejection
    - Test error messages
    - _Requirements: 3.2, 3.5_

- [ ] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Create file upload UI components
  - [ ] 7.1 Install and configure react-dropzone
    - Add react-dropzone dependency
    - Configure accepted file types
    - Configure max file size
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 7.2 Create FileUploadZone component
    - Use react-dropzone for drag-and-drop
    - Accept props: onUpload, isUploading, organizationId, projectId/taskId
    - Show visual feedback on drag over
    - Open file picker on click
    - Display upload progress for each file
    - Show validation errors
    - Support multiple file uploads
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 9.1, 9.5_

  - [ ] 7.3 Write property test for multiple file upload
    - **Property 5: Multiple file upload completeness**
    - **Validates: Requirements 2.4**

  - [ ] 7.4 Write property test for multi-file progress tracking
    - **Property 26: Multi-file progress tracking**
    - **Validates: Requirements 9.5**

  - [ ] 7.5 Write unit tests for FileUploadZone
    - Test file picker opens on click
    - Test progress display
    - Test error display
    - Test success feedback
    - _Requirements: 2.3, 2.5, 9.1, 9.2, 9.3, 9.4_

- [ ] 8. Create attachment display components
  - [ ] 8.1 Create FileIcon component
    - Display appropriate icon based on file type
    - Use lucide-react icons (FileText, Image, File, etc.)
    - Handle unknown file types with fallback
    - _Requirements: 4.3_

  - [ ] 8.2 Create AttachmentCard component
    - Display file icon using FileIcon
    - Show file name, size, upload date, uploader name
    - Format file size (KB, MB)
    - Format upload date in human-readable format
    - Show image thumbnail for image files
    - Add action menu with download and delete options
    - _Requirements: 4.3, 4.4, 5.3, 10.4_

  - [ ] 8.3 Write property test for attachment display completeness
    - **Property 11: Attachment display completeness**
    - **Validates: Requirements 4.3, 4.4**

  - [ ] 8.4 Write property test for image thumbnail display
    - **Property 14: Image thumbnail display**
    - **Validates: Requirements 5.3**

  - [ ] 8.5 Write property test for date formatting
    - **Property 24: Date formatting**
    - **Validates: Requirements 10.4**

  - [ ] 8.6 Write unit tests for AttachmentCard
    - Test all fields are displayed
    - Test action menu appears
    - Test image thumbnail for images
    - Test file icon for documents
    - _Requirements: 4.3, 4.4, 5.3_

- [ ] 9. Create attachment list component
  - [ ] 9.1 Create AttachmentList component
    - Accept props: attachments, isLoading, onDelete, onDownload
    - Display list of AttachmentCard components
    - Show loading skeletons during fetch
    - Show empty state when no attachments
    - Handle delete confirmation
    - _Requirements: 4.1, 4.2, 4.5, 6.3_

  - [ ] 9.2 Write unit tests for AttachmentList
    - Test empty state display
    - Test loading state display
    - Test attachment cards render
    - Test delete confirmation
    - _Requirements: 6.3_

- [ ] 10. Implement download functionality
  - [ ] 10.1 Create useDownloadAttachment hook
    - Generate signed URL from Supabase Storage
    - Verify user has access to attachment's organization
    - Use original filename for download
    - Trigger browser download
    - Handle errors (expired URL, file not found)
    - _Requirements: 5.1, 5.2, 5.5, 7.4_

  - [ ] 10.2 Write property test for filename preservation
    - **Property 13: Download filename preservation**
    - **Validates: Requirements 5.2**

  - [ ] 10.3 Write property test for signed URL generation
    - **Property 15: Signed URL generation**
    - **Validates: Requirements 5.5**

  - [ ] 10.4 Write property test for download access control
    - **Property 21: Download access control**
    - **Validates: Requirements 7.4**

  - [ ] 10.5 Write unit tests for download functionality
    - Test download triggers
    - Test error handling
    - _Requirements: 5.1_

- [ ] 11. Implement deletion functionality
  - [ ] 11.1 Create useDeleteAttachment hook
    - Delete file from Supabase Storage
    - Delete attachment record from database
    - Handle errors (file not found, permission denied)
    - Invalidate queries on success
    - _Requirements: 6.1, 6.2_

  - [ ] 11.2 Write property test for deletion removes both
    - **Property 16: Deletion removes storage and database**
    - **Validates: Requirements 6.1, 6.2**

  - [ ] 11.3 Write property test for deletion triggers update
    - **Property 17: Deletion triggers list update**
    - **Validates: Requirements 6.4**

  - [ ] 11.4 Write property test for cascade deletion
    - **Property 18: Cascade deletion**
    - **Validates: Requirements 6.5**

  - [ ] 11.5 Write unit tests for deletion
    - Test confirmation required
    - Test error handling
    - Test success feedback
    - _Requirements: 6.3_

- [ ] 12. Create AttachmentsSection container component
  - [ ] 12.1 Build AttachmentsSection component
    - Accept props: projectId or taskId, organizationId
    - Integrate FileUploadZone
    - Integrate AttachmentList
    - Manage upload state
    - Handle upload completion
    - Handle download requests
    - Handle delete requests
    - _Requirements: All_

  - [ ] 12.2 Write property test for upload triggers list update
    - **Property 4: Upload triggers list update**
    - **Validates: Requirements 1.5**

  - [ ] 12.3 Write property test for timestamp recording
    - **Property 23: Timestamp recording**
    - **Validates: Requirements 10.2**

  - [ ] 12.4 Write integration tests for AttachmentsSection
    - Test complete upload flow
    - Test complete download flow
    - Test complete deletion flow
    - Test multi-file upload
    - _Requirements: All_

- [ ] 13. Integrate attachments into Project and Task pages
  - [ ] 13.1 Add AttachmentsSection to Project detail page
    - Import AttachmentsSection
    - Pass projectId and organizationId
    - Add section to page layout
    - _Requirements: 4.1_

  - [ ] 13.2 Add AttachmentsSection to Task detail page
    - Import AttachmentsSection
    - Pass taskId and organizationId
    - Add section to page layout
    - _Requirements: 4.2_

  - [ ] 13.3 Write integration tests for page integration
    - Test attachments display on project page
    - Test attachments display on task page
    - Test upload from project page
    - Test upload from task page
    - _Requirements: 4.1, 4.2_

- [ ] 14. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Polish and error handling
  - [ ] 15.1 Add comprehensive error handling
    - Handle storage quota exceeded
    - Handle network errors with retry
    - Handle permission errors
    - Display user-friendly error messages
    - _Requirements: 9.3, 9.4_

  - [ ] 15.2 Add image preview modal
    - Create modal for full-size image preview
    - Trigger on thumbnail click
    - Add close button
    - _Requirements: 5.4_

  - [ ] 15.3 Optimize performance
    - Lazy load thumbnails
    - Implement pagination for large attachment lists
    - Cache signed URLs
    - _Requirements: Performance_

  - [ ] 15.4 Add success notifications
    - Toast on successful upload
    - Toast on successful deletion
    - Toast on download start
    - _Requirements: 9.2_

  - [ ] 15.5 Write unit tests for error scenarios
    - Test all error messages
    - Test retry functionality
    - Test edge cases
    - _Requirements: 9.3, 9.4_
