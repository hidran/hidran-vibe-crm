# Invoice Management System - Design Document

## Overview

The Invoice Management System is a comprehensive invoicing solution for the VibeManager B2B SaaS platform. It enables organizations to create professional invoices with dynamic line items, generate PDF documents, and send invoices via email. The system is built with React, TypeScript, TanStack Query for state management, React Hook Form with Zod for validation, and @react-pdf/renderer for PDF generation.

The design follows atomic component principles, strict typing, and leverages Supabase for backend operations including Row Level Security (RLS) for multi-tenant data isolation. Email delivery is handled through Supabase Edge Functions to keep API keys secure.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React Frontend                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Invoice Page │  │ Invoice Form │  │ Invoice PDF  │      │
│  │              │  │  Component   │  │  Component   │      │
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
│   PostgreSQL   │  │  Edge Function │  │     RLS     │
│   (invoices,   │  │  (send-invoice)│  │  Policies   │
│  line_items)   │  │                │  │             │
└────────────────┘  └────────────────┘  └─────────────┘
```

### Component Hierarchy

```
InvoicesPage
├── InvoiceList
│   ├── InvoiceCard (multiple)
│   │   ├── StatusBadge
│   │   └── DropdownMenu (actions)
│   └── InvoiceFilters
│       ├── StatusFilter
│       └── ClientFilter
└── InvoiceDialog
    ├── InvoiceForm
    │   ├── ClientSelect
    │   ├── DatePickers
    │   ├── LineItemsSection
    │   │   └── LineItemRow (multiple)
    │   └── InvoiceSummary
    └── InvoicePreview
        └── InvoiceDocument (PDF)
```

## Components and Interfaces

### Data Models

#### Invoice Type
```typescript
interface Invoice {
  id: string;
  organization_id: string;
  client_id: string | null;
  invoice_number: string;
  total_amount: number;
  status: 'pending' | 'sent' | 'paid';
  issue_date: string;
  due_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
```

#### Line Item Type
```typescript
interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number; // computed column
  position: number;
  created_at: string;
}
```

#### Invoice Form Data
```typescript
interface InvoiceFormData {
  client_id: string;
  issue_date: Date;
  due_date: Date | null;
  notes: string;
  line_items: LineItemInput[];
}

interface LineItemInput {
  description: string;
  quantity: number;
  unit_price: number;
}
```

### Custom Hooks

#### useInvoices
```typescript
const useInvoices = (
  organizationId: string | undefined,
  filters?: { status?: string; clientId?: string }
) => {
  // Returns: { data: Invoice[], isLoading, error }
  // Fetches invoices with optional filtering
}
```

#### useCreateInvoice
```typescript
const useCreateInvoice = () => {
  // Returns: { mutate, mutateAsync, isLoading, error }
  // Creates invoice with line items in a transaction
}
```

#### useUpdateInvoice
```typescript
const useUpdateInvoice = () => {
  // Returns: { mutate, mutateAsync, isLoading, error }
  // Updates invoice and line items
}
```

#### useDeleteInvoice
```typescript
const useDeleteInvoice = () => {
  // Returns: { mutate, mutateAsync, isLoading, error }
  // Deletes invoice (cascade deletes line items)
}
```

#### useSendInvoice
```typescript
const useSendInvoice = () => {
  // Returns: { mutate, mutateAsync, isLoading, error }
  // Generates PDF and sends via Edge Function
}
```

#### useGenerateInvoiceNumber
```typescript
const useGenerateInvoiceNumber = (organizationId: string) => {
  // Returns: { data: string, isLoading, error }
  // Generates next available invoice number
}
```

### React Components

#### InvoicesPage
- Main page component
- Manages dialog state (create/edit)
- Displays invoice list with filters
- Handles invoice actions (view, edit, delete, send)

#### InvoiceDialog
- Modal dialog for create/edit
- Contains InvoiceForm and optional preview
- Manages form submission

#### InvoiceForm
- Form with React Hook Form + Zod validation
- Client selection dropdown
- Date pickers for issue and due dates
- Dynamic line items section with add/remove
- Real-time total calculation
- Notes textarea

#### LineItemRow
- Single line item input row
- Fields: description, quantity, unit_price
- Displays calculated total
- Remove button

#### InvoiceDocument (PDF)
- @react-pdf/renderer component
- Renders professional invoice layout
- Sections: Header, Organization Info, Client Info, Line Items Table, Totals, Notes
- Styled with PDF-specific styling

#### InvoicePreview
- Wrapper for PDFViewer or PDFDownloadLink
- Allows preview before sending
- Download button

### Validation Schema

```typescript
const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().positive("Quantity must be positive"),
  unit_price: z.number().nonnegative("Price cannot be negative"),
});

const invoiceFormSchema = z.object({
  client_id: z.string().uuid("Client is required"),
  issue_date: z.date(),
  due_date: z.date().nullable(),
  notes: z.string().optional(),
  line_items: z.array(lineItemSchema).min(1, "At least one line item required"),
}).refine(
  (data) => !data.due_date || data.due_date >= data.issue_date,
  {
    message: "Due date must be after issue date",
    path: ["due_date"],
  }
);
```

## Data Models

### Database Schema

The database schema is already implemented in the migrations. Key aspects:

#### invoices table
- Primary key: `id` (UUID)
- Foreign keys: `organization_id`, `client_id`
- Unique constraint: `(organization_id, invoice_number)`
- Computed total from line items
- Status enum: pending, sent, paid
- Timestamps: created_at, updated_at

#### invoice_line_items table
- Primary key: `id` (UUID)
- Foreign key: `invoice_id` (CASCADE DELETE)
- Computed column: `total` (quantity * unit_price)
- Position for ordering

### RLS Policies

Existing policies enforce:
- Users can only view invoices from their organization
- Only owners and admins can create/update/delete invoices
- Line items inherit access control from parent invoice

### Data Flow

1. **Create Invoice Flow**:
   - User fills form → Validation → Generate invoice number → Insert invoice → Insert line items → Invalidate queries

2. **Update Invoice Flow**:
   - User edits form → Validation → Update invoice → Delete old line items → Insert new line items → Invalidate queries

3. **Send Invoice Flow**:
   - User clicks send → Generate PDF blob → Call Edge Function with PDF and email data → Update status to "sent" → Show success/error

4. **Delete Invoice Flow**:
   - User confirms delete → Delete invoice (line items cascade) → Invalidate queries



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Invoice total equals sum of line item totals
*For any* invoice with line items, the invoice total_amount should equal the sum of all line item totals (quantity * unit_price for each item).
**Validates: Requirements 1.3, 2.3, 2.5**

### Property 2: Invoice numbers are unique within organization
*For any* organization, all invoice numbers within that organization should be unique (no duplicates).
**Validates: Requirements 1.1, 8.5**

### Property 3: Invoice number format compliance
*For any* generated invoice number, it should match the format "INV-YYYY-NNNN" where YYYY is the current year and NNNN is a sequential number.
**Validates: Requirements 8.1, 8.2, 8.3**

### Property 4: Line item default quantity
*For any* line item created without specifying quantity, the quantity should be set to 1.
**Validates: Requirements 2.2**

### Property 5: Line item position ordering
*For any* invoice with multiple line items, reordering the items should result in position values that reflect the new order.
**Validates: Requirements 2.4**

### Property 6: PDF contains all required invoice data
*For any* invoice, the generated PDF should contain the organization details, client details, invoice number, issue date, due date (if present), all line items, and calculated totals.
**Validates: Requirements 3.2, 3.5**

### Property 7: PDF line items ordered by position
*For any* invoice with multiple line items, the line items in the generated PDF should appear in ascending order by their position field.
**Validates: Requirements 3.3**

### Property 8: Currency formatting in PDF
*For any* currency value in the PDF, it should be formatted with exactly two decimal places.
**Validates: Requirements 3.4**

### Property 9: Status transition after sending
*For any* invoice that is successfully sent via email, the invoice status should be updated to "sent".
**Validates: Requirements 4.3**

### Property 10: Email uses client's email address
*For any* invoice being sent, the email should be addressed to the email address from the associated client record.
**Validates: Requirements 4.5**

### Property 11: Organization filtering
*For any* user querying invoices, only invoices belonging to the user's organization should be returned.
**Validates: Requirements 5.1, 6.1**

### Property 12: Invoice list displays required fields
*For any* invoice in the list view, the display should include invoice number, client name, total amount, status, issue date, and due date.
**Validates: Requirements 5.2**

### Property 13: Status filter correctness
*For any* status filter applied, all returned invoices should have that exact status value.
**Validates: Requirements 5.3**

### Property 14: Client filter correctness
*For any* client filter applied, all returned invoices should belong to that specific client.
**Validates: Requirements 5.4**

### Property 15: Default ordering by created_at
*For any* unfiltered invoice query, the results should be ordered by created_at in descending order (newest first).
**Validates: Requirements 5.5**

### Property 16: Organization ID auto-assignment
*For any* invoice created by a user, the organization_id should automatically be set to the user's current organization.
**Validates: Requirements 6.2**

### Property 17: Client belongs to same organization
*For any* invoice, the associated client (if present) must belong to the same organization as the invoice.
**Validates: Requirements 6.5**

### Property 18: Mandatory field validation
*For any* invoice creation attempt, if organization_id, client_id, or issue_date is missing, the operation should fail with a validation error.
**Validates: Requirements 1.2, 2.1**

### Property 19: Status transition validity
*For any* invoice, updating the status to any of the valid values (pending, sent, paid) should succeed.
**Validates: Requirements 1.4**

### Property 20: Due date persistence and display
*For any* invoice with a due_date specified, the due date should be stored in the database and displayed in the PDF document.
**Validates: Requirements 1.5**

## Error Handling

### Validation Errors
- Form validation errors should be displayed inline next to the relevant field
- Use Zod error messages for clear, actionable feedback
- Prevent form submission until all validation passes

### API Errors
- Database errors (RLS violations, constraint violations) should be caught and displayed as user-friendly messages
- Network errors should trigger retry logic with exponential backoff
- Use toast notifications for transient errors

### Edge Function Errors
- Email sending failures should not prevent invoice creation
- Display clear error messages when email fails
- Allow users to retry sending without recreating the invoice

### PDF Generation Errors
- Catch rendering errors and display fallback message
- Log errors for debugging
- Provide download option as alternative to preview

### Concurrent Modification
- Use optimistic updates for better UX
- Handle stale data with query invalidation
- Show conflict messages when concurrent edits occur

## Testing Strategy

### Unit Testing

Unit tests will verify specific examples and edge cases:

- **Validation edge cases**: Empty client, no line items, negative values, invalid dates
- **Invoice number generation**: Format validation, year extraction, sequential numbering
- **Calculation functions**: Total calculation with various line item combinations
- **Component rendering**: Form fields, line item rows, PDF structure
- **Error handling**: API errors, validation errors, Edge Function failures

### Property-Based Testing

Property-based tests will verify universal properties across all inputs using **fast-check** (JavaScript/TypeScript property testing library):

- Each property-based test will run a minimum of 100 iterations
- Each test will be tagged with a comment referencing the design document property
- Tag format: `// Feature: invoice-management, Property {number}: {property_text}`
- Each correctness property will be implemented by a SINGLE property-based test

**Property test coverage**:
- Invoice total calculation (Property 1)
- Invoice number uniqueness and format (Properties 2, 3)
- Line item defaults and ordering (Properties 4, 5)
- PDF content and formatting (Properties 6, 7, 8)
- Status transitions and email addressing (Properties 9, 10)
- Filtering and organization isolation (Properties 11, 13, 14, 15)
- Data validation and integrity (Properties 16, 17, 18, 19, 20)

### Integration Testing

Integration tests will verify:
- Complete invoice creation flow (form → validation → database → query)
- PDF generation with real invoice data
- Email sending flow (mocked Edge Function)
- Multi-tenant data isolation with multiple organizations
- Concurrent invoice operations

### Manual Testing Checklist

- Create invoice with multiple line items
- Edit existing invoice and update line items
- Delete invoice and verify cascade deletion
- Generate and preview PDF
- Send invoice via email
- Filter invoices by status and client
- Verify RLS policies with multiple organizations
- Test validation errors for all fields
- Verify invoice number generation and uniqueness
