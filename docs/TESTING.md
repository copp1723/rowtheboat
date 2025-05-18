# Testing Guide

This document provides comprehensive information about testing the AgentFlow application, including test structure, running tests, and writing new tests.

## Test Structure

Tests are organized to mirror the source code structure:

```
__tests__/
├── agents/           # Tests for agent functionality
├── api/              # Tests for API endpoints
├── services/         # Tests for services
├── shared/           # Tests for shared utilities
└── utils/            # Tests for utility functions
```

The project uses two types of tests:

1. **Unit Tests**: Test individual components in isolation
   - File naming: `*.test.ts`
   - Located alongside the code they test

2. **Integration Tests**: Test interactions between components
   - File naming: `*.spec.ts`
   - Located in `src/__tests__/integration/`

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

### Generating Coverage Reports

To generate a test coverage report:

```bash
npm run test:coverage
```

This will create a coverage report in the `coverage/` directory. You can open `coverage/lcov-report/index.html` in a browser to view the report.

### Running Specific Tests

To run a specific test file:

```bash
npm test -- src/__tests__/utils/encryption.test.ts
```

To run tests matching a specific pattern:

```bash
npm test -- -t "should encrypt and decrypt data"
```

## Writing Tests

### Test File Structure

Each test file should follow this structure:

```typescript
import { functionToTest } from '../../path/to/module';

// Optional: Mock dependencies
jest.mock('dependency', () => ({
  someFunction: jest.fn(),
}));

describe('Module or Function Name', () => {
  // Optional: Setup before tests
  beforeEach(() => {
    // Setup code
  });

  // Optional: Cleanup after tests
  afterEach(() => {
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

For mocking external dependencies, use Jest's mocking capabilities:

```typescript
// Mock a module
jest.mock('module-name');

// Mock a specific function
jest.spyOn(object, 'method').mockImplementation(() => mockReturnValue);

// Mock a function with different return values for each call
const mockFn = jest.fn()
  .mockReturnValueOnce(value1)
  .mockReturnValueOnce(value2);
```

### Testing Database Operations

For testing database operations, use the test database:

```typescript
import { db } from '../../shared/db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';

describe('Database Operations', () => {
  // Clean up after tests
  afterEach(async () => {
    await db.delete(users).where(eq(users.id, 'test-user'));
  });

  it('should insert and retrieve a user', async () => {
    // Arrange
    const user = {
      id: 'test-user',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User'
    };

    // Act
    await db.insert(users).values(user);
    const result = await db.query.users.findFirst({
      where: eq(users.id, 'test-user')
    });

    // Assert
    expect(result).toEqual(expect.objectContaining(user));
  });
});
```

### Testing API Endpoints

For testing API endpoints, use supertest:

```typescript
import request from 'supertest';
import { app } from '../../api/server';

describe('API Endpoints', () => {
  it('should return health status', async () => {
    const response = await request(app).get('/api/health');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
  });
});
```

## Test Data

### Fixtures

Test fixtures are located in `__tests__/fixtures/` and provide sample data for tests:

```typescript
// Import a fixture
import { sampleReport } from '../fixtures/reports';

// Use the fixture in a test
it('should process a report', async () => {
  const result = await processReport(sampleReport);
  expect(result).toBeDefined();
});
```

### Environment Variables for Testing

Test-specific environment variables are set in `jest.setup.js`:

```javascript
// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.EKO_API_KEY = 'test-eko-api-key';
// ...
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

We aim for at least 70% code coverage across:
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
2. Check that the `DATABASE_URL` in `jest.setup.js` is correct
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
     jest.resetAllMocks();
   });
   ```
