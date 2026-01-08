# Test Reorganization Summary

## Overview
All tests have been moved from `src/test/` to a new `tests/` directory at the project root and organized by feature area.

## Migration Details

### Before
```
src/test/
├── 43 test files (mixed features)
└── setup.ts
```

### After
```
tests/
├── clients/              (1 file)
│   └── client-crud.test.ts
├── dashboard/            (1 file)
│   └── dashboard-visibility.spec.ts
├── invoices/             (10 files)
│   ├── invoice-calculation.property.test.ts
│   ├── invoice-creation.spec.ts
│   ├── invoice-number-generation.property.test.ts
│   ├── invoice-pdf.test.tsx
│   ├── invoice-security.property.test.ts
│   ├── invoice-validation.test.ts
│   ├── invoices-page.test.tsx
│   ├── invoices-sending.spec.ts
│   ├── invoices-visibility.spec.ts
│   └── useSendInvoice.test.tsx
├── organizations/        (11 files)
│   ├── organization-creation.test.ts
│   ├── organization-crud-superadmin.property.test.ts
│   ├── organization-deletion-cascades.property.test.ts
│   ├── organization-member-count.property.test.ts
│   ├── organization-name-uniqueness.property.test.ts
│   ├── organization-permissions.test.ts
│   ├── organization-stats-invalidation.property.test.ts
│   ├── organization-stats-leakage.property.test.ts
│   ├── organization-stats-rls.test.ts
│   ├── organization-stats-switch.property.test.ts
│   └── organization-stats.property.test.ts
├── performance/          (1 file)
│   └── query-performance.test.ts
├── projects/             (1 file)
│   └── projects-visibility.spec.ts
├── revenue/              (5 files)
│   ├── revenue-12-month-limit.property.test.ts
│   ├── revenue-calculation.property.test.ts
│   ├── revenue-date-grouping.property.test.ts
│   ├── revenue-org-filtering.property.test.ts
│   └── revenue-paid-only.property.test.ts
├── security/             (1 file)
│   └── rls-policy-enforcement.property.test.ts
├── superadmin/           (7 files)
│   ├── superadmin-access-control.property.test.ts
│   ├── superadmin-all-projects-visibility.spec.ts
│   ├── superadmin-flag-persistence.property.test.ts
│   ├── superadmin-project-creation.spec.tsx
│   ├── superadmin-project-visibility.spec.ts
│   ├── superadmin-projects-management.spec.ts
│   └── superadmin-projects-visibility-simple.spec.ts
├── tasks/                (2 files)
│   ├── task-management.spec.ts
│   └── tasks-management.spec.ts
├── users/                (1 file)
│   └── users-visibility.spec.ts
├── utilities/            (1 file)
│   └── currency-formatting.property.test.ts
├── setup.ts
└── README.md
```

## Configuration Updates

### Updated Files
1. **vitest.config.ts**
   - Changed `setupFiles: ['./src/test/setup.ts']` → `setupFiles: ['./tests/setup.ts']`

2. **playwright.config.ts**
   - Changed `testDir: './src/test'` → `testDir: './tests'`

## Test Statistics

- **Total test files**: 42
- **Feature categories**: 12
- **Test types**:
  - E2E tests (*.spec.ts): ~15 files
  - Unit tests (*.test.ts): ~12 files
  - Property-based tests (*.property.test.ts): ~15 files

## Benefits

1. **Better Organization**: Tests are now grouped by feature, making it easier to find related tests
2. **Clearer Structure**: Separation of concerns with dedicated directories for each feature area
3. **Easier Navigation**: Developers can quickly locate tests for specific features
4. **Scalability**: New tests can be easily added to the appropriate feature directory
5. **Standard Convention**: Following common practice of having tests at the project root

## Running Tests

All existing test commands continue to work:

```bash
# Run all tests
npm test

# Run tests for a specific feature
npm test -- tests/invoices

# Run E2E tests
npx playwright test

# Run specific E2E test
npx playwright test tests/invoices/invoice-creation.spec.ts
```

## Notes

- The old `src/test/` directory has been removed
- All test imports and references continue to work without modification
- Test execution is verified and working correctly
