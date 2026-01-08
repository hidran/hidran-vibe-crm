# Vibe CRM Documentation

Welcome to the Vibe CRM documentation. This guide covers everything you need to know about using, developing, and contributing to Vibe CRM.

## Quick Navigation

### For Users
Get started and learn how to use Vibe CRM features:
- [User Getting Started](./user-guides/getting-started.md) - First steps in Vibe CRM
- [Managing Clients](./user-guides/clients.md) - Add and manage client relationships
- [Managing Projects](./user-guides/projects.md) - Create and track projects
- [Creating Invoices](./user-guides/invoices.md) - Generate and track invoices
- [Task Management](./user-guides/tasks.md) - Organize work with tasks
- [Team Management](./user-guides/team-management.md) - Manage users and permissions

### For Developers
Understand the codebase and develop features:
- [Developer Getting Started](./developer-guides/getting-started.md) - Setup and first contribution
- [Architecture Overview](./architecture/overview.md) - System design
- [Multi-Tenant Architecture](./architecture/multi-tenancy.md) - How multi-tenancy works
- [Authentication & Permissions](./architecture/auth-permissions.md) - Security model
- [Database Schema](./architecture/database.md) - Data structure
- [API Reference - Hooks](./api/hooks.md) - Custom React hooks
- [API Reference - Supabase](./api/supabase-client.md) - Backend client setup
- [Components Guide](./components/overview.md) - UI component usage
- [Contributing Guide](../CONTRIBUTING.md) - How to contribute

## Core Reference Documents

### [CLAUDE.md](./CLAUDE.md)
Guidance for Claude Code and AI assistants:
- Development commands
- Project stack overview
- Architecture patterns
- Testing instructions

### [ROADMAP.md](./ROADMAP.md)
Feature implementation roadmap:
- Phase 1: Foundation (Auth, Layouts) ✓
- Phase 2: CRM Core (Clients, Projects, Tasks) ✓
- Phase 3: Business Layer (Invoicing)
- Phase 4: Analytics and Refinement

## Technology Stack Overview

**Frontend:**
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS + shadcn/ui (components)
- React Router v6

**State Management:**
- TanStack React Query (server state)
- React Context (auth, theme)
- React Hook Form + Zod (forms)

**Backend:**
- Supabase (PostgreSQL + Authentication)
- Row-Level Security (RLS) for multi-tenancy
- Auto-generated TypeScript types

## Architecture at a Glance

```
┌─────────────────────────────────────────┐
│        React Frontend (TypeScript)      │
│  Pages, Components, Custom Hooks        │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│   State Management (TanStack Query)     │
│   Data fetching, caching, sync          │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│   Services & Custom Hooks               │
│   useClients, useInvoices, etc.         │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│   Supabase (Auth + PostgreSQL)          │
│   Real-time sync, RLS policies          │
└─────────────────────────────────────────┘
```

## Organization & User Roles

- **Superadmin**: Full access to all organizations
- **Organization Owner**: Creates organizations, manages all members
- **Admin**: Manages team members and settings
- **Member**: Accesses assigned resources

See [Authentication & Permissions](./architecture/auth-permissions.md) for complete details.

## Common Tasks

### Quick Start (5 minutes)
```bash
git clone <repo-url>
cd vibe-crm
npm install
npm run dev
```

### Running Tests
```bash
npm test              # Run once
npm run test:watch    # Watch mode
npm run test:ui       # UI dashboard
```

### Building for Production
```bash
npm run build
npm run preview
```

## Directory Structure

```
vibe-crm/
├── src/
│   ├── pages/              # Route-level pages
│   ├── components/         # Reusable components
│   ├── hooks/              # Custom React hooks
│   ├── services/           # Business logic
│   ├── contexts/           # React Context providers
│   ├── integrations/       # External service clients
│   └── lib/                # Utilities
├── tests/                  # Test files
├── docs/                   # This documentation
├── supabase/               # Database migrations
└── public/                 # Static assets
```

## Getting Help

- [FAQ](./faq.md) - Common questions
- [Troubleshooting](./troubleshooting.md) - Solutions to common issues
- [CLAUDE.md](./CLAUDE.md) - AI development guidance
- Check existing [GitHub Issues](https://github.com/yourusername/vibe-crm/issues)

## Contributing

We welcome contributions! Please read:
1. [Contributing Guide](../CONTRIBUTING.md)
2. [Developer Setup](./developer-guides/getting-started.md)
3. [Architecture Guide](./architecture/overview.md)

## Documentation Updates

When making changes:
1. Update relevant documentation
2. Keep examples current
3. Test all code samples
4. Use consistent formatting (see [CONTRIBUTING.md](../CONTRIBUTING.md))

---

Last updated: January 2026
For questions: See [CONTRIBUTING.md](../CONTRIBUTING.md) for contact information
