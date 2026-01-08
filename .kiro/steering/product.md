# Product Overview

This is a multi-tenant CRM and project management application built for freelancers and small agencies. The platform enables organizations to manage clients, projects, tasks, and invoicing in a unified workspace.

## Core Features

- **Client Management**: Track client information, contact details, and status (active/inactive/prospect)
- **Project Management**: Organize projects linked to clients with status tracking
- **Task Management**: Kanban-style task board with drag-and-drop functionality
- **Invoicing**: Create and manage invoices with line items (in development)
- **Dashboard Analytics**: Revenue tracking and organizational statistics with charts
- **Multi-tenant Architecture**: Organization-based data isolation with Row Level Security (RLS)

## Authentication & Authorization

- Supabase Auth for user authentication
- Organization-based access control
- Protected routes requiring authentication
- Profile and organization management

## Current Development Phase

The project follows a phased implementation roadmap (see TASKS.md):
- Phase 1-2: Foundation, CRM, and Project Core (Complete)
- Phase 3: Invoicing layer (In Progress)
- Phase 4: Analytics refinement (Planned)
