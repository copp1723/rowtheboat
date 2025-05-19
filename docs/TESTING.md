# Testing Guide

This document provides comprehensive information about testing the Row The Boat application, including test structure, running tests, and writing new tests.

## Test Structure

Tests are organized into the following categories:

```
tests/
├── unit/              # Unit tests
├── integration/       # Integration tests
│   ├── api/           # API endpoint tests
│   ├── database/      # Database operation tests
│   ├── services/      # Service integration tests
│   └── utils/         # Test utilities
└── e2e/               # End-to-end tests
```

The project uses three types of tests:

1. **Unit Tests**: Test individual components in isolation
   - File naming: `*.test.ts`
   - Located in `tests/unit/` or alongside the code they test

2. **Integration Tests**: Test interactions between components
   - File naming: `*.spec.ts`
   - Located in `tests/integration/`

3. **End-to-End Tests**: Test complete application flows
   - File naming: `*.spec.ts`
   - Located in `tests/e2e/`

## Running Tests

### Running All Tests

To run all tests:

```bash
npm test
```

### Running Tests with Watch Mode

For development, you can use watch mode to automatically re-run tests when files change:

```bash
npm run test:watch
```

### Running Unit Tests Only

To run only unit tests:

```bash
npm run test:unit
```

### Running Integration Tests Only

To run only integration tests:

```bash
npm run test:integration
```

### Running End-to-End Tests Only

To run only end-to-end tests:

```bash
npm run test:e2e
```

### Generating Coverage Reports

To generate a test coverage report:

```bash
npm run test:coverage
```

This will create a coverage report in the `coverage/` directory. You can open `coverage/lcov-report/index.html` in a browser to view the report.

### Running Specific Tests

To run a specific test file:

```bash
npm test -- tests/integration/api/health.spec.ts
```

To run tests matching a specific pattern:

```bash
npm test -- -t "should return health status"
```

## Writing Tests

### Test File Structure

Each test file should follow this structure:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { functionToTest } from '../../path/to/module';

// Optional: Mock dependencies
vi.mock('dependency', () => ({
  someFunction: vi.fn(),
}));

describe('Module or Function Name', () => {
  // Optional: Setup before tests
  beforeAll(() => {
    // Setup code
  });

  // Optional: Cleanup after tests
  afterAll(() => {
    // Cleanup code
  });

  describe('functionName', () => {
    it('should do something specific', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = functionToTest(input);

      // Assert
      expect(result).toBe(expectedOutput);
    });

    // More test cases...
  });
});
```

### Testing Asynchronous Code

For testing asynchronous code:

```typescript
it('should handle async operations', async () => {
  // Arrange
  const input = 'test';

  // Act
  const result = await asyncFunctionToTest(input);

  // Assert
  expect(result).toBe(expectedOutput);
});
```

### Mocking Dependencies

For mocking dependencies, use Vitest's mocking capabilities:

```typescript
// Mock a module
vi.mock('module-name');

// Mock a specific function
vi.spyOn(object, 'method').mockImplementation(() => mockReturnValue);

// Mock a function with different return values for each call
const mockFn = vi.fn()
  .mockReturnValueOnce(value1)
  .mockReturnValueOnce(value2);
```

### Testing Database Operations

For testing database operations:

```typescript
import { db } from '../../src/shared/db';

describe('Database Operations', () => {
  // Clean up after tests
  afterAll(async () => {
    await db.execute('DELETE FROM users WHERE email LIKE $1', ['test-%']);
  });

  it('should insert and retrieve a user', async () => {
    // Arrange
    const userId = 'test-user-id';
    const email = 'test-user@example.com';

    // Act
    await db.execute(
      'INSERT INTO users (id, email) VALUES ($1, $2)',
      [userId, email]
    );

    const result = await db.execute(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );

    // Assert
    expect(result.rows[0]).toEqual(expect.objectContaining({
      id: userId,
      email: email,
    }));
  });
});
```

### Testing API Endpoints

For testing API endpoints, use supertest:

```typescript
import request from 'supertest';
import { createTestServer, closeTestServer } from '../utils/testUtils';

describe('API Endpoints', () => {
  let app, server;

  beforeAll(async () => {
    const testServer = await createTestServer();
    app = testServer.app;
    server = testServer.server;
  });

  afterAll(async () => {
    await closeTestServer(server);
  });

  it('should return health status', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('overallStatus', 'ok');
  });
});
```

## Test Data

### Test Fixtures

Test fixtures are located in `tests/integration/utils/testFixtures.ts` and provide sample data for tests:

```typescript
import { createTestUser } from '../utils/testFixtures';

it('should process a user', async () => {
  const testUser = await createTestUser();
  const result = await processUser(testUser);
  expect(result).toBeDefined();
});
```

### Environment Variables for Testing

Test-specific environment variables are set in `.env.test`:

```
# Test environment configuration
NODE_ENV=test

# Database configuration
TEST_DATABASE_URL=postgresql://test:test@localhost:5432/test_db

# Redis configuration
TEST_REDIS_URL=redis://localhost:6379/1
```

## Testing Specific Components

### Testing Email Ingestion

To test email ingestion:

```bash
npm run test:email-ingestion VinSolutions
```

This will run a test script that attempts to ingest emails for the specified vendor.

### Testing Data Flow

To test the complete data flow:

```bash
npm run test:data-flow
```

This will run a test script that simulates the entire data flow from ingestion to insight generation.

### Testing Insight Engine

To test the insight engine:

```bash
node test-insight-engine-stability.cjs
```

This will run a stability test for the insight engine without requiring real CRM data.

## Continuous Integration

The project uses GitHub Actions for continuous integration. The CI pipeline automatically runs on every push to the main branch and on pull requests.

The CI pipeline performs the following checks:

1. **Lint**: Checks code formatting and TypeScript compilation
2. **Test**: Runs unit and integration tests
3. **Build**: Builds the application

To view the CI configuration, see `.github/workflows/ci.yml`.

## Test Coverage Goals

We aim for at least 80% code coverage across:
- Statements
- Branches
- Functions
- Lines

## Best Practices

1. **Test in isolation**: Mock dependencies to isolate the unit being tested
2. **Test behavior, not implementation**: Focus on what the code does, not how it does it
3. **Use descriptive test names**: Test names should describe the expected behavior
4. **Keep tests simple**: Each test should verify one specific behavior
5. **Use setup and teardown**: Use `beforeEach` and `afterEach` for common setup and cleanup
6. **Avoid test interdependence**: Tests should not depend on other tests
7. **Test edge cases**: Include tests for boundary conditions and error cases
8. **Maintain test data**: Keep test fixtures up to date with schema changes

## Troubleshooting Tests

### Tests Failing Due to Database Connection

If tests fail due to database connection issues:

1. Verify that the test database exists and is accessible
2. Check that the `TEST_DATABASE_URL` in `.env.test` is correct
3. Ensure that the database user has the necessary permissions

### Tests Timing Out

If tests are timing out:

1. Check for asynchronous operations that aren't properly awaited
2. Increase the timeout for specific tests:
   ```typescript
   it('should complete a long-running operation', async () => {
     // Test code
   }, 10000); // 10-second timeout
   ```

### Mocks Not Working

If mocks aren't working as expected:

1. Verify that the mock is defined before the module is imported
2. Check that the mock path matches the actual import path
3. Reset mocks between tests:
   ```typescript
   afterEach(() => {
     vi.resetAllMocks();
   });
   ```
