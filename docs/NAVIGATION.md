# Documentation Navigation Guide

Quick reference for finding what you need in Vibe CRM documentation.

## By Audience

### I'm an End User

**First time using Vibe CRM?**
1. Start: [Getting Started](./user-guides/getting-started.md) - 10 minute overview
2. Then: Choose your feature guide below

**Specific Feature Questions:**
- How do I manage clients? → [Managing Clients](./user-guides/clients.md)
- How do I create projects? → [Managing Projects](./user-guides/projects.md)
- How do I organize work? → [Task Management](./user-guides/tasks.md)
- How do I invoice clients? → [Creating Invoices](./user-guides/invoices.md)
- How do I manage my team? → [Team Management](./user-guides/team-management.md)

**Still stuck?**
- Check [FAQ](./faq.md) for common questions
- See [Troubleshooting](./troubleshooting.md) for problems

### I'm a New Developer

**Getting set up?**
1. Start: [Developer Getting Started](./developer-guides/getting-started.md) - 30 minutes to productive

**Understanding the system?**
1. Read: [Architecture Overview](./architecture/overview.md) - High level structure
2. Then: Pick relevant topics:
   - Understanding data isolation? → [Multi-Tenant Architecture](./architecture/multi-tenancy.md)
   - Understanding security? → [Authentication & Permissions](./architecture/auth-permissions.md)
   - Understanding database? → [Database Schema](./architecture/database.md)

**Building a feature?**
1. Learn: [Architecture Overview](./architecture/overview.md)
2. Reference: [Custom Hooks API](./api/hooks.md) - How to fetch data
3. Reference: [Services](./api/services.md) - Backend integration
4. Check: [Contributing Guide](./CONTRIBUTING.md) - Code standards

**Debugging an issue?**
1. Check: [Troubleshooting](./troubleshooting.md) - Common issues
2. Reference: [Custom Hooks API](./api/hooks.md) - How hooks work
3. Check: [Multi-Tenant Architecture](./architecture/multi-tenancy.md) - Data isolation issues

### I'm Contributing Code

**First contribution?**
1. Read: [Contributing Guide](./CONTRIBUTING.md) - Process and standards
2. Read: [Architecture Overview](./architecture/overview.md) - System design
3. Review: [Custom Hooks API](./api/hooks.md) - How to write data fetching code

**Adding a new feature?**
1. Check: [Architecture Overview](./architecture/overview.md) - Where to put code
2. Reference: [Custom Hooks API](./api/hooks.md) - Data fetching patterns
3. Follow: [Contributing Guide](./CONTRIBUTING.md) - Code standards and PR process
4. Update: Documentation following patterns

**Fixing a bug?**
1. Check: [Troubleshooting](./troubleshooting.md) - Is it documented?
2. Review: Related code sections in [Architecture Overview](./architecture/overview.md)
3. Write test and fix
4. Follow: [Contributing Guide](./CONTRIBUTING.md) - Testing and PR process

## By Task

### "I need to..."

**...get started with Vibe CRM**
→ [User Getting Started](./user-guides/getting-started.md) (if you're using it)
→ [Developer Getting Started](./developer-guides/getting-started.md) (if you're developing)

**...manage my data**
→ [Multi-Tenant Architecture](./architecture/multi-tenancy.md)

**...understand how authentication works**
→ [Authentication & Permissions](./architecture/auth-permissions.md)

**...fetch data in a component**
→ [Custom Hooks API](./api/hooks.md)

**...write a new custom hook**
→ [Custom Hooks API](./api/hooks.md) (reference implementations)
→ [Contributing Guide](./CONTRIBUTING.md) (code standards)

**...create a new page/feature**
→ [Architecture Overview](./architecture/overview.md) (where code goes)
→ [Custom Hooks API](./api/hooks.md) (how to fetch data)
→ [Contributing Guide](./CONTRIBUTING.md) (process)

**...set up my development environment**
→ [Developer Getting Started](./developer-guides/getting-started.md)

**...contribute code**
→ [Contributing Guide](./CONTRIBUTING.md)

**...debug an issue**
→ [Troubleshooting](./troubleshooting.md)

**...find an answer to a common question**
→ [FAQ](./faq.md)

## By Concept

### Core Concepts

**Multi-Tenancy** (Organizations, data isolation)
- [Overview](./architecture/overview.md#multi-tenancy-design)
- [Deep Dive](./architecture/multi-tenancy.md)
- [How Queries Work](./api/hooks.md#dependent-queries)

**Authentication & Authorization** (Users, roles, permissions)
- [Overview](./architecture/overview.md#authentication-flow)
- [Deep Dive](./architecture/auth-permissions.md)
- [Role Hierarchy](./architecture/auth-permissions.md#role-hierarchy)

**State Management** (Data fetching, caching)
- [Overview](./architecture/overview.md#state-management-strategy)
- [TanStack Query](./api/hooks.md)
- [How Hooks Work](./api/hooks.md)

**Database Schema** (Tables, relationships)
- [Overview](./architecture/database.md)

### Features

**Clients**
- User Guide: [Managing Clients](./user-guides/clients.md)
- Developer: [useClients Hook](./api/hooks.md#client-hooks)

**Projects**
- User Guide: [Managing Projects](./user-guides/projects.md)
- Developer: [useProjects Hook](./api/hooks.md#project-hooks)

**Tasks**
- User Guide: [Task Management](./user-guides/tasks.md)
- Developer: [useTasks Hook](./api/hooks.md#task-hooks)

**Invoices**
- User Guide: [Creating Invoices](./user-guides/invoices.md)
- Developer: [useInvoices Hook](./api/hooks.md#invoice-hooks)

**Users & Teams**
- User Guide: [Team Management](./user-guides/team-management.md)
- Developer: [useUsers Hook](./api/hooks.md#user-hooks)

## Documentation Map

```
Getting Started
├─ Users → User Getting Started
└─ Developers → Developer Getting Started

Understanding the System
├─ High Level → Architecture Overview
├─ Data Isolation → Multi-Tenancy
├─ Security → Auth & Permissions
└─ Database → Database Schema

Building Features
├─ Where to Put Code → Architecture Overview
├─ How to Fetch Data → Hooks API
├─ How to Call Backend → Supabase Client
└─ Standards → Contributing Guide

Solving Problems
├─ Common Issues → Troubleshooting
├─ Common Questions → FAQ
└─ Contribution Issues → Contributing Guide
```

## Documentation Index

| Document | Purpose | Audience | Time |
|----------|---------|----------|------|
| [README.md](./README.md) | Main entry point | Everyone | 5 min |
| [DOCUMENTATION_STRATEGY.md](./DOCUMENTATION_STRATEGY.md) | How docs are organized | Maintainers | 10 min |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Contribution process | Developers | 15 min |
| [Developer Getting Started](./developer-guides/getting-started.md) | Setup & first contribution | New devs | 30 min |
| [User Getting Started](./user-guides/getting-started.md) | First steps | New users | 10 min |
| [Architecture Overview](./architecture/overview.md) | High-level design | Developers | 20 min |
| [Multi-Tenancy](./architecture/multi-tenancy.md) | Data isolation | Developers | 20 min |
| [Auth & Permissions](./architecture/auth-permissions.md) | Security model | Developers | 15 min |
| [Database Schema](./architecture/database.md) | Data structure | Developers | 15 min |
| [Hooks API](./api/hooks.md) | Data fetching | Developers | Reference |
| [Supabase Client](./api/supabase-client.md) | Backend integration | Developers | Reference |
| [Services](./api/services.md) | Service patterns | Developers | Reference |
| [FAQ](./faq.md) | Common questions | Everyone | Reference |
| [Troubleshooting](./troubleshooting.md) | Problem solutions | Everyone | Reference |

## Search Tips

**Finding something specific?**

1. **In GitHub**: Use the search box, select "In this repository" and search by filename or content
2. **In Editor**: Use Ctrl+P to find files by name, or Ctrl+F to search within a file
3. **In Browser**: Try Ctrl+F to search the current page

**Common search terms:**
- "How do I..." → Check [FAQ](./faq.md) or feature guide
- "Error: ..." → Check [Troubleshooting](./troubleshooting.md)
- "useClients" → Check [Hooks API](./api/hooks.md#client-hooks)
- "organization_id" → Check [Multi-Tenancy](./architecture/multi-tenancy.md)
- "Row-Level Security" → Check [Multi-Tenancy](./architecture/multi-tenancy.md)

## Quick Links

**Most Used Documents:**
- [Developer Getting Started](./developer-guides/getting-started.md) - Get up and running
- [Architecture Overview](./architecture/overview.md) - Understand the system
- [Hooks API Reference](./api/hooks.md) - How to fetch data
- [Contributing Guide](./CONTRIBUTING.md) - Code standards

**For Specific Issues:**
- [Multi-Tenant Architecture](./architecture/multi-tenancy.md) - "Why can't I see this data?"
- [Authentication & Permissions](./architecture/auth-permissions.md) - "Why am I denied access?"
- [Troubleshooting](./troubleshooting.md) - "Something's broken"
- [FAQ](./faq.md) - "How do I do X?"

**For Learning:**
- [Architecture Overview](./architecture/overview.md) - Start here
- [Multi-Tenant Architecture](./architecture/multi-tenancy.md) - Understand isolation
- [Database Schema](./architecture/database.md) - Understand data structure
- [Hooks API Reference](./api/hooks.md) - Learn data fetching patterns

## Feedback

If you can't find what you're looking for:

1. Check if the question is in [FAQ](./faq.md)
2. Check [Troubleshooting](./troubleshooting.md)
3. Open a GitHub issue: "Documentation: [your question]"
4. Ask in a discussion on GitHub

Your feedback helps us improve documentation!

---

**Last updated**: January 2026

**Need help?** See [Contributing Guide](./CONTRIBUTING.md) for contact information.
