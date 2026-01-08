# Contributing to Vibe CRM

Thank you for your interest in contributing to Vibe CRM! This guide will help you understand how to participate.

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please be respectful and constructive in all interactions.

## Getting Started

See [Developer Getting Started](./developer-guides/getting-started.md) for initial setup instructions.

## Types of Contributions

### Bug Reports
Found a bug? Report it by:
1. Creating a GitHub Issue
2. Title: Clear description of the bug
3. Description: Steps to reproduce, expected behavior, actual behavior
4. Screenshot/video if applicable

**Example**:
```
Title: Client list doesn't update after creating new client

Description:
1. Navigate to Clients page
2. Click "New Client"
3. Fill in form and click "Create"
4. Client list doesn't show the new client
5. After page refresh, the client appears

Expected: Client should appear immediately
Actual: Client doesn't appear until page refresh
```

### Feature Requests
Want a new feature? Open an issue with:
1. Clear title describing the feature
2. Use case and benefit
3. Suggested implementation (if you have ideas)

**Example**:
```
Title: Add client tags for better organization

Description:
Currently, clients can only be viewed in one list. It would be helpful to tag clients
(e.g., "VIP", "Inactive", "Preferred", etc.) to quickly filter and identify similar clients.

Use case: Sales team needs to quickly identify VIP clients for special attention.

Implementation idea: Add a "tags" field to client form, allow multi-select.
```

### Code Changes

We welcome code contributions! Large changes should have a discussion first.

1. Check [open issues](https://github.com/yourusername/vibe-crm/issues) for related work
2. Comment on an issue to volunteer to work on it
3. Fork the repository
4. Create a feature branch
5. Make your changes
6. Submit a pull request

## Development Workflow

### 1. Set Up Your Local Environment

```bash
git clone https://github.com/yourusername/vibe-crm.git
cd vibe-crm
npm install
npm run dev
```

See [Developer Getting Started](./developer-guides/getting-started.md) for detailed setup.

### 2. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
# or
git checkout -b docs/documentation-update
```

Use prefixes:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring without feature changes
- `test/` - Adding or updating tests

### 3. Make Your Changes

Follow these patterns:

**For New Features:**
1. Create hooks in `/src/hooks/`
2. Create components in `/src/components/[feature]/`
3. Create services in `/src/services/`
4. Add tests in `/tests/`
5. Update documentation

**For Bug Fixes:**
1. Add a test that reproduces the bug
2. Fix the bug
3. Verify test passes
4. Update documentation if behavior changed

**For Documentation:**
1. Update relevant markdown files
2. Keep examples current and tested
3. Maintain consistent formatting

### 4. Follow Code Standards

#### TypeScript
- Use strict types (no `any` unless unavoidable)
- Export interfaces and types
- Document complex types with comments

```typescript
// Good
interface Client {
  id: string;
  name: string;
  email: string;
  organization_id: string;
}

// Avoid
const client: any = { ... };
```

#### React Components
- Use functional components with hooks
- Keep components focused and single-purpose
- Props should be well-typed

```typescript
interface ClientCardProps {
  client: Client;
  onEdit: (client: Client) => void;
  onDelete: (id: string) => void;
}

export function ClientCard({ client, onEdit, onDelete }: ClientCardProps) {
  return (
    <Card>
      <h3>{client.name}</h3>
      <button onClick={() => onEdit(client)}>Edit</button>
      <button onClick={() => onDelete(client.id)}>Delete</button>
    </Card>
  );
}
```

#### Custom Hooks
- Follow the pattern: `use[Resource]s`, `useCreate[Resource]`, etc.
- Use descriptive names
- Document parameters and return types

```typescript
/**
 * Fetch all clients for an organization
 * @param organizationId - Organization ID to filter by (optional)
 * @returns Query result with clients array
 */
export const useClients = (organizationId?: string) => {
  return useQuery({
    queryKey: ["clients", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("organization_id", organizationId);
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });
};
```

#### Naming Conventions
- Components: PascalCase (`ClientCard`, `InvoiceForm`)
- Files: Same as exports (`ClientCard.tsx`, `useClients.ts`)
- Functions/variables: camelCase (`fetchClients`, `organizationId`)
- Constants: UPPER_SNAKE_CASE (`MAX_CLIENTS = 100`)
- Types/Interfaces: PascalCase (`Client`, `InvoiceItem`)

#### Comments and Documentation
- Document "why", not "what" (code shows what)
- Add JSDoc comments to exported functions/types
- Update README.md if behavior changes

```typescript
// Good - explains why
const retryCount = 3; // Retry failed requests up to 3 times

// Less helpful - just repeats code
const retryCount = 3; // Set retry count to 3
```

### 5. Test Your Changes

#### Write Tests
- Test new functionality
- Add regression tests for bugs fixed
- Aim for high coverage on critical paths

```typescript
// Example hook test
describe("useClients", () => {
  it("should fetch clients for organization", async () => {
    const { result } = renderHook(() => useClients("org-123"));

    await waitFor(() => {
      expect(result.current.data).toEqual([...]);
    });
  });

  it("should not fetch if organizationId is undefined", () => {
    const { result } = renderHook(() => useClients(undefined));
    expect(result.current.isLoading).toBe(false);
  });
});
```

#### Run Tests Locally
```bash
npm test
npm run test:watch
npm run test:ui
```

All tests must pass before submitting a PR.

#### Lint Code
```bash
npm run lint
npm run lint -- --fix  # Auto-fix fixable issues
```

### 6. Commit Your Work

Write clear, descriptive commit messages:

```bash
git add .
git commit -m "feat: Add client filtering by status

- Add status filter dropdown to client list
- Update useClients hook to accept status parameter
- Add tests for filtering functionality
- Update documentation"
```

**Commit Message Format:**
```
<type>: <subject>

<body>

<footer>
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style (formatting, missing semicolons, etc)
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Build, deps, tooling

**Subject:**
- Imperative mood ("add" not "adds" or "added")
- Don't capitalize
- No period at end
- Under 50 characters

**Body:**
- Explain what and why, not how
- Wrap at 72 characters
- Separate from subject with blank line

### 7. Push and Create a Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub with:

**Title**: Clear description of changes
```
Add client filtering by status
```

**Description**:
```markdown
## Summary
Allow users to filter clients by status in the client list page.

## Changes
- Add status filter UI component
- Update useClients hook to accept status filter
- Add tests for filtering functionality

## Testing
- [x] Tested filtering with different status values
- [x] Tested with empty client list
- [x] Verified all tests pass

## Related Issues
Fixes #123

## Screenshots
[If UI changes, add before/after screenshots]
```

## Pull Request Guidelines

### What We Look For

1. **Code Quality**
   - Follows style and patterns
   - Proper error handling
   - Appropriate use of types

2. **Tests**
   - New features have tests
   - Bug fixes include regression tests
   - All tests pass

3. **Documentation**
   - Code comments for complex logic
   - Updated user guides if behavior changes
   - Updated architecture docs if structure changes

4. **Performance**
   - No significant performance regressions
   - Optimized queries (TanStack Query caching)
   - Appropriate use of React.memo if needed

5. **Accessibility**
   - Keyboard navigation works
   - Screen reader friendly
   - Color contrast sufficient

### Review Process

1. Automated checks must pass (tests, linting)
2. At least one maintainer review
3. Address feedback or request clarification
4. Maintainer merges when approved

### Response Time

- Maintainers will respond within 48 hours
- Expect iterative feedback
- Questions are not criticism!

## Documentation Standards

### Code Comments
```typescript
// Good - explains non-obvious logic
// RLS policies ensure data isolation, but we also filter at app level
// as a defense-in-depth measure
if (!isSuperadmin && organizationId) {
  query = query.eq("organization_id", organizationId);
}

// Less helpful - just restates code
// Filter by organization ID
const filtered = clients.filter(c => c.org_id === orgId);
```

### User Guide Examples
- All code examples should be tested
- Show both good and common-mistake examples
- Include "why" not just "how"
- Link to related documentation

### Architecture Documentation
- Include diagrams for complex flows
- Show before/after for design changes
- Explain rationale for decisions
- Link to related docs

## Performance Considerations

When submitting changes, consider:

1. **Database Queries**
   - Use `.select("needed_columns")` not `.select("*")`
   - Add appropriate indexes for filters
   - Use pagination for large datasets

2. **React Rendering**
   - Avoid unnecessary re-renders
   - Use `React.memo` for expensive components
   - Proper dependency arrays in useEffect

3. **Data Fetching**
   - Let TanStack Query handle caching
   - Don't over-fetch data
   - Use pagination

4. **Bundle Size**
   - Avoid large dependencies if possible
   - Use code splitting for routes
   - Tree-shake unused imports

## Reporting Issues with Changes

If you notice a problem:
1. Open an issue with clear steps to reproduce
2. Create a minimal example if possible
3. Include browser and OS information
4. Provide error messages verbatim

## Questions?

- Check [FAQ](./faq.md)
- Review [Architecture Guide](./architecture/overview.md)
- Ask in GitHub issues (maintainers monitor actively)

## Special Thanks

We appreciate all contributions, no matter how small. Your help makes Vibe CRM better for everyone!

---

## Reviewers and Maintainers

Maintainers have write access and manage:
- Code review process
- Merging approved PRs
- Release management
- Issue triage

To become a maintainer, participate consistently and maintain high-quality contributions.

---

Last updated: January 2026
