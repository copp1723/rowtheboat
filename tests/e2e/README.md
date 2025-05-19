# End-to-End (E2E) Test Guide

## Running E2E Tests

1. Install dependencies:
   ```sh
   npm install
   ```
2. Start the application and required services (DB, Redis, etc.)
3. Run E2E tests:
   ```sh
   npx playwright test
   ```
4. View coverage report:
   ```sh
   npx nyc report --reporter=html
   open coverage/index.html
   ```

## Extending E2E Tests
- Add new test files in `tests/e2e/`
- Use data factories in `factories.ts`
- Use setup/teardown scripts for isolation

## CI Integration
- Ensure Playwright and NYC are run in CI pipeline
- Coverage threshold is set to 80%
