# Attachment Management System - Design Document

## Overview

The Attachment Management System provides comprehensive file upload, storage, and management capabilities for the VibeManager platform. It uses Supabase Storage for secure file storage, implements drag-and-drop upload with react-dropzone, and maintains strict multi-tenant isolation. The system supports both project and task attachments with metadata tracking and access control.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React Frontend                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Project    │  │     Task     │  │  Attachment  │      │
│  │     Page     │  │     Page     │  │   Upload     │      │
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
│   PostgreSQL   │  │    Supabase    │  │     RLS     │
│  (attachments) │  │    Storage     │  │  Policies   │
└────────────────┘  └────────────────┘  └─────────────┘
```

### Component Hierarchy

```
ProjectPage / TaskPage
└── AttachmentsSection
    ├── FileUploadZone
    │   └── react-dropzone
    └── AttachmentList
        └── AttachmentCard (multiple)
            ├── FileIcon
            ├── FileMetadata
            └── ActionMenu (download, delete)
```

## Components and Interfaces

### Data Models

#### Attachment Type
```typescript
interface Attachment {
  id: string;
  organization_id: string;
  project_id: string | null;
  task_id: string | null;
  file_url: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
  uploader?: {
    first_name: string;
    last_name: string;
  };
}
```

#### Upload Progress Type
```typescript
interface UploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}
```

#### File Validation Config
```typescript
const FILE_VALIDATION = {
  maxSize: 10 * 1024 * 1024, // 10MB
  acceptedTypes: {
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/vnd.ms-excel': ['.xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'text/plain': ['.txt'],
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/svg+xml': ['.svg'],
  },
};
```

### Custom Hooks

#### useAttachments
```typescript
const useAttachments = (
  organizationId: string | undefined,
  projectId?: string | null,
  taskId?: string | null
) => {
  // Returns: { data: Attachment[], isLoading, error }
  // Fetches attachments for project or task
  // Includes uploader profile information
  // Orders by created_at descending
}
```

#### useUploadAttachment
```typescript
const useUploadAttachment = () => {
  // Returns: { mutate, mutateAsync, isLoading, error }
  // Uploads file to Supabase Storage
  // Creates attachment record
  // Returns progress updates
}
```

#### useDeleteAttachment
```typescript
const useDeleteAttachment = () => {
  // Returns: { mutate, mutateAsync, isLoading, error }
  // Deletes file from Supabase Storage
  // Deletes attachment record
  // Invalidates queries
}
```

#### useDownloadAttachment
```typescript
const useDownloadAttachment = () => {
  // Returns: { download: (attachment: Attachment) => Promise<void> }
  // Generates signed URL from Supabase Storage
  // Triggers browser download
}
```

### React Components

#### AttachmentsSection
- Container component for attachments
- Props: projectId or taskId, organizationId
- Displays FileUploadZone and AttachmentList
- Manages upload state

#### FileUploadZone
- Drag-and-drop upload component using react-dropzone
- Props: onUpload, isUploading, accept, maxSize
- Visual feedback for drag over state
- Click to open file picker
- Displays upload progress
- Shows validation errors

#### AttachmentList
- Displays list of attachments
- Props: attachments, isLoading, onDelete, onDownload
- Shows empty state when no attachments
- Loading skeletons during fetch

#### AttachmentCard
- Individual attachment display
- Props: attachment, onDelete, onDownload
- Shows file icon based on type
- Displays file name, size, uploader, date
- Action menu with download and delete
- Image thumbnail for image files

#### FileIcon
- Displays appropriate icon for file type
- Props: fileType, fileName
- Uses lucide-react icons
- Fallback for unknown types

### Storage Structure

```
supabase-storage-bucket/
└── {organization_id}/
    ├── projects/
    │   └── {project_id}/
    │       ├── {unique_filename_1}
    │       └── {unique_filename_2}
    └── tasks/
        └── {task_id}/
            ├── {unique_filename_1}
            └── {unique_filename_2}
```

### Data Flow

1. **Upload Flow**:
   - User drops file → Validate size/type → Generate storage path → Upload to Supabase Storage → Create attachment record → Invalidate queries

2. **Download Flow**:
   - User clicks attachment → Generate signed URL → Trigger browser download

3. **Delete Flow**:
   - User confirms delete → Delete from Storage → Delete record → Invalidate queries

4. **List Flow**:
   - Component mounts → Query attachments with uploader info → Display list

## Data Models

### Database Schema

The attachments table already exists in the database:

```sql
CREATE TABLE public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
```

### RLS Policies

Existing policies enforce:
- Users can only view attachments from their organization
- Users can create attachments in their organization
- Users can delete attachments they uploaded or if they're admins
- Cascade deletion when parent project/task is deleted

### Supabase Storage Configuration

- Create storage bucket: `attachments`
- Enable RLS on bucket
- Policy: Users can upload to their organization path
- Policy: Users can download from their organization path
- Policy: Users can delete their own uploads or if admin



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: File upload creates storage and database record
*For any* file upload, both a file in Supabase Storage and an attachment database record should be created.
**Validates: Requirements 1.1, 1.2**

### Property 2: Organization ID auto-assignment
*For any* file upload, the attachment's organization_id should match the uploading user's current organization.
**Validates: Requirements 1.3**

### Property 3: Uploader tracking
*For any* file upload, the attachment's uploaded_by field should equal the current user's ID.
**Validates: Requirements 1.4, 10.1**

### Property 4: Upload triggers list update
*For any* successful file upload, the attachment should appear in the attachments list immediately after upload.
**Validates: Requirements 1.5**

### Property 5: Multiple file upload completeness
*For any* set of files dropped for upload, all files should be uploaded successfully.
**Validates: Requirements 2.4**

### Property 6: File size validation
*For any* file with size greater than 10MB, the upload should be rejected with an error.
**Validates: Requirements 3.1**

### Property 7: Document type acceptance
*For any* file with type PDF, DOC, DOCX, XLS, XLSX, or TXT, the upload should be accepted.
**Validates: Requirements 3.3**

### Property 8: Image type acceptance
*For any* file with type JPG, JPEG, PNG, GIF, or SVG, the upload should be accepted.
**Validates: Requirements 3.4**

### Property 9: Project attachment filtering
*For any* project, the displayed attachments should only include attachments where project_id matches that project.
**Validates: Requirements 4.1**

### Property 10: Task attachment filtering
*For any* task, the displayed attachments should only include attachments where task_id matches that task.
**Validates: Requirements 4.2**

### Property 11: Attachment display completeness
*For any* attachment displayed, the UI should show file name, file type icon, file size, upload date, and uploader name.
**Validates: Requirements 4.3, 4.4**

### Property 12: Attachment ordering
*For any* list of attachments, they should be ordered by created_at in descending order (newest first).
**Validates: Requirements 4.5**

### Property 13: Download filename preservation
*For any* file download, the downloaded filename should match the original file_name from the attachment record.
**Validates: Requirements 5.2**

### Property 14: Image thumbnail display
*For any* attachment with an image file type, a thumbnail preview should be displayed.
**Validates: Requirements 5.3**

### Property 15: Signed URL generation
*For any* file download, a signed URL should be generated from Supabase Storage.
**Validates: Requirements 5.5**

### Property 16: Deletion removes storage and database
*For any* attachment deletion, both the file in Supabase Storage and the database record should be removed.
**Validates: Requirements 6.1, 6.2**

### Property 17: Deletion triggers list update
*For any* successful attachment deletion, the attachment should be removed from the list immediately.
**Validates: Requirements 6.4**

### Property 18: Cascade deletion
*For any* project or task with attachments, deleting the project/task should delete all associated attachments.
**Validates: Requirements 6.5**

### Property 19: Organization filtering
*For any* user, attachment queries should only return attachments from their organization.
**Validates: Requirements 7.1, 7.5**

### Property 20: Storage path organization structure
*For any* uploaded file, the storage path should include the organization_id in the format {organization_id}/{project_id or task_id}/{filename}.
**Validates: Requirements 7.2, 8.1**

### Property 21: Download access control
*For any* download request, the user must belong to the same organization as the attachment.
**Validates: Requirements 7.4**

### Property 22: Unique filename generation
*For any* file upload where a file with the same name exists, a unique filename should be generated while preserving the extension.
**Validates: Requirements 8.2, 8.3**

### Property 23: Timestamp recording
*For any* attachment creation, the created_at timestamp should be set to the current time.
**Validates: Requirements 10.2**

### Property 24: Date formatting
*For any* attachment display, the upload date should be formatted in a human-readable format.
**Validates: Requirements 10.4**

### Property 25: Uploader information retrieval
*For any* attachment query, the uploader's profile information should be included via join.
**Validates: Requirements 10.5**

### Property 26: Multi-file progress tracking
*For any* set of files being uploaded, each file should have its own individual progress state.
**Validates: Requirements 9.5**

## Error Handling

### Upload Errors
- Display clear error messages for file size violations
- Display clear error messages for unsupported file types
- Show network errors with retry option
- Handle storage quota exceeded errors
- Validate files before upload to prevent unnecessary API calls

### Download Errors
- Handle expired signed URLs gracefully
- Display error if file no longer exists in storage
- Show network errors with retry option

### Deletion Errors
- Confirm deletion before executing
- Handle cases where file is already deleted
- Display error if deletion fails
- Rollback database changes if storage deletion fails

### Access Control Errors
- Display "Access Denied" for cross-organization access attempts
- Handle RLS policy violations gracefully
- Log security violations for audit

## Testing Strategy

### Unit Testing

Unit tests will verify specific examples and edge cases:

- **File validation**: Test size limits, file type acceptance/rejection
- **Upload UI**: Test drag-and-drop interactions, file picker
- **Progress tracking**: Test progress state updates
- **Error handling**: Test error messages for various failure scenarios
- **Component rendering**: Test AttachmentCard, FileIcon, FileUploadZone
- **Confirmation dialogs**: Test deletion confirmation

### Property-Based Testing

Property-based tests will verify universal properties across all inputs using **fast-check** (JavaScript/TypeScript property testing library):

- Each property-based test will run a minimum of 100 iterations
- Each test will be tagged with a comment referencing the design document property
- Tag format: `// Feature: attachment-management, Property {number}: {property_text}`
- Each correctness property will be implemented by a SINGLE property-based test

**Property test coverage**:
- Upload and record creation (Properties 1, 2, 3, 4)
- File validation (Properties 6, 7, 8)
- Filtering and display (Properties 9, 10, 11, 12)
- Download functionality (Properties 13, 14, 15)
- Deletion (Properties 16, 17, 18)
- Multi-tenant isolation (Properties 19, 20, 21)
- Filename handling (Property 22)
- Metadata tracking (Properties 23, 24, 25)
- Progress tracking (Property 26)

### Integration Testing

Integration tests will verify:
- Complete upload flow (select file → validate → upload → display)
- Complete download flow (click → generate URL → download)
- Complete deletion flow (confirm → delete storage → delete record → update UI)
- Cascade deletion when parent is deleted
- RLS policies enforce multi-tenant isolation
- Storage bucket policies enforce access control

### Manual Testing Checklist

- Upload various file types and sizes
- Test drag-and-drop functionality
- Upload multiple files simultaneously
- Download attachments and verify filenames
- Delete attachments and verify removal
- Test with image files (thumbnails, preview)
- Verify attachments only show for correct project/task
- Test error scenarios (oversized files, unsupported types)
- Verify organization isolation with multiple orgs
- Test cascade deletion
