# Contributing to Row The Boat

This document outlines the development workflow, coding standards, and contribution guidelines for the Row The Boat project.

## Table of Contents
1. [Development Workflow](#development-workflow)
2. [Git Workflow](#git-workflow)
3. [Code Style and Standards](#code-style-and-standards)
4. [Testing Guidelines](#testing-guidelines)
5. [Logging Standards](#logging-standards)
6. [Documentation](#documentation)

## Development Workflow

### Setting Up Your Environment

1. Clone the repository
2. Install dependencies with `npm install`
3. Copy `.env.example` to `.env` and configure environment variables
4. Run database migrations with `npm run migrate`
5. Start the development server with `npm run dev`

### Development Process

1. Create a new branch for your feature or fix
2. Make your changes
3. Write tests for your changes
4. Run tests with `npm test`
5. Commit your changes with a descriptive commit message
6. Push your branch and create a pull request (or merge directly to main if appropriate)

## Git Workflow

### Branching Strategy

The project allows direct merging to the `main` branch without requiring a pull request process, but we recommend following these guidelines:

- **Feature branches**: `feature/short-description`
- **Bug fix branches**: `fix/short-description` or `fix/issue-number`
- **Hotfix branches**: `hotfix/short-description`

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types include:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Formatting changes
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `test`: Adding or updating tests
- `chore`: Changes to the build process or tools

Example:
```
feat(auth): add user authentication

Implement JWT-based authentication for user login.
```

## Code Style and Standards

### TypeScript Standards

- Use TypeScript for all new code
- Avoid using `any` type - use proper type definitions
- Document functions and complex types with JSDoc comments
- Follow the existing code style in the project

### Type Safety Policy

- Prioritize type safety by using explicit TypeScript types
- Avoid using `any` type or `@ts-ignore` comments
- If exceptions are needed, document them in `docs/TYPE_EXCEPTIONS.md`

### Naming Conventions

- **Files**: Use kebab-case for filenames (e.g., `user-service.ts`)
- **Classes**: Use PascalCase (e.g., `UserService`)
- **Functions/Methods**: Use camelCase (e.g., `getUserById`)
- **Constants**: Use UPPER_SNAKE_CASE (e.g., `MAX_RETRY_COUNT`)
- **Interfaces/Types**: Use PascalCase with descriptive names (e.g., `UserProfile`)

## Testing Guidelines

### Test Structure

Tests are organized into:
- **Unit tests**: Test individual components in isolation
- **Integration tests**: Test how components work together
- **End-to-end tests**: Test complete user flows

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

# Generate test coverage report
npm run test:coverage
```

### Writing Tests

- Write tests for all new features and bug fixes
- Aim for at least 80% code coverage
- Test both success and failure cases
- Use descriptive test names that explain what is being tested

## Logging Standards

### Importing the Logger

Always import specific logging functions from the shared logger module:

```typescript
import { debug, info, warn, error, fatal } from '../shared/logger';

// Usage
info('User logged in successfully', { userId: '123' });
error('Failed to process payment', { orderId: '456', error: err.message });
```

Do NOT import the logger as a default import or as a named `logger` import:

```typescript
// ❌ INCORRECT
import logger from '../shared/logger';
logger.info('Message'); // Wrong

// ❌ INCORRECT
import { logger } from '../shared/logger';
logger.info('Message'); // Wrong
```

### Log Levels

Use the appropriate log level:
- `debug`: Detailed information for debugging
- `info`: General information about system operation
- `warn`: Warning conditions
- `error`: Error conditions
- `fatal`: Critical errors that cause application failure

### Structured Logging

Use structured logging with metadata objects:

```typescript
// ✅ CORRECT
info('Processing order', { orderId: '123', items: 5, total: 99.99 });

// ❌ INCORRECT
info(`Processing order ${orderId} with ${items} items and total ${total}`);
```

## Documentation

### Code Documentation

- Use JSDoc comments for functions, classes, and interfaces
- Document complex logic with inline comments
- Keep comments up-to-date when changing code

### Project Documentation

- Update README.md when adding new features
- Document new environment variables in ENVIRONMENT_VARIABLES.md
- Add usage examples for new APIs
- Document known issues and workarounds

### API Documentation

- Document all API endpoints with:
  - HTTP method and path
  - Request parameters and body
  - Response format and status codes
  - Authentication requirements
  - Example requests and responses

## Job Queues

- Use BullMQ for job queues
- Create dedicated TypeScript types/interfaces for all job payloads
- Centralize types in `src/types/` or `src/interfaces/` directory
- Include proper error handling and retry logic in job processors

## Additional Resources

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [BullMQ Documentation](https://docs.bullmq.io/)
