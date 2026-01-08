# Requirements Document

## Introduction

The Invoice Management System enables organizations to create, manage, and send professional invoices to clients. The system supports dynamic line items, automatic calculations, PDF generation, and email delivery. This feature is a critical component of the VibeManager B2B SaaS platform, allowing businesses to bill clients for projects and services while maintaining strict multi-tenant data isolation.

## Glossary

- **Invoice System**: The complete invoicing subsystem including creation, management, PDF generation, and email delivery
- **Line Item**: A single billable entry on an invoice containing description, quantity, unit price, and calculated total
- **Invoice Document**: The PDF representation of an invoice generated using @react-pdf/renderer
- **Organization**: A tenant in the multi-tenant system; all invoices belong to exactly one organization
- **Client**: A customer entity that receives invoices
- **Edge Function**: A Supabase serverless function used for server-side operations like email sending

## Requirements

### Requirement 1: Invoice Creation and Management

**User Story:** As a business owner, I want to create and manage invoices for my clients, so that I can bill them for services and track payment status.

#### Acceptance Criteria

1. WHEN a user creates an invoice, THE Invoice System SHALL generate a unique invoice number within the organization scope
2. WHEN a user creates an invoice, THE Invoice System SHALL require organization_id, client_id, and issue_date as mandatory fields
3. WHEN a user saves an invoice, THE Invoice System SHALL calculate the total_amount by summing all line item totals
4. WHEN a user updates an invoice status, THE Invoice System SHALL allow transitions between pending, sent, and paid states
5. WHERE an invoice has a due_date specified, THE Invoice System SHALL store and display the due date on the invoice document

### Requirement 2: Line Item Management

**User Story:** As a business owner, I want to add multiple line items to an invoice with descriptions, quantities, and prices, so that I can itemize services or products.

#### Acceptance Criteria

1. WHEN a user adds a line item, THE Invoice System SHALL require description and unit_price as mandatory fields
2. WHEN a user adds a line item, THE Invoice System SHALL default quantity to 1 if not specified
3. WHEN a line item is saved, THE Invoice System SHALL calculate the total as quantity multiplied by unit_price
4. WHEN a user reorders line items, THE Invoice System SHALL update the position field to maintain display order
5. WHEN a user deletes a line item, THE Invoice System SHALL recalculate the invoice total_amount

### Requirement 3: Invoice PDF Generation

**User Story:** As a business owner, I want to generate professional PDF invoices, so that I can send them to clients or download them for records.

#### Acceptance Criteria

1. WHEN a user requests a PDF, THE Invoice System SHALL render the invoice using @react-pdf/renderer components
2. WHEN rendering a PDF, THE Invoice System SHALL include organization details, client details, invoice number, dates, and all line items
3. WHEN rendering a PDF, THE Invoice System SHALL display line items in order by position field
4. WHEN rendering a PDF, THE Invoice System SHALL format currency values with two decimal places
5. WHEN rendering a PDF, THE Invoice System SHALL calculate and display subtotal, and total amounts

### Requirement 4: Invoice Email Delivery

**User Story:** As a business owner, I want to email invoices to clients, so that they receive them promptly and professionally.

#### Acceptance Criteria

1. WHEN a user sends an invoice, THE Invoice System SHALL invoke a Supabase Edge Function for email delivery
2. WHEN sending an invoice, THE Invoice System SHALL attach the PDF document to the email
3. WHEN sending an invoice, THE Invoice System SHALL update the invoice status to "sent"
4. IF email delivery fails, THEN THE Invoice System SHALL display an error message to the user
5. WHEN an invoice is sent, THE Invoice System SHALL send the email to the client's email address from the clients table

### Requirement 5: Invoice List and Filtering

**User Story:** As a business owner, I want to view and filter my invoices, so that I can track billing and payment status.

#### Acceptance Criteria

1. WHEN a user views the invoices page, THE Invoice System SHALL display all invoices for the current organization
2. WHEN displaying invoices, THE Invoice System SHALL show invoice number, client name, total amount, status, and dates
3. WHEN a user filters by status, THE Invoice System SHALL display only invoices matching the selected status
4. WHEN a user filters by client, THE Invoice System SHALL display only invoices for the selected client
5. WHEN displaying invoices, THE Invoice System SHALL order them by created_at descending by default

### Requirement 6: Multi-Tenant Data Isolation

**User Story:** As a system administrator, I want strict data isolation between organizations, so that invoice data remains secure and private.

#### Acceptance Criteria

1. WHEN any invoice query executes, THE Invoice System SHALL filter results by the user's organization_id through RLS policies
2. WHEN a user creates an invoice, THE Invoice System SHALL automatically set the organization_id from the user's current organization
3. WHEN a user attempts to access an invoice from another organization, THE Invoice System SHALL deny access through RLS policies
4. WHEN line items are queried, THE Invoice System SHALL enforce access control through the parent invoice's organization_id
5. WHEN invoice operations execute, THE Invoice System SHALL validate that the client_id belongs to the same organization

### Requirement 7: Invoice Form Validation

**User Story:** As a business owner, I want the system to validate invoice data, so that I don't create invalid or incomplete invoices.

#### Acceptance Criteria

1. WHEN a user submits an invoice without a client, THE Invoice System SHALL prevent submission and display a validation error
2. WHEN a user submits an invoice without line items, THE Invoice System SHALL prevent submission and display a validation error
3. WHEN a user enters a negative unit_price, THE Invoice System SHALL prevent submission and display a validation error
4. WHEN a user enters a negative quantity, THE Invoice System SHALL prevent submission and display a validation error
5. WHEN a user enters a due_date before the issue_date, THE Invoice System SHALL prevent submission and display a validation error

### Requirement 8: Invoice Number Generation

**User Story:** As a business owner, I want automatic invoice numbering, so that each invoice has a unique identifier.

#### Acceptance Criteria

1. WHEN a user creates a new invoice, THE Invoice System SHALL generate an invoice number in the format "INV-YYYY-NNNN"
2. WHEN generating an invoice number, THE Invoice System SHALL use the current year for YYYY
3. WHEN generating an invoice number, THE Invoice System SHALL increment NNNN sequentially within the organization
4. WHEN an invoice number conflict occurs, THE Invoice System SHALL retry with the next available number
5. THE Invoice System SHALL enforce uniqueness of invoice numbers within an organization through database constraints
