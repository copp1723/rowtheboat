# Configuration Guide

This document provides detailed information about configuring the AgentFlow application, including environment variables, configuration files, and validation rules.

## Configuration System

AgentFlow uses a centralized, type-safe configuration system with validation using Zod schemas and support for different environments (development, test, production).

### Configuration Structure

The configuration is organized into the following sections:

- **Environment**: The current environment (development, test, production)
- **Database**: Database connection settings
- **Email**: Email service configuration for sending notifications
- **OTP Email**: Email configuration for OTP retrieval
- **Security**: Security-related settings (encryption, rate limiting, etc.)
- **Server**: Web server configuration
- **Application**: General application settings
- **API Keys**: External API keys
- **Redis**: Redis connection settings
- **CRM Credentials**: Credentials for CRM platforms

### Using the Configuration System

```typescript
// Import the entire configuration
import config from '../config/index.js';

// Or import specific sections
import { database, email, security } from '../config/index.js';

// Access configuration values
const port = config.server.port;
const dbUrl = config.database.url;
const apiKey = config.apiKeys.openai;
```

## Environment Variables

AgentFlow uses environment variables for configuration. These can be set in a `.env` file in the project root or directly in the environment. The configuration system loads these variables, validates them, and provides type-safe access to them.

### Required Environment Variables

These variables are required for the application to function properly:

| Variable | Description | Format | Default |
|----------|-------------|--------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:password@host:port/dbname` | None |
| `EKO_API_KEY` | API key for Eko AI | String | None |
| `OPENAI_API_KEY` | API key for OpenAI | String | None |
| `EMAIL_USER` | Email account for sending notifications | String | None |
| `EMAIL_PASS` | Password for email account | String | None |
| `EMAIL_HOST` | SMTP server hostname | String | None |
| `OTP_EMAIL_USER` | Email account for OTP retrieval | String | None |
| `OTP_EMAIL_PASS` | Password for OTP email account | String | None |

### Optional Environment Variables

These variables are optional and have default values:

| Variable | Description | Format | Default |
|----------|-------------|--------|---------|
| `NODE_ENV` | Node environment | `development`, `production`, or `test` | `development` |
| `PORT` | Server port | Integer | `5000` |
| `LOG_LEVEL` | Logging level | `error`, `warn`, `info`, `debug`, or `trace` | `info` |
| `EMAIL_PORT` | SMTP server port | Integer | `587` |
| `DOWNLOAD_DIR` | Directory for downloaded reports | Path | `./downloads` |
| `OTP_PATTERN` | Regex pattern for OTP extraction | Regex string | `OTP is: (\\d{6})` |
| `OTP_SUBJECT` | Subject line for OTP emails | String | `Your OTP Code` |
| `HEALTH_CHECK_INTERVAL` | Health check interval in minutes | Integer | `15` |
| `ADMIN_EMAILS` | Comma-separated list of admin emails | String | None |

### Security-Related Environment Variables

These variables are related to security and have special validation rules:

| Variable | Description | Format | Default |
|----------|-------------|--------|---------|
| `ENCRYPTION_KEY` | Key for AES-256-GCM encryption | 32-byte (64 hex chars) string | `default-dev-key-should-change-in-production` (not secure for production) |
| `SECURITY_AUDIT_LEVEL` | Security audit logging level | `error`, `warn`, `info`, `debug` | `info` |
| `SENDGRID_API_KEY` | API key for SendGrid | String | None |

### CRM Platform Credentials

These variables are required for specific CRM platforms:

| Variable | Description | Format | Default |
|----------|-------------|--------|---------|
| `VIN_SOLUTIONS_USERNAME` | VinSolutions username | String | None |
| `VIN_SOLUTIONS_PASSWORD` | VinSolutions password | String | None |
| `VAUTO_USERNAME` | VAUTO username | String | None |
| `VAUTO_PASSWORD` | VAUTO password | String | None |

## Validation Rules

The application validates configuration values using Zod schemas. The validation rules include:

1. **Required Variables**: Checks that all required variables are set
2. **Type Validation**: Ensures values have the correct type (string, number, boolean, etc.)
3. **Format Validation**: Validates the format of certain variables (email, URL, etc.)
4. **Default Values**: Warns if default values are used in production
5. **Refinement Rules**: Applies additional validation rules to certain values
6. **Production Checks**: Applies stricter validation in production

### Validation Behavior

- In **development** mode, missing optional variables use defaults and warnings are logged
- In **production** mode, missing required variables or using default values for sensitive data causes the application to exit
- In **test** mode, default test values are used for most variables

### Schema Validation

The configuration system uses Zod schemas to validate configuration values. For example:

```typescript
// Database configuration schema
export const DatabaseConfigSchema = z.object({
  url: z.string().url().optional(),
  host: z.string().optional(),
  port: z.coerce.number().optional(),
  user: z.string().optional(),
  password: z.string().optional(),
  database: z.string().optional(),
  ssl: z.boolean().default(false),
  poolSize: z.coerce.number().min(1).default(10),
  connectionTimeout: z.coerce.number().min(1000).default(30000),
}).refine(
  (data) => data.url || (data.host && data.user && data.database),
  {
    message: "Either 'url' or 'host', 'user', and 'database' must be provided",
    path: ['url'],
  }
);
```

## Configuration Files

In addition to environment variables, AgentFlow uses several configuration files:

### `configs/multi-vendor.json`

Configures vendor-specific email patterns and data extraction rules:

```json
{
  "vendors": {
    "VinSolutions": {
      "emailPatterns": {
        "fromAddresses": ["reports@vinsolutions.com"],
        "subjectPatterns": ["Daily Report"],
        "attachmentTypes": ["csv", "xlsx"]
      },
      "extractorConfig": {
        "type": "csv",
        "dateColumn": "Date",
        "keyColumns": ["Customer", "Vehicle"]
      }
    }
  }
}
```

### `configs/platforms.json`

Configures browser automation steps for each platform:

```json
{
  "VinSolutions": {
    "baseUrl": "https://crm.vinsolutions.com/login",
    "hasOTP": true,
    "loginSteps": [
      { "action": "goto", "args": ["https://crm.vinsolutions.com/login"] },
      { "action": "fill", "selector": "#username", "value": "{{VIN_SOLUTIONS_USERNAME}}" }
    ]
  }
}
```

## Setting Up Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` to set your actual values:
   ```bash
   nano .env
   ```

3. For production, ensure all required variables are set and no default values are used for sensitive data.

4. The configuration is automatically validated when the application starts. If there are any validation errors, they will be logged and the application will exit in production mode.

5. You can also manually validate the configuration by importing it:
   ```typescript
   import config from './src/config/index.js';
   console.log('Configuration loaded successfully:', config.env);
   ```

## Configuration Best Practices

1. **Never commit sensitive values** to version control
2. **Use different values** for development, testing, and production
3. **Rotate API keys** periodically
4. **Use environment-specific validation** to catch configuration issues early
5. **Document all configuration changes** in your team's knowledge base
6. **Use the type-safe configuration system** instead of accessing `process.env` directly
7. **Add new configuration options** to the appropriate schema in `src/config/schema.ts`
8. **Provide sensible defaults** for optional configuration values
9. **Use refinement rules** for complex validation requirements
10. **Keep configuration organized** by category (database, email, security, etc.)

## Troubleshooting Configuration Issues

### Configuration Validation Errors

If the application fails to start with configuration validation errors:

1. Check the error message to identify which configuration values failed validation
2. Verify that all required variables are set in your `.env` file
3. Ensure that values have the correct format (e.g., valid URLs, email addresses, etc.)
4. Check for type mismatches (e.g., string vs. number)

### Missing Environment Variables

If the application fails to start with an error about missing environment variables:

1. Check that all required variables are set in your `.env` file
2. Verify that the `.env` file is in the correct location (project root)
3. Try setting the variables directly in your shell:
   ```bash
   export DATABASE_URL=postgresql://user:password@localhost:5432/dbname
   ```

### Default Values in Production

If the application exits with an error about default values in production:

1. Replace all default values with actual production values
2. Pay special attention to `ENCRYPTION_KEY` and API keys
3. Use a secure method to generate the encryption key:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

### Database Connection Issues

If the application fails to connect to the database:

1. Verify that the `DATABASE_URL` is correct
2. Check that the database server is running
3. Ensure that the database user has the necessary permissions
4. Test the connection manually:
   ```bash
   psql "postgresql://user:password@localhost:5432/dbname"
   ```

### Schema Validation Issues

If you're adding new configuration options and encountering validation errors:

1. Check that the schema in `src/config/schema.ts` matches your expectations
2. Ensure that refinement rules are not too restrictive
3. Verify that default values are valid according to the schema
4. Add appropriate type coercion for numeric values (e.g., `z.coerce.number()` instead of `z.number()`)
