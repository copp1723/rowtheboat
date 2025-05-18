# Shared Utilities Documentation

This document provides an overview of the shared utilities created to reduce code duplication across the codebase.

## Table of Contents

1. [Form Handling](#form-handling)
2. [UI Components](#ui-components)
3. [Error Handling](#error-handling)
4. [API Response Formatting](#api-response-formatting)
5. [Database Operations](#database-operations)
6. [Validation](#validation)
7. [Code Duplication Detection](#code-duplication-detection)

## Form Handling

### useForm Hook

The `useForm` hook provides a standardized way to handle form state, validation, and submission.

**Location**: `frontend/src/hooks/useForm.ts`

**Features**:
- Form state management
- Field validation with customizable rules
- Error handling
- Form submission with loading state

**Usage Example**:

```tsx
const { 
  values, 
  errors, 
  formError, 
  isSubmitting, 
  handleChange, 
  handleSubmit 
} = useForm<FormValues>({
  initialValues: {
    name: '',
    email: '',
  },
  validationRules: {
    name: [validationRules.required('Name is required')],
    email: [
      validationRules.required('Email is required'),
      validationRules.email('Please enter a valid email'),
    ],
  },
  onSubmit: async (values) => {
    // Submit form data
    await submitData(values);
  },
});
```

### Common Validation Rules

The `useForm` hook includes common validation rules that can be reused across forms:

- `required`: Validates that a field is not empty
- `email`: Validates that a field contains a valid email address
- `minLength`: Validates that a field has a minimum length
- `maxLength`: Validates that a field has a maximum length

## UI Components

### FormWrapper

The `FormWrapper` component provides a consistent layout and error handling for forms.

**Location**: `frontend/src/components/Form/FormWrapper.tsx`

**Features**:
- Consistent form styling
- Error display
- Loading state handling

**Usage Example**:

```tsx
<FormWrapper
  title="Add Credentials"
  onSubmit={handleSubmit}
  error={formError}
  isSubmitting={isSubmitting}
>
  {/* Form fields */}
</FormWrapper>
```

### Card

The `Card` component provides a consistent card layout for content.

**Location**: `frontend/src/components/UI/Card.tsx`

**Features**:
- Consistent card styling
- Optional title, subtitle, and footer
- Optional header action

**Usage Example**:

```tsx
<Card
  title="User Profile"
  subtitle="Manage your account information"
  footer={<Button>Save Changes</Button>}
>
  {/* Card content */}
</Card>
```

## Error Handling

### Error Handling Utilities

The error handling utilities provide a consistent way to handle errors across the codebase.

**Location**: `src/utils/errorHandling.ts`

**Features**:
- Clean error message extraction
- Error formatting for logging
- Try-catch wrapper with context
- Retry mechanism with exponential backoff

**Usage Example**:

```ts
// Get a clean error message
const errorMessage = getErrorMessage(error);

// Format error for logging
const formattedError = formatError(error);

// Try-catch wrapper with context
const result = await tryCatchWithContext(
  async () => {
    // Operation that might throw
    return await fetchData();
  },
  { userId, operation: 'fetchData' }
);

// Retry mechanism
const result = await executeWithRetry(
  async () => {
    // Operation that might fail temporarily
    return await makeApiRequest();
  },
  {
    retries: 3,
    delay: 1000,
    backoffFactor: 2,
    context: { operation: 'makeApiRequest' },
  }
);
```

## API Response Formatting

### API Response Utilities

The API response utilities provide a consistent way to format API responses.

**Location**: `src/utils/apiResponse.ts`

**Features**:
- Standard success response
- Standard error response
- Specialized responses (not found, bad request, etc.)
- Route handler wrapper

**Usage Example**:

```ts
// Success response
sendSuccess(res, data, { message: 'User created successfully' });

// Error response
sendError(res, error, { statusCode: 400 });

// Not found response
sendNotFound(res, 'User not found');

// Route handler wrapper
app.get('/users/:id', createRouteHandler(async (req, res) => {
  const user = await getUserById(req.params.id);
  return user;
}));
```

## Database Operations

### Database Helper Utilities

The database helper utilities provide standardized functions for common database operations.

**Location**: `src/utils/dbHelpers.ts`

**Features**:
- Generic CRUD operations
- Consistent error handling
- Support for relations and filtering

**Usage Example**:

```ts
// Find by ID
const user = await findById(users, userId);

// Find all with filtering
const activeUsers = await findAll(users, {
  where: eq(users.status, 'active'),
  orderBy: [{ column: users.createdAt, direction: 'desc' }],
  limit: 10,
});

// Create
const newUser = await create(users, {
  name: 'John Doe',
  email: 'john@example.com',
});

// Update
const updatedUser = await update(users, userId, {
  name: 'Jane Doe',
});

// Delete
const success = await remove(users, userId);
```

## Validation

### Validation Utilities

The validation utilities provide common validation functions for use across the application.

**Location**: `src/utils/validation.ts`

**Features**:
- Email validation
- URL validation
- Date validation
- Phone number validation
- Object validation against a schema

**Usage Example**:

```ts
// Validate an email
if (!isValidEmail(email)) {
  throw new Error('Invalid email address');
}

// Validate an object against a schema
const schema = {
  name: validationRules.required,
  email: [validationRules.required, validationRules.email],
  age: (value) => isPositiveNumber(value) || 'Age must be a positive number',
};

const { isValid, errors } = validateObject(data, schema);
```

## Code Duplication Detection

### JSCPD Configuration

The project includes configuration for JSCPD (JavaScript Copy-Paste Detector) to identify code duplication.

**Location**: `.jscpd.json`

**Features**:
- Detects code duplication across the codebase
- Configurable threshold for acceptable duplication
- HTML and console reporting
- Ignores test files, node_modules, and build artifacts

**Usage**:

```bash
# Run code duplication detection
npm run check-duplicates
```
