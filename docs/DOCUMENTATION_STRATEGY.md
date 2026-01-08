# Vibe CRM Documentation Strategy

This document outlines the comprehensive documentation approach for Vibe CRM, following Redis documentation principles of clarity, structure, and practical utility.

## Documentation Philosophy

**Principle**: Documentation should be clear, concise, and immediately useful to its audience.

We organize documentation into two primary audiences:
1. **Users** - How to use the application effectively
2. **Developers** - How to understand, modify, and extend the system

Documentation follows these core tenets:
- **Practical**: Examples are tested and can be copied/modified
- **Structured**: Clear hierarchy and navigation
- **Complete**: Covers both happy paths and edge cases
- **Maintained**: Updated with code changes
- **Searchable**: Well-indexed for easy discovery

## Documentation Structure

```
/docs
├── README.md                          # Main entry point
├── CONTRIBUTING.md                    # Contribution guidelines
├── DOCUMENTATION_STRATEGY.md          # This file
├── CLAUDE.md                          # AI assistant guidance
├── ROADMAP.md                         # Feature implementation roadmap
│
├── /user-guides                       # End-user documentation
│   ├── getting-started.md             # First steps
│   ├── clients.md                     # Client management
│   ├── projects.md                    # Project management
│   ├── tasks.md                       # Task workflow
│   ├── invoices.md                    # Invoice creation
│   ├── team-management.md             # User and role management
│   └── [feature].md                   # Additional features
│
├── /developer-guides                  # Developer onboarding
│   ├── getting-started.md             # Setup and first contribution
│   └── [workflow].md                  # Specific workflows
│
├── /architecture                      # System design
│   ├── overview.md                    # High-level architecture
│   ├── multi-tenancy.md               # Multi-tenant design
│   ├── auth-permissions.md            # Security and roles
│   ├── database.md                    # Database schema and design
│   └── [subsystem].md                 # Specific components
│
├── /api                               # Technical API reference
│   ├── hooks.md                       # Custom React hooks
│   ├── supabase-client.md             # Backend client setup
│   ├── services.md                    # Service layer patterns
│   └── [module].md                    # Specific modules
│
├── /components                        # UI components
│   ├── overview.md                    # Component guide intro
│   └── [component].md                 # Individual components
│
├── faq.md                             # Frequently asked questions
├── troubleshooting.md                 # Problem solutions
└── /archived                          # Historical documentation
    ├── DRAG_DROP_IMPLEMENTATION.md
    ├── dashboard-superadmin-global-view.md
    └── [historical docs]
```

## Document Types

### 1. User Guides (User Audience)

**Purpose**: Help users accomplish tasks in the application

**Structure**:
- Brief introduction
- Step-by-step instructions with screenshots
- Common variations and tips
- Related topics/next steps
- Troubleshooting section

**Example**: `docs/user-guides/clients.md`

**Characteristics**:
- No technical jargon
- Focus on UI elements
- Action-oriented ("Click X", "Enter Y")
- Visual aids (screenshots)
- Keyboard shortcuts where relevant

### 2. Developer Getting Started (Developer Audience)

**Purpose**: Get new developers productive in 30 minutes

**Structure**:
- Prerequisites checklist
- Step-by-step setup
- First contribution walkthrough
- Common tasks
- Debugging/troubleshooting

**Example**: `docs/developer-guides/getting-started.md`

**Characteristics**:
- Concrete commands to run
- Expected output shown
- Problem/solution for common issues
- Links to deeper docs
- Time estimates for each section

### 3. Architecture Documents (Developer Audience)

**Purpose**: Explain system design and how it works

**Structure**:
- Problem being solved
- High-level overview
- Detailed explanation
- Code examples
- Decision rationale
- Performance/security implications

**Example**: `docs/architecture/overview.md`

**Characteristics**:
- Diagrams showing data flow
- Multiple levels of detail
- Why decisions were made
- Trade-offs explained
- Links to related components

### 4. API Reference (Developer Audience)

**Purpose**: Complete reference for all available APIs

**Structure**:
- Function/hook signature
- Parameters with types
- Return values
- Detailed description
- Usage examples
- Common patterns

**Example**: `docs/api/hooks.md`

**Characteristics**:
- Syntax-highlighted code
- All parameters documented
- Return types clearly shown
- Working code examples
- Links to related APIs

### 5. Contributing Guide (Developer Audience)

**Purpose**: Enable community contributions with clear expectations

**Structure**:
- Types of contributions (bugs, features, code)
- Code standards and patterns
- Testing requirements
- PR process
- Review expectations

**Example**: `docs/CONTRIBUTING.md`

**Characteristics**:
- Clear code examples
- Type/naming conventions
- Testing expectations
- Git workflow
- Review timeline

## Content Guidelines

### Writing Style

**User Guides**:
- Second person ("You can", "Click the button")
- Simple, clear language
- Active voice
- Short sentences and paragraphs
- Friendly but professional tone

**Developer Guides**:
- First person or imperative ("You install", "Install Node.js")
- Technical but accessible
- Code examples come early and often
- Provide "why" not just "how"
- Professional tone

### Code Examples

**Requirements**:
- All examples must be tested
- Examples work with current code
- Show expected output
- Include error cases where relevant
- Syntax-highlighted

**Format**:
```typescript
// Good example - shows context
import { useClients } from "@/hooks/useClients";

export function ClientList() {
  const { data: clients } = useClients(organizationId);

  return (
    <ul>
      {clients.map(client => (
        <li key={client.id}>{client.name}</li>
      ))}
    </ul>
  );
}
```

### Links and References

**Internal Links**:
- Use relative paths: `[Hook Guide](../api/hooks.md)`
- Link to specific sections: `[useClients](../api/hooks.md#useClients)`
- Include context in link text

**External Links**:
- Official docs: React, TypeScript, TanStack Query, Supabase
- Third-party tools: shadcn/ui, Tailwind, Zod
- Provide brief context before linking

### Visual Aids

**When to Use**:
- Screenshots for UI workflows
- Diagrams for architecture
- Tables for comparisons
- Code blocks for examples

**Quality Standards**:
- Clear, readable screenshots
- Consistent styling/formatting
- Simple, understandable diagrams
- Alt text for all images

## Maintenance Process

### Keeping Documentation Current

**When Code Changes**:
1. Update related documentation
2. Update code examples
3. Test examples still work
4. Add/update tables of contents as needed

**Frequency**:
- Major changes: Update immediately
- Minor changes: Update in next batch
- Batch updates: Monthly review

**Who's Responsible**:
- PR author updates docs in same PR
- Reviewer checks docs accuracy
- Maintainers ensure completeness

### Documentation Review

**Before Merging a PR**:
- Docs are accurate and current
- Examples are tested
- Related docs are updated
- Links still work
- No broken references

### Versioning

- Document current version only
- Archive previous versions in `/archived` when major changes
- Reference dates ("as of January 2026")

## Search and Discovery

### Navigation Hierarchy

```
Home (README.md)
├── For Users
│   └── Guides: Getting Started, Features
├── For Developers
│   ├── Setup: Getting Started
│   ├── Architecture: Overview, Design
│   ├── API: Reference, Examples
│   └── Contributing: Process, Standards
└── Reference: FAQ, Troubleshooting
```

### Tagging/Categorization

Every doc should have:
- **Audience**: Users, Developers, Both
- **Level**: Beginner, Intermediate, Advanced
- **Type**: Guide, Reference, Tutorial, Concept

### Search Optimization

- Document titles include searchable keywords
- Section headings use common terminology
- Cross-references help discoverability
- Related topics linked at bottom

## Tools and Platform

### Writing Tools

- **Format**: Markdown (.md)
- **Editor**: Any text editor (VS Code recommended)
- **Preview**: GitHub's markdown preview, or local tools

### Platform

- **Host**: GitHub repository `/docs` folder
- **Display**: GitHub's built-in markdown rendering
- **Versioning**: Git history tracks changes

### Future Enhancements

- Static site generator (e.g., Docusaurus, VitePress)
- Search functionality
- Dark mode support
- PDF generation

## Quality Metrics

### Documentation Completeness

**Checklist for each area**:
- [ ] Getting started guide exists
- [ ] API reference complete
- [ ] Architecture documented
- [ ] Examples provided
- [ ] Troubleshooting section exists
- [ ] Links are accurate

### User Satisfaction

- Track which docs users view most
- Monitor feedback in issues
- Survey users on doc helpfulness
- Update based on feedback

## Updating This Strategy

This strategy document is living and evolves as we learn what works best.

To propose changes:
1. Open an issue with suggestion
2. Discuss with maintainers
3. Update this document
4. Apply new approach to next docs

## Related Resources

- [Redis Documentation](https://redis.io/docs) - Style model
- [React Documentation](https://react.dev) - Good API reference example
- [Contributing Guide](./CONTRIBUTING.md) - How to contribute
- [Main README](./README.md) - Documentation entry point

---

Last updated: January 2026

## Document Checklist

When creating new documentation, ensure:

- [ ] **Structure**: Clear hierarchy with TOC
- [ ] **Examples**: All tested and working
- [ ] **Links**: All internal links valid
- [ ] **Audience**: Clear who this is for
- [ ] **Level**: Appropriate difficulty
- [ ] **Complete**: Covers main use cases
- [ ] **Updated**: Reflects current code
- [ ] **Searchable**: Good keywords in headings
- [ ] **Related**: Links to related docs
- [ ] **Proof**: Read by someone else first
