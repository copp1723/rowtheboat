# Scripts Reference

This document provides a comprehensive reference for all npm scripts available in the project. Scripts are organized by category for easy reference.

## Table of Contents

1. [Development Scripts](#development-scripts)
2. [Build Scripts](#build-scripts)
3. [Testing Scripts](#testing-scripts)
4. [Database Scripts](#database-scripts)
5. [Code Quality Scripts](#code-quality-scripts)
6. [Utility Scripts](#utility-scripts)

## Development Scripts

### `npm run dev`

Starts the development server with hot reloading.

**Usage:**
```bash
npm run dev
```

**Details:**
- Uses `ts-node` to run the application without compiling
- Watches for file changes and automatically restarts
- Sets `NODE_ENV=development` by default

**Example Output:**
```
> workspace@1.0.0 dev
> ts-node src/index.ts

[INFO] Server started on http://0.0.0.0:5000
[INFO] Connected to database
```

### `npm run start`

Starts the application in production mode.

**Usage:**
```bash
npm run start
```

**Details:**
- Runs the compiled JavaScript code from the `dist` directory
- Requires the application to be built first with `npm run build`
- Sets `NODE_ENV=production` by default

**Example Output:**
```
> workspace@1.0.0 start
> node dist/index.js

[INFO] Server started on http://0.0.0.0:5000
[INFO] Connected to database
```

## Build Scripts

### `npm run build`

Builds the application for production.

**Usage:**
```bash
npm run build
```

**Details:**
- Runs the `build.sh` script
- Compiles TypeScript to JavaScript
- Outputs to the `dist` directory
- Includes type checking

**Example Output:**
```
> workspace@1.0.0 build
> ./build.sh

Compiling TypeScript...
Successfully compiled TypeScript.
```

## Testing Scripts

### `npm test`

Runs all tests.

**Usage:**
```bash
npm test
```

**Details:**
- Runs all tests using Vitest
- Includes unit, integration, and end-to-end tests
- Exits after tests complete

**Example Output:**
```
> workspace@1.0.0 test
> vitest run

 RUN  v1.6.1 /Users/username/project

 ✓ tests/unit/utils/encryption.test.ts (3 tests) 42ms
 ✓ tests/integration/api/health.spec.ts (1 test) 156ms
 ...

Test Files  15 passed (15)
     Tests  42 passed (42)
  Start at  10:15:42
  Duration  3.45s (transform 120ms, setup 0ms, collect 315ms, tests 1.21s, environment 0ms, prepare 142ms)
```

### `npm run test:watch`

Runs tests in watch mode.

**Usage:**
```bash
npm run test:watch
```

**Details:**
- Runs tests using Vitest in watch mode
- Watches for file changes and re-runs tests
- Useful during development

### `npm run test:unit`

Runs only unit tests.

**Usage:**
```bash
npm run test:unit
```

**Details:**
- Runs tests matching the pattern `**/*.test.ts`
- Focuses on testing individual components in isolation

### `npm run test:integration`

Runs only integration tests.

**Usage:**
```bash
npm run test:integration
```

**Details:**
- Runs tests matching the pattern `**/*.spec.ts`
- Tests how components work together

### `npm run test:e2e`

Runs only end-to-end tests.

**Usage:**
```bash
npm run test:e2e
```

**Details:**
- Runs tests in the `tests/e2e` directory
- Tests complete user flows

### `npm run test:coverage`

Generates a test coverage report.

**Usage:**
```bash
npm run test:coverage
```

**Details:**
- Runs tests with coverage reporting enabled
- Generates reports in the `coverage` directory
- Includes statement, branch, function, and line coverage

**Example Output:**
```
> workspace@1.0.0 test:coverage
> vitest run --coverage

 RUN  v1.6.1 /Users/username/project

 ✓ tests/unit/utils/encryption.test.ts (3 tests) 42ms
 ...

 % Coverage report from v8
-------------------|---------|----------|---------|---------|
File               | % Stmts | % Branch | % Funcs | % Lines |
-------------------|---------|----------|---------|---------|
All files          |   85.32 |    79.41 |   83.87 |   85.32 |
 src/config        |   92.31 |    85.71 |   88.89 |   92.31 |
  index.ts         |   92.31 |    85.71 |   88.89 |   92.31 |
 ...
-------------------|---------|----------|---------|---------|
```

## Database Scripts

### `npm run migrate`

Runs database migrations.

**Usage:**
```bash
npm run migrate
```

**Details:**
- Generates migration files using Drizzle Kit
- Applies migrations to the database
- Creates tables and indexes as defined in the schema

**Example Output:**
```
> workspace@1.0.0 migrate
> drizzle-kit generate:pg && drizzle-kit push:pg

Generating migration for PostgreSQL...
1 table(s) found in schema
Generated migration file: ./drizzle/0001_initial.sql
Pushing changes to database...
Changes applied successfully
```

## Code Quality Scripts

### `npm run lint`

Runs ESLint to check for code quality issues.

**Usage:**
```bash
npm run lint
```

**Details:**
- Checks all TypeScript and JavaScript files
- Reports errors and warnings
- Does not automatically fix issues

**Example Output:**
```
> workspace@1.0.0 lint
> eslint . --ext .ts,.tsx,.js,.jsx

/Users/username/project/src/utils/logger.ts
  5:7  warning  'loggerOptions' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (0 errors, 1 warning)
```

### `npm run lint:fix`

Runs ESLint and automatically fixes issues where possible.

**Usage:**
```bash
npm run lint:fix
```

**Details:**
- Checks all TypeScript and JavaScript files
- Automatically fixes issues where possible
- Reports errors that could not be fixed

### `npm run type-check`

Runs TypeScript type checking without emitting files.

**Usage:**
```bash
npm run type-check
```

**Details:**
- Verifies type correctness across the codebase
- Does not generate any output files
- Useful for catching type errors before building

**Example Output:**
```
> workspace@1.0.0 type-check
> tsc --noEmit

src/services/userService.ts:42:10 - error TS2322: Type 'string | undefined' is not assignable to type 'string'.
  Type 'undefined' is not assignable to type 'string'.

42   return user.email;
            ~~~~~~~~~~~
```

## Utility Scripts

### `npm run prepare`

Sets up Husky for Git hooks.

**Usage:**
```bash
npm run prepare
```

**Details:**
- Automatically run after `npm install`
- Sets up Git hooks for pre-commit checks
- Ensures code quality checks run before commits

For more information about the project's development workflow, see the [Developer Guide](../DEVELOPER_GUIDE.md).
