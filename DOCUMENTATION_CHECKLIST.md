# Documentation Checklist for Developers

Use this checklist when writing new code or reviewing documented code in the Vibe CRM project.

## Quick Reference: Documentation Required

### Module/File Documentation

When creating a new file, always add a header comment:

```typescript
/*
 * ModuleName - One-line description
 *
 * Longer explanation of the module's purpose.
 * Include key features, invariants, or security considerations.
 *
 * INVARIANTS (if applicable):
 * - State constraint 1
 * - State constraint 2
 */
```

### Function/Hook Documentation

For all exported functions/hooks:

```typescript
/*
 * functionName - One-line purpose summary
 *
 * Longer explanation including:
 * - What the function does
 * - Important parameters
 * - Return value
 * - Key side effects
 *
 * BEHAVIOR (if conditional logic):
 * - Condition 1: what happens
 * - Condition 2: what happens
 */
export const functionName = () => {
  // implementation
};
```

### Component State Documentation

For components with complex state:

```typescript
/*
 * STATE:
 * - stateVar1: what it tracks
 * - stateVar2: what it tracks
 */
const MyComponent = () => {
  const [stateVar1, setStateVar1] = useState(...);
  // ...
};
```

## Documentation Checklist

### For New Files/Modules

- [ ] File header comment added
- [ ] Purpose clearly stated
- [ ] Key features listed (if applicable)
- [ ] Invariants documented (if any)
- [ ] Security considerations noted (if multi-tenant/auth-related)
- [ ] Dependencies on other modules mentioned (if non-obvious)

### For New Functions/Hooks

- [ ] Function comment added before export
- [ ] Purpose statement is clear
- [ ] Parameters explained (if non-obvious)
- [ ] Return value documented
- [ ] Side effects documented (especially cache invalidation)
- [ ] BEHAVIOR section included (if conditional)
- [ ] USAGE examples included (if complex)

### For React Query Hooks

- [ ] File header explains data fetching pattern
- [ ] useQuery documentation includes:
  - [ ] What data is fetched
  - [ ] Access control behavior (superadmin vs. user)
  - [ ] Query key design rationale
  - [ ] Disabled condition explanation
- [ ] useMutation documentation includes:
  - [ ] What operation is performed
  - [ ] Cache invalidation strategy
  - [ ] Error handling approach
- [ ] Comments on cache invalidation triggers
- [ ] Inline comments on access control filters

### For React Components

- [ ] File header lists all features
- [ ] STATE section documents all useState variables
- [ ] Complex event handlers have comments
- [ ] Non-obvious JSX logic is explained
- [ ] ALGORITHM sections for complex calculations
- [ ] Edge cases are documented

### For Complex Logic

- [ ] ALGORITHM/STRATEGY section included
- [ ] Step-by-step explanation provided
- [ ] Edge cases documented
- [ ] Why this approach is used explained
- [ ] Performance implications noted (if relevant)

### For Security-Sensitive Code

- [ ] SECURITY section added
- [ ] Data isolation explained
- [ ] Access control documented
- [ ] Multi-tenant considerations noted
- [ ] Why specific approach is needed explained

### For Mutation Hooks (Create/Update/Delete)

- [ ] What operation creates/updates/deletes
- [ ] Cache invalidation strategy documented
- [ ] What happens on success
- [ ] What happens on error
- [ ] Whether operation affects other queries explained

## Pattern Checklist

### Access Control Pattern

If hook has superadmin vs. user access:

- [ ] File header mentions access control
- [ ] BEHAVIOR section lists different scenarios
- [ ] Query key includes access control variable
- [ ] Organization filtering is explained
- [ ] Query enabled condition is documented

### Cache Invalidation Pattern

For all mutations:

- [ ] What queries are invalidated documented
- [ ] Why those specific queries documented
- [ ] How invalidation affects other views explained
- [ ] Comment explains reasoning in onSuccess handler

### React Query Optimization Pattern

If using optimization techniques:

- [ ] keepPreviousData is commented if used
- [ ] refetchType rationale is explained
- [ ] Query stale time is documented (if custom)
- [ ] Retry strategy is noted (if custom)

### Component State Pattern

For complex state management:

- [ ] STATE section lists all useState variables
- [ ] What each variable tracks is explained
- [ ] State update patterns are documented
- [ ] State flow between functions is clear

## Code Review Checklist

When reviewing documented code, check for:

### Completeness

- [ ] File header present and clear
- [ ] All exported functions have comments
- [ ] Complex logic is explained
- [ ] Non-obvious code has comments

### Accuracy

- [ ] Comments match code behavior
- [ ] Examples are correct
- [ ] Type descriptions are accurate
- [ ] Behavior descriptions match implementation

### Clarity

- [ ] Comments use clear language
- [ ] Technical terms are explained
- [ ] "Why" is explained, not "what"
- [ ] Unnecessary verbosity is removed

### Consistency

- [ ] Documentation style matches other files
- [ ] Section headers are used correctly
- [ ] Comment format is consistent
- [ ] Terminology is consistent

## Documentation When Modifying Code

### Updating Existing Documented Code

- [ ] Comments updated if logic changes
- [ ] BEHAVIOR section updated if conditions change
- [ ] Cache invalidation comments updated if needed
- [ ] Examples updated if API changes
- [ ] Invariants updated if design changes

### Adding to Existing Modules

- [ ] New functions follow module's style
- [ ] New state uses STATE section format
- [ ] New complexity gets ALGORITHM section
- [ ] New side effects are documented

## Quick Reference: Which Sections to Use

| Situation | Section to Use |
|-----------|---|
| Function has conditional behavior | BEHAVIOR |
| Component has multiple state variables | STATE |
| Calculating something complex | ALGORITHM |
| Different behavior for different users | BEHAVIOR |
| Cache clearing or invalidation | explain in comment |
| Data isolation or auth required | SECURITY |
| Multi-step process | explain with numbered steps |
| Thread-safety or concurrency | SECURITY or explain in comment |
| Performance optimization | explain in comment |
| Edge case handling | explain in comment |

## Example: Complete Documented Mutation Hook

Use this as a template for new mutation hooks:

```typescript
/*
 * useCreateMyEntity - Mutation hook for creating new entities
 *
 * Creates a new entity record and invalidates relevant cache queries.
 * Only superadmins can create entities across organizations; regular
 * users create entities within their organization.
 */
export const useCreateMyEntity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entity: EntityInsert) => {
      /* Implementation: call service to create entity */
      return myService.create(entity);
    },
    onSuccess: (data) => {
      /*
       * Invalidate entity list for the organization. This ensures the
       * new entity appears in all list views immediately.
       */
      queryClient.invalidateQueries({
        queryKey: ["entities", data.organization_id]
      });
    },
    onError: (error) => {
      /* Error handling is delegated to consuming components */
      throw error;
    },
  });
};
```

## Example: Complete Documented Hook with Access Control

Use this as a template for new query hooks:

```typescript
/*
 * useMyEntities - Fetch entities for organization
 *
 * BEHAVIOR:
 * - Superadmins: fetch all entities across all organizations
 * - Regular users: fetch only entities in their organization
 *
 * Returns empty array if not superadmin and no organizationId provided.
 * Query is disabled until necessary context is available.
 */
export const useMyEntities = (organizationId: string | undefined) => {
  const { data: isSuperadmin } = useIsSuperadmin();

  return useQuery({
    queryKey: ["entities", organizationId, isSuperadmin],
    queryFn: async () => {
      /* Return empty array if user lacks authorization context */
      if (!isSuperadmin && !organizationId) return [];

      let query = supabase.from("entities").select("*");

      /* Apply organization filtering for non-superadmin users */
      if (!isSuperadmin && organizationId) {
        query = query.eq("organization_id", organizationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Entity[];
    },
    enabled: isSuperadmin || !!organizationId,
  });
};
```

## Common Documentation Mistakes to Avoid

### Mistake 1: Documenting the "What" Instead of "Why"

❌ Bad:
```typescript
/* Set the user to null */
setUser(null);
```

✓ Good:
```typescript
/* Sign out the current user by clearing the auth context */
setUser(null);
```

### Mistake 2: Outdated Comments

❌ Bad:
```typescript
// This used to filter by status
if (!isSuperadmin && organizationId) {
  query = query.eq("organization_id", organizationId);
}
```

✓ Good:
```typescript
/* Restrict non-superadmins to their organization */
if (!isSuperadmin && organizationId) {
  query = query.eq("organization_id", organizationId);
}
```

### Mistake 3: Over-Documentation of Obvious Code

❌ Bad:
```typescript
/* Create a new array */
const items = [];
/* Push each task into the array */
tasks.forEach(task => items.push(task));
```

✓ Good:
```typescript
const items = tasks.map(task => /* transform if needed */ task);
```

### Mistake 4: Comments Asking Questions

❌ Bad:
```typescript
/* Should we filter by status here? */
if (status) {
  query = query.eq("status", status);
}
```

✓ Good:
```typescript
/* Optionally filter results by status when provided */
if (status) {
  query = query.eq("status", status);
}
```

### Mistake 5: Missing BEHAVIOR Section

❌ Bad:
```typescript
export const useData = (id: string | undefined) => {
  // fetches data
};
```

✓ Good:
```typescript
/*
 * Fetch data by ID.
 *
 * BEHAVIOR:
 * - If id is undefined: returns null without querying
 * - If id is defined: fetches data from server
 */
export const useData = (id: string | undefined) => {
  // fetches data
};
```

## Reviewing Documentation in PRs

When reviewing a PR with documentation:

1. **File Headers** - Does new code have clear file headers?
2. **Function Docs** - Are exported functions documented?
3. **Clarity** - Is the documentation clear and helpful?
4. **Accuracy** - Does documentation match the code?
5. **Completeness** - Is nothing important missing?
6. **Style** - Does it follow our conventions?
7. **Examples** - Are there examples if appropriate?
8. **Security** - Are security implications noted?

## Questions to Ask About Documentation

When writing or reviewing, ask:

1. **Does this need a comment?** - Is the code self-explanatory?
2. **Would a new developer understand this?** - Imagine explaining to a junior dev
3. **Is this the "why" or "what"?** - Comments should focus on why
4. **Is this accurate?** - Does it match the actual code behavior?
5. **Is this concise?** - Is it the minimum needed to be clear?
6. **Would examples help?** - Are there complex patterns that need examples?
7. **Is there a better way to write this code?** - Maybe code is clearer than comments
8. **Are there invariants to document?** - What must always be true?

## Resources

- **Full Documentation Strategy**: See `DOCUMENTATION_STRATEGY.md`
- **Quick Reference**: See `DOCUMENTATION_QUICK_REFERENCE.md`
- **Before/After Examples**: See `DOCUMENTATION_EXAMPLES.md`
- **Redis Source Code**: https://github.com/redis/redis/blob/unstable/src/

## Summary

Good documentation:
- Explains WHY code is written this way
- Uses clear, concise language
- Includes section headers for structure
- Documents invariants and constraints
- Notes security and multi-tenant considerations
- Provides examples when helpful
- Stays in sync with code changes

Poor documentation:
- Explains what the code does (code shows that)
- Uses vague or unclear language
- Is out of sync with actual behavior
- Misses non-obvious logic
- Ignores security implications
- Is overly verbose
- Contains questions or uncertainty

---

**Remember**: The best documentation makes code easier to understand and maintain. When in doubt, add a comment explaining why the code is written this way.
