# Test Running Guide

## Quick Reference

### Run All Unit Tests
```bash
npm test
```

### Run Specific Test File
```bash
npm test -- tests/invoices/invoice-calculation.property.test.ts
```

### Run Tests for a Feature
```bash
npm test -- tests/invoices      # All invoice tests
npm test -- tests/organizations # All organization tests
npm test -- tests/components    # All component tests
```

### Run E2E Tests (Playwright)
```bash
npx playwright test                                    # All E2E tests
npx playwright test tests/invoices/invoice-creation   # Specific E2E test
npx playwright test --headed                           # With browser visible
npx playwright test --debug                            # Debug mode
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Tests with UI
```bash
npm run test:ui
```

## Test Categories

### ✅ Unit Tests (Run with `npm test`)
- Component tests
- Hook tests
- Utility tests
- Property-based tests
- Integration tests

### ⚠️ E2E Tests (Run with `npx playwright test`)
- Dashboard visibility
- Invoice workflows
- Project management
- Task management
- User flows

## Common Issues

### Issue: "storage.getItem is not a function"
**Solution**: Already fixed with localStorage mock in `tests/setup.ts`

### Issue: E2E tests fail with `npm test`
**Solution**: E2E tests need Playwright. Run with `npx playwright test`

### Issue: Tests can't find modules
**Solution**: Check that imports use `@/` alias, not relative paths

### Issue: Flaky database tests
**Solution**: These tests depend on database state. Run them individually or with retries

## Test File Naming Conventions

- `*.test.ts` - Unit tests (Vitest)
- `*.test.tsx` - Component tests (Vitest + React Testing Library)
- `*.spec.ts` - E2E tests (Playwright)
- `*.property.test.ts` - Property-based tests (fast-check + Vitest)

## Debugging Tests

### Debug Unit Test
```bash
npm test -- tests/path/to/test.test.ts --reporter=verbose
```

### Debug E2E Test
```bash
npx playwright test --debug tests/path/to/test.spec.ts
```

### View Test Coverage
```bash
npm test -- --coverage
```

## CI/CD Considerations

### For GitHub Actions / CI
```yaml
# Unit tests
- run: npm test

# E2E tests
- run: npx playwright install
- run: npx playwright test
```

### Parallel Execution
```bash
# Unit tests run in parallel by default
npm test

# E2E tests with workers
npx playwright test --workers=4
```

## Tips

1. **Run fast tests first**: Unit tests are faster than E2E
2. **Use watch mode during development**: `npm run test:watch`
3. **Run E2E tests before commits**: Catch integration issues early
4. **Check test output carefully**: Some "errors" are intentional (ErrorBoundary tests)
5. **Update snapshots when needed**: `npm test -- -u`
