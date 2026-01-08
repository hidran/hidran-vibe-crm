# Implementation Roadmap

To prevent "AI drift"—where the model loses context or introduces regressions—development is broken down into atomic, commit-sized tasks. This roadmap follows a logical dependency graph: Foundation -> Core Data -> Business Logic -> Polish.

## Phase 1: The Foundation (System Plumbing)
Before building features, the underlying infrastructure for Auth and Layouts must be solid.

- [x] **Task 1.1**: Scaffold React+Vite+TS. Configure Tailwind and shadcn/ui.
- [x] **Task 1.2**: Implement Supabase Client and Auth Context.
- [x] **Task 1.3**: Create basic Layouts (Sidebar, Header) and Routing.
- [x] **Task 1.4**: Define Database Schema for organizations and profiles.

## Phase 2: CRM and Project Core

- [x] **Task 2.1**: Implement "Client" CRUD (Create, Read, Update, Delete).
- [x] **Task 2.2**: Implement "Project" CRUD. Connect Projects to Clients.
- [x] **Task 2.3**: Implement "Task" Backend (Schema + API).
- [x] **Task 2.4**: Build the Kanban Board UI. This is a complex UI component requiring drag-and-drop state management.

## Phase 3: The "Business" Layer (Invoicing)

- [ ] **Task 3.1**: Invoice Schema & Line Items logic.
- [ ] **Task 3.2**: Invoice Form UI (Dynamic fields).
- [ ] **Task 3.3**: PDF Generation implementation (`<InvoicePDF />` component).
- [ ] **Task 3.4**: Email integration (Edge Function).

## Phase 4: Refinement and Analytics

- [ ] **Task 4.1**: Dashboard Aggregation logic (SQL Views for performance).
- [ ] **Task 4.2**: Recharts integration for Revenue Graphs.
- [ ] **Task 4.3**: Attachment Upload UI and drag-and-drop zones.
