# Test Organization

This directory contains all tests for the Vibe CRM application, organized by feature area.

## Directory Structure

```
tests/
├── clients/              # Client CRUD operations tests
├── components/           # Component unit tests
│   ├── auth/                # Authentication component tests
│   ├── dashboard/           # Dashboard component tests
│   ├── error-boundary/      # Error boundary tests
│   └── organizations/       # Organization component tests
├── dashboard/            # Dashboard visibility and data tests
├── hooks/                # React hooks tests
├── invoices/             # Invoice management tests
│   ├── *-creation.spec.ts       # E2E invoice creation tests
│   ├── *-calculation.property.test.ts  # Property-based calculation tests
│   ├── *-validation.test.ts     # Invoice validation tests
│   └── *-sending.spec.ts        # Invoice sending functionality tests
├── organizations/        # Organization management tests
│   ├── organization-creation.test.ts
│   ├── organization-permissions.test.ts
│   ├── organization-stats-*.property.test.ts
│   └── organization-*.property.test.ts
├── pages/                # Page component tests
├── performance/          # Performance and query optimization tests
├── projects/             # Project management tests
├── revenue/              # Revenue calculation and reporting tests
│   └── revenue-*.property.test.ts
├── security/             # RLS policies and security tests
├── superadmin/           # Superadmin-specific functionality tests
│   ├── superadmin-access-control.property.test.ts
│   ├── superadmin-project-*.spec.ts
│   └── superadmin-flag-persistence.property.test.ts
├── tasks/                # Task management tests
├── users/                # User management and visibility tests
├── utilities/            # Utility function tests (e.g., currency formatting)
└── setup.ts              # Global test setup and configuration
```

## Test Types

### E2E Tests (*.spec.ts)
End-to-end tests using Playwright that test the full user flow through the application.
- Run with: `npm run test:e2e`
- Located in feature-specific directories

### Unit Tests (*.test.ts, *.test.tsx)
Unit and integration tests using Vitest for testing individual components and functions.
- Run with: `npm test`
- Located in feature-specific directories

### Property-Based Tests (*.property.test.ts)
Property-based tests using fast-check for testing invariants and edge cases.
- Run with: `npm test`
- Primarily used for:
  - Data validation
  - Security policies (RLS)
  - Calculations (revenue, invoices)
  - Organization statistics

## Running Tests

### Run all tests
```bash
npm test
```

### Run E2E tests only
```bash
npm run test:e2e
```

### Run tests for a specific feature
```bash
# Unit tests
npm test -- tests/invoices

# E2E tests
npx playwright test tests/invoices
```

### Run a specific test file
```bash
# Unit test
npm test -- tests/invoices/invoice-validation.test.ts

# E2E test
npx playwright test tests/invoices/invoice-creation.spec.ts
```

## Test Organization Guidelines

1. **Feature-based organization**: Tests are grouped by the feature they test, not by test type
2. **Naming conventions**:
   - E2E tests: `*.spec.ts` or `*.spec.tsx`
   - Unit tests: `*.test.ts` or `*.test.tsx`
   - Property-based tests: `*.property.test.ts`
3. **Shared setup**: Common test setup and utilities are in `setup.ts`
4. **Test isolation**: Each test should be independent and not rely on other tests

## Adding New Tests

When adding new tests:
1. Determine the feature area (clients, invoices, projects, etc.)
2. Place the test in the appropriate feature directory
3. Follow the naming convention based on test type
4. Ensure tests are isolated and can run independently
5. Update this README if adding a new feature directory
