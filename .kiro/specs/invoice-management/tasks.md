# Implementation Plan

- [x] 1. Create invoice data hooks and API integration
  - [x] 1.1 Implement useInvoices hook with filtering support
    - Create hook in `src/hooks/useInvoices.ts`
    - Support organization filtering (required)
    - Support optional status and client filters
    - Include client relationship in query
    - Order by created_at descending by default
    - _Requirements: 5.1, 5.3, 5.4, 5.5_

  - [x] 1.2 Implement useCreateInvoice hook
    - Create mutation hook for invoice creation
    - Handle invoice and line items in transaction
    - Generate invoice number before creation
    - Invalidate queries on success
    - _Requirements: 1.1, 1.2, 1.3, 8.1, 8.2, 8.3_

  - [x] 1.3 Write property test for invoice total calculation
    - **Property 1: Invoice total equals sum of line item totals**
    - **Validates: Requirements 1.3, 2.3, 2.5**

  - [x] 1.4 Implement useUpdateInvoice hook
    - Create mutation hook for invoice updates
    - Handle line item updates (delete old, insert new)
    - Recalculate totals
    - Invalidate queries on success
    - _Requirements: 1.4, 2.5_

  - [x] 1.5 Implement useDeleteInvoice hook
    - Create mutation hook for invoice deletion
    - Cascade deletion handled by database
    - Invalidate queries on success
    - _Requirements: General CRUD_

  - [x] 1.6 Write property test for organization filtering
    - **Property 11: Organization filtering**
    - **Validates: Requirements 5.1, 6.1**

- [x] 2. Implement invoice number generation
  - [x] 2.1 Create invoice number generation utility
    - Implement function to generate "INV-YYYY-NNNN" format
    - Query for highest existing number in organization
    - Increment and format with leading zeros
    - Handle year rollover
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 2.2 Write property test for invoice number format
    - **Property 3: Invoice number format compliance**
    - **Validates: Requirements 8.1, 8.2, 8.3**

  - [x] 2.3 Write property test for invoice number uniqueness
    - **Property 2: Invoice numbers are unique within organization**
    - **Validates: Requirements 1.1, 8.5**

  - [x] 2.4 Add useGenerateInvoiceNumber hook
    - Create hook that calls generation utility
    - Handle conflicts with retry logic
    - Return next available number
    - _Requirements: 8.4_

- [ ] 3. Create invoice form with validation
  - [x] 3.1 Create InvoiceDialog component
    - Build modal dialog using shadcn Dialog
    - Support create and edit modes
    - Handle open/close state
    - Integrate form submission
    - _Requirements: General UI_

  - [x] 3.2 Create InvoiceForm component with Zod schema
    - Implement form using React Hook Form
    - Create Zod validation schema for invoice
    - Add client selection dropdown
    - Add date pickers for issue_date and due_date
    - Add notes textarea
    - Validate due_date >= issue_date
    - _Requirements: 1.2, 7.1, 7.5_

  - [x] 3.3 Implement dynamic line items section
    - Create LineItemRow component
    - Fields: description, quantity, unit_price
    - Display calculated total per row
    - Add/remove line item buttons
    - Validate minimum 1 line item
    - Validate positive quantity and non-negative price
    - _Requirements: 2.1, 2.2, 7.2, 7.3, 7.4_

  - [ ] 3.4 Write property test for line item defaults
    - **Property 4: Line item default quantity**
    - **Validates: Requirements 2.2**

  - [x] 3.5 Add real-time total calculation display
    - Calculate subtotal from all line items
    - Display formatted currency values
    - Update on any line item change
    - _Requirements: 1.3_

  - [x] 3.6 Write unit tests for form validation
    - Test empty client validation
    - Test empty line items validation
    - Test negative price validation
    - Test negative quantity validation
    - Test due date before issue date validation
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Build invoice PDF generation
  - [ ] 5.1 Create InvoiceDocument component using @react-pdf/renderer
    - Import Document, Page, View, Text, StyleSheet from @react-pdf/renderer
    - Create PDF layout with header section
    - Add organization details section
    - Add client details section
    - Add invoice metadata (number, dates)
    - _Requirements: 3.1, 3.2_

  - [ ] 5.2 Implement line items table in PDF
    - Create table header (Description, Qty, Price, Total)
    - Map line items to table rows
    - Order by position field
    - Format currency with 2 decimal places
    - _Requirements: 3.3, 3.4_

  - [ ] 5.3 Write property test for PDF line item ordering
    - **Property 7: PDF line items ordered by position**
    - **Validates: Requirements 3.3**

  - [ ] 5.4 Add totals section to PDF
    - Calculate and display subtotal
    - Display total amount
    - Format all currency values
    - Add notes section if present
    - _Requirements: 3.5_

  - [ ] 5.5 Write property test for PDF content completeness
    - **Property 6: PDF contains all required invoice data**
    - **Validates: Requirements 3.2, 3.5**

  - [ ] 5.6 Write property test for currency formatting
    - **Property 8: Currency formatting in PDF**
    - **Validates: Requirements 3.4**

  - [ ] 5.7 Create InvoicePreview component
    - Wrap PDFViewer for in-app preview
    - Add PDFDownloadLink for download option
    - Handle loading and error states
    - _Requirements: 3.1_

- [x] 6. Implement email sending functionality
  - [x] 6.1 Create Supabase Edge Function stub for send-invoice
    - Create Edge Function file structure
    - Define function signature (invoice_id, recipient_email, pdf_blob)
    - Add placeholder for Resend integration
    - Return success/error response
    - _Requirements: 4.1_

  - [x] 6.2 Implement useSendInvoice hook
    - Generate PDF blob from InvoiceDocument
    - Get client email from invoice data
    - Call Edge Function with supabase.functions.invoke
    - Update invoice status to "sent" on success
    - Handle errors and display messages
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ] 6.3 Write property test for status update after sending
    - **Property 9: Status transition after sending**
    - **Validates: Requirements 4.3**

  - [ ] 6.4 Write property test for email addressing
    - **Property 10: Email uses client's email address**
    - **Validates: Requirements 4.5**

  - [x] 6.5 Write unit tests for email error handling
    - Test Edge Function failure displays error
    - Test missing client email handling
    - _Requirements: 4.4_

- [x] 7. Build invoices page and list view
  - [x] 7.1 Create InvoicesPage component
    - Set up page layout with DashboardLayout
    - Add "New Invoice" button
    - Manage dialog state for create/edit
    - Handle invoice actions (edit, delete, send)
    - _Requirements: General UI_

  - [x] 7.2 Create InvoiceCard component
    - Display invoice number, client name, total
    - Display status badge with color coding
    - Display issue date and due date
    - Add dropdown menu for actions (view, edit, delete, send)
    - _Requirements: 5.2_

  - [ ] 7.3 Write property test for invoice list display fields
    - **Property 12: Invoice list displays required fields**
    - **Validates: Requirements 5.2**

  - [x] 7.4 Implement InvoiceFilters component
    - Add status filter dropdown (all, pending, sent, paid)
    - Add client filter dropdown
    - Update query parameters on filter change
    - _Requirements: 5.3, 5.4_

  - [ ] 7.5 Write property test for status filtering
    - **Property 13: Status filter correctness**
    - **Validates: Requirements 5.3**

  - [ ] 7.6 Write property test for client filtering
    - **Property 14: Client filter correctness**
    - **Validates: Requirements 5.4**

  - [x] 7.7 Create StatusBadge component
    - Display status with appropriate color
    - pending: yellow, sent: blue, paid: green
    - Use shadcn Badge component
    - _Requirements: 5.2_

- [x] 8. Implement multi-tenant security and validation
  - [x] 8.1 Add organization_id auto-assignment in hooks
    - Get organization_id from useOrganization hook
    - Automatically include in all invoice mutations
    - Validate organization_id is present
    - _Requirements: 6.2_

  - [x] 8.2 Write property test for organization ID assignment
    - **Property 16: Organization ID auto-assignment**
    - **Validates: Requirements 6.2**

  - [x] 8.3 Add client-organization validation
    - Verify client belongs to same organization before creating invoice
    - Display error if client from different organization selected
    - _Requirements: 6.5_

  - [x] 8.4 Write property test for client-organization relationship
    - **Property 17: Client belongs to same organization**
    - **Validates: Requirements 6.5**

  - [x] 8.5 Write property test for mandatory field validation
    - **Property 18: Mandatory field validation**
    - **Validates: Requirements 1.2, 2.1**

  - [x] 8.6 Write integration tests for RLS policies
    - Test users can only access their organization's invoices
    - Test cross-organization access is denied
    - Test line item access through parent invoice
    - _Requirements: 6.1, 6.3, 6.4_

- [x] 9. Add line item reordering functionality
  - [x] 9.1 Implement drag-and-drop for line items
    - Add drag handles to LineItemRow
    - Use dnd-kit or react-beautiful-dnd
    - Update position values on drop
    - Persist new order to database
    - _Requirements: 2.4_

  - [x] 9.2 Write property test for position ordering
    - **Property 5: Line item position ordering**
    - **Validates: Requirements 2.4**

- [x] 10. Implement status transitions and validation
  - [x] 10.1 Add status update functionality
    - Allow status changes from invoice actions menu
    - Validate status transitions (pending → sent → paid)
    - Update invoice status via useUpdateInvoice
    - _Requirements: 1.4_

  - [x] 10.2 Write property test for status transitions
    - **Property 19: Status transition validity**
    - **Validates: Requirements 1.4**

  - [x] 10.3 Write property test for due date persistence
    - **Property 20: Due date persistence and display**
    - **Validates: Requirements 1.5**

- [x] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Polish and error handling
  - [x] 12.1 Add loading states to all async operations
    - Show spinners during invoice creation/update
    - Show loading state during PDF generation
    - Show loading state during email sending
    - _Requirements: General UX_

  - [x] 12.2 Add error boundaries and error messages
    - Wrap components in error boundaries
    - Display user-friendly error messages
    - Add retry buttons for failed operations
    - _Requirements: Error Handling_

  - [x] 12.3 Add success notifications
    - Toast on successful invoice creation
    - Toast on successful invoice update
    - Toast on successful email sending
    - Toast on successful deletion
    - _Requirements: General UX_

  - [x] 12.4 Write integration tests for complete flows
    - Test complete invoice creation flow
    - Test complete invoice edit flow
    - Test complete invoice send flow
    - Test complete invoice delete flow
    - _Requirements: All_
