# Drizzle ORM Import Standardization

This document describes the standardized import pattern for Drizzle ORM in the Row The Boat application.

## Overview

To ensure consistency across the codebase and prevent import path issues, all Drizzle ORM imports should be done through the centralized `src/utils/drizzleImports.ts` file. This approach provides several benefits:

1. **Consistency**: All components use the same import pattern
2. **Maintainability**: Easier to update Drizzle ORM usage across the codebase
3. **Type Safety**: Ensures proper typing for all Drizzle ORM operations
4. **Reduced Errors**: Prevents import path issues and duplicate imports

## Import Categories

The standardized imports are organized into the following categories:

### 1. Runtime Helpers

These are utility functions from the core Drizzle ORM package:

```typescript
import { sql, and, eq, isNull, desc, gte, lte } from '../utils/drizzleImports.js';
```

### 2. Type Utilities

Type definitions and utilities for working with Drizzle ORM:

```typescript
import { type InferSelectModel, type InferInsertModel } from '../utils/drizzleImports.js';
```

### 3. Database Types

Types for database connections and operations:

```typescript
import { type PostgresJsDatabase } from '../utils/drizzleImports.js';
```

### 4. Table Definitions

Functions for defining database tables and columns:

```typescript
import { pgTable, varchar, text, timestamp } from '../utils/drizzleImports.js';
```

### 5. Schema Exports

All database table definitions from the shared schema:

```typescript
import { users, credentials, taskLogs } from '../utils/drizzleImports.js';
```

## Usage Examples

### Defining a New Table

```typescript
import { pgTable, varchar, timestamp, uuid } from '../utils/drizzleImports.js';

export const myTable = pgTable('my_table', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

### Querying Data

```typescript
import { db } from '../shared/db.js';
import { users, eq } from '../utils/drizzleImports.js';

// Find a user by ID
const user = await db.query.users.findFirst({
  where: eq(users.id, userId)
});
```

### Using SQL Helpers

```typescript
import { sql } from '../utils/drizzleImports.js';

const query = sql`SELECT * FROM users WHERE id = ${userId}`;
```

## Implementation Details

The `src/utils/drizzleImports.ts` file:

1. Imports all necessary functions and types from Drizzle ORM packages
2. Re-exports them for use throughout the application
3. Includes custom type utilities for better type inference
4. Re-exports the entire schema for convenience

## Testing

A dedicated test file `src/tests/drizzle-imports.test.ts` verifies that all imports are working correctly. This test should be run whenever changes are made to the import pattern or schema.

## Migration Guide

When updating existing code to use the standardized import pattern:

1. Replace direct imports from Drizzle ORM packages with imports from `../utils/drizzleImports.js`
2. Update any type annotations to use the types exported from the standardized file
3. Run the tests to ensure everything works correctly

## Troubleshooting

If you encounter issues with the standardized imports:

1. Check that you're using the correct import path (with `.js` extension)
2. Verify that the function or type you need is exported from `drizzleImports.ts`
3. Run the Drizzle import tests to verify the import system is working
4. If a function or type is missing, add it to `drizzleImports.ts` following the established pattern
