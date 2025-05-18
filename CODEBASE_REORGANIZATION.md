# Codebase Reorganization

This document outlines the changes made to reorganize the codebase for better maintainability, reduced duplication, and improved organization.

## Changes Made

### 1. Test Directory Reorganization

- Created a dedicated `tests` directory at the root level
- Organized tests into subdirectories:
  - `tests/unit`: Unit tests
  - `tests/integration`: Integration tests
  - `tests/e2e`: End-to-end tests
- Updated import paths in test files
- Updated test configuration in `vitest.config.ts`
- Updated test scripts in `package.json`

### 2. TypeScript Error Fixes

- Fixed TypeScript errors in `src/shared/errorHandler.ts`
- Fixed TypeScript errors in `src/utils/errors.ts`
- Added missing `fatal` method to the logger

### 3. Shared Utilities

- Created shared utility functions for common operations:
  - `src/utils/routeHandler.ts`: Common route handler utilities
  - `src/utils/emailTemplate.ts`: Email template utilities

### 4. Feature-Based Organization

Created a feature-based directory structure under `src/features` with the following features:

- `auth`: Authentication and authorization
- `email`: Email-related functionality
- `scheduler`: Scheduling and job management
- `workflow`: Workflow execution
- `insights`: Insight generation and analysis
- `monitoring`: Monitoring and logging
- `credentials`: Credential management
- `health`: Health checks and status

Each feature directory contains subdirectories:
- `components`: UI components
- `services`: Business logic
- `routes`: API routes
- `types`: Type definitions
- `utils`: Feature-specific utilities

## Benefits

1. **Improved Organization**: Code is now organized by feature, making it easier to find related files.
2. **Reduced Duplication**: Shared utilities reduce code duplication.
3. **Better Testability**: Tests are now organized in a dedicated directory structure.
4. **Clearer Boundaries**: Feature-based organization creates clearer boundaries between different parts of the application.
5. **Easier Maintenance**: Related code is now grouped together, making maintenance easier.

## Next Steps

1. **Update Import Paths**: Some import paths may still need to be updated to reflect the new structure.
2. **Remove Duplicate Files**: Once you've verified that the new structure works correctly, you can remove duplicate files.
3. **Update Documentation**: Update documentation to reflect the new structure.
4. **Add Tests**: Add tests for the new shared utilities.

## How to Use the New Structure

### Running Tests

```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run end-to-end tests
npm run test:e2e
```

### Using Shared Utilities

#### Route Handler Utilities

```typescript
import { asyncHandler, sendSuccess, sendError } from '../utils/routeHandler';

// Example usage
router.get('/items', asyncHandler(async (req, res) => {
  const items = await itemService.getAll();
  sendSuccess(res, items);
}));
```

#### Email Template Utilities

```typescript
import { prepareEmail } from '../utils/emailTemplate';

// Example usage
const { html, text } = prepareEmail('notification', {
  name: 'John Doe',
  message: 'Hello, world!',
});
```

### Working with Features

Each feature is now self-contained in its own directory, making it easier to work on specific features without affecting others.

For example, to work on the email feature:

```typescript
// Import email-related services
import { emailService } from '../features/email/services/emailService';
import { EmailTemplate } from '../features/email/types/email';

// Use email services
const result = await emailService.sendEmail(template, recipients);
```

## Conclusion

This reorganization improves the maintainability and organization of the codebase. It reduces duplication, improves testability, and creates clearer boundaries between different parts of the application.

The feature-based organization makes it easier to understand the codebase and work on specific features without affecting others.
