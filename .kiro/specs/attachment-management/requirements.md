# Requirements Document

## Introduction

The Attachment Management System enables users to upload, manage, and download files associated with projects and tasks in the VibeManager platform. The system provides drag-and-drop file upload functionality, file preview capabilities, and secure storage using Supabase Storage. All attachments are scoped to organizations for multi-tenant data isolation.

## Glossary

- **Attachment System**: The complete file management subsystem including upload, storage, retrieval, and deletion
- **Supabase Storage**: The file storage service provided by Supabase for storing uploaded files
- **Drag-and-Drop Zone**: A UI component that allows users to drag files from their file system and drop them to upload
- **File Metadata**: Information about an uploaded file including name, type, size, and upload timestamp
- **Organization**: A tenant in the multi-tenant system; all attachments belong to exactly one organization
- **Project**: A work project that can have multiple file attachments
- **Task**: A work task that can have multiple file attachments

## Requirements

### Requirement 1: File Upload Functionality

**User Story:** As a user, I want to upload files to projects and tasks, so that I can keep all relevant documents organized with my work.

#### Acceptance Criteria

1. WHEN a user uploads a file, THE Attachment System SHALL store the file in Supabase Storage
2. WHEN a user uploads a file, THE Attachment System SHALL create an attachment record with file metadata
3. WHEN a user uploads a file, THE Attachment System SHALL automatically set the organization_id from the user's current organization
4. WHEN a user uploads a file, THE Attachment System SHALL record the uploaded_by user_id
5. WHEN a file upload completes, THE Attachment System SHALL display the new attachment in the list immediately

### Requirement 2: Drag-and-Drop Upload Interface

**User Story:** As a user, I want to drag and drop files to upload them, so that I can quickly add attachments without navigating file dialogs.

#### Acceptance Criteria

1. WHEN a user drags a file over the drop zone, THE Attachment System SHALL provide visual feedback indicating the drop zone is active
2. WHEN a user drops a file on the drop zone, THE Attachment System SHALL initiate the upload process
3. WHEN a user clicks the drop zone, THE Attachment System SHALL open a file picker dialog
4. WHEN multiple files are dropped, THE Attachment System SHALL upload all files sequentially
5. WHEN a file is being uploaded, THE Attachment System SHALL display a progress indicator

### Requirement 3: File Type and Size Validation

**User Story:** As a system administrator, I want to restrict file types and sizes, so that storage is used appropriately and security is maintained.

#### Acceptance Criteria

1. WHEN a user attempts to upload a file, THE Attachment System SHALL validate the file size is under 10MB
2. WHEN a user attempts to upload a file larger than 10MB, THE Attachment System SHALL prevent upload and display an error message
3. WHEN a user uploads a file, THE Attachment System SHALL accept common document types (PDF, DOC, DOCX, XLS, XLSX, TXT)
4. WHEN a user uploads a file, THE Attachment System SHALL accept common image types (JPG, JPEG, PNG, GIF, SVG)
5. WHEN a user attempts to upload an unsupported file type, THE Attachment System SHALL prevent upload and display an error message

### Requirement 4: Attachment Display and Management

**User Story:** As a user, I want to view all attachments for a project or task, so that I can access relevant files quickly.

#### Acceptance Criteria

1. WHEN a user views a project, THE Attachment System SHALL display all attachments associated with that project
2. WHEN a user views a task, THE Attachment System SHALL display all attachments associated with that task
3. WHEN displaying attachments, THE Attachment System SHALL show file name, file type icon, file size, and upload date
4. WHEN displaying attachments, THE Attachment System SHALL show the name of the user who uploaded the file
5. WHEN attachments are displayed, THE Attachment System SHALL order them by created_at descending (newest first)

### Requirement 5: File Download and Preview

**User Story:** As a user, I want to download or preview attachments, so that I can access the file contents.

#### Acceptance Criteria

1. WHEN a user clicks an attachment, THE Attachment System SHALL initiate a download of the file
2. WHEN downloading a file, THE Attachment System SHALL use the original file name
3. WHERE the file is an image, THE Attachment System SHALL display a thumbnail preview
4. WHEN a user clicks an image thumbnail, THE Attachment System SHALL open a full-size preview
5. WHEN downloading a file, THE Attachment System SHALL generate a signed URL from Supabase Storage

### Requirement 6: Attachment Deletion

**User Story:** As a user, I want to delete attachments I no longer need, so that I can keep my workspace organized.

#### Acceptance Criteria

1. WHEN a user deletes an attachment, THE Attachment System SHALL remove the file from Supabase Storage
2. WHEN a user deletes an attachment, THE Attachment System SHALL remove the attachment record from the database
3. WHEN a user attempts to delete an attachment, THE Attachment System SHALL require confirmation
4. WHEN an attachment is deleted, THE Attachment System SHALL update the attachment list immediately
5. WHEN a project or task is deleted, THE Attachment System SHALL cascade delete all associated attachments

### Requirement 7: Multi-Tenant Data Isolation

**User Story:** As a system administrator, I want strict data isolation for attachments, so that users can only access files from their organization.

#### Acceptance Criteria

1. WHEN any attachment query executes, THE Attachment System SHALL filter results by the user's organization_id through RLS policies
2. WHEN a user uploads an attachment, THE Attachment System SHALL store files in an organization-specific storage bucket path
3. WHEN a user attempts to access an attachment from another organization, THE Attachment System SHALL deny access through RLS policies
4. WHEN generating download URLs, THE Attachment System SHALL verify the user has access to the attachment's organization
5. WHEN a user queries attachments, THE Attachment System SHALL only return attachments from projects/tasks in their organization

### Requirement 8: Storage Path Organization

**User Story:** As a system architect, I want files organized in a logical storage structure, so that storage is manageable and scalable.

#### Acceptance Criteria

1. WHEN a file is uploaded, THE Attachment System SHALL store it in a path format: {organization_id}/{project_id or task_id}/{filename}
2. WHEN storing a file, THE Attachment System SHALL generate a unique filename if a file with the same name already exists
3. WHEN storing a file, THE Attachment System SHALL preserve the original file extension
4. WHEN a file is deleted, THE Attachment System SHALL remove it from the storage path
5. THE Attachment System SHALL use Supabase Storage buckets with RLS policies for access control

### Requirement 9: Upload Progress and Error Handling

**User Story:** As a user, I want clear feedback during file uploads, so that I know the status of my uploads.

#### Acceptance Criteria

1. WHEN a file is uploading, THE Attachment System SHALL display a progress bar showing upload percentage
2. WHEN an upload completes successfully, THE Attachment System SHALL display a success message
3. IF an upload fails, THEN THE Attachment System SHALL display an error message with the reason
4. WHEN an upload fails, THE Attachment System SHALL allow the user to retry the upload
5. WHEN multiple files are uploading, THE Attachment System SHALL show progress for each file individually

### Requirement 10: Attachment Metadata Tracking

**User Story:** As a user, I want to see who uploaded files and when, so that I can track file history.

#### Acceptance Criteria

1. WHEN an attachment is created, THE Attachment System SHALL record the uploaded_by user_id
2. WHEN an attachment is created, THE Attachment System SHALL record the created_at timestamp
3. WHEN displaying attachments, THE Attachment System SHALL show the uploader's name from the profiles table
4. WHEN displaying attachments, THE Attachment System SHALL format the upload date in a human-readable format
5. WHEN querying attachments, THE Attachment System SHALL join with profiles to retrieve uploader information
