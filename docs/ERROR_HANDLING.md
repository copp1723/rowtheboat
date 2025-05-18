# Error Handling Guide

This document outlines the error handling patterns and best practices for the application.

## Error Types

### Base Error Class

- `AppError`: Base class for all application errors
- `CodedError`: Extends `AppError` with error codes and additional context

### Common Error Types

- `ValidationError`: For input validation failures (400)
- `AuthenticationError`: For authentication failures (401)
- `AuthorizationError`: For authorization failures (403)
- `NotFoundError`: For resource not found (404)
- `DatabaseError`: For database operation failures (500)
- `ExternalServiceError`: For failures in external services (502)
- `RateLimitError`: For rate limiting (429)
- `WorkflowError`: For workflow execution failures (500)
- `EmailError`: For email sending failures (500)
- `ConfigurationError`: For configuration issues (500)
- `InternalError`: For unexpected internal errors (500)

## Error Codes

Error codes are defined in `ERROR_CODES` constant in `src/utils/errors.ts`. They follow these ranges:

- `1000-1999`: General errors
- `2000-2999`: Authentication & Authorization
- `3000-3999`: Resource errors
- `4000-4999`: Database errors
- `5000-5999`: External service errors
- `6000-6999`: Workflow errors
- `7000-7999`: Rate limiting
- `8000-8999`: Email errors

## Best Practices

### Throwing Errors

```typescript
// Basic error
throw new ValidationError('Invalid input');

// With context
throw new DatabaseError('Failed to save record', { 
  table: 'users',
  operation: 'insert',
  error: err.message 
});

// With custom code
throw new CodedError(
  'Invalid API key',
  'INVALID_API_KEY',
  401
);
```

### Handling Errors

#### In Express Routes

```typescript
import { asyncHandler } from '../utils/errors';

router.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    throw new NotFoundError('User not found');
  }
  res.json(user);
}));
```

#### In Async Functions

```typescript
import { withErrorHandling } from '../utils/errors';

const fetchUserData = withErrorHandling(
  async (userId: string) => {
    // Function implementation
  },
  'fetchUserData',
  { logError: true, rethrow: false }
);
```

### React Error Boundaries

```tsx
import { ErrorBoundary } from '../utils/errors';

function App() {
  return (
    <ErrorBoundary 
      fallback={(error) => (
        <div>
          <h1>Something went wrong</h1>
          <p>{error.message}</p>
        </div>
      )}
    >
      <YourComponent />
    </ErrorBoundary>
  );
}
```

## Logging

Errors are automatically logged with appropriate levels:

- **Error level**: For unexpected/operational errors
- **Warn level**: For expected/operational errors

Logs include:
- Error name and message
- Stack trace
- Error code
- Context information
- Timestamp

## Testing Errors

When testing error cases:

```typescript
describe('UserService', () => {
  it('should throw NotFoundError for non-existent user', async () => {
    await expect(userService.getUser('nonexistent'))
      .rejects
      .toThrow(NotFoundError);
  });

  it('should include error code in response', async () => {
    try {
      await userService.getUser('invalid');
      fail('Expected error was not thrown');
    } catch (error) {
      expect(error.code).toBe('USER_NOT_FOUND');
    }
  });
});
```

## Adding New Error Types

1. Add a new error class in `src/shared/errorTypes.ts`
2. Add appropriate error code in `src/utils/errors.ts`
3. Document the error type in this guide
4. Add tests for the new error type
