# Secure Local Development Guide

This guide provides instructions for setting up a secure local development environment for the AgentFlow application. Following these practices will help ensure that your development environment is as secure as production.

## Table of Contents

1. [Environment Variables](#environment-variables)
2. [API Key Security](#api-key-security)
3. [Authentication in Development](#authentication-in-development)
4. [Rate Limiting](#rate-limiting)
5. [Security Testing](#security-testing)

## Environment Variables

### Required Security Variables

The following environment variables should be set in your local development environment:

```bash
# Required for secure encryption
ENCRYPTION_KEY=<32-byte-random-key>

# Required for secure development authentication
DEV_API_KEY=<random-api-key-for-local-dev>

# Optional but recommended for JWT authentication
JWT_SECRET=<32-character-or-longer-random-string>

# Optional but recommended for session management
SESSION_SECRET=<32-character-or-longer-random-string>
```

### Generating Secure Keys

Use the following commands to generate secure random keys:

```bash
# Generate a 32-byte random key for ENCRYPTION_KEY (as hex)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate a random API key for DEV_API_KEY
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"

# Generate a random string for JWT_SECRET and SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## API Key Security

### Development Mode API Key Authentication

In development mode, the application now requires an API key for authentication. This simulates the production authentication flow and ensures that your local development environment is secure.

To authenticate API requests in development:

1. Set the `DEV_API_KEY` environment variable to a secure random value
2. Include the API key in your requests using the `X-Dev-API-Key` header:

```javascript
// Example fetch request with development API key
fetch('/api/keys', {
  headers: {
    'X-Dev-API-Key': process.env.DEV_API_KEY,
    'Content-Type': 'application/json'
  }
})
```

### Testing Admin Access

To test admin-only endpoints in development:

1. Set the `DEV_API_KEY` environment variable
2. Include both the API key and admin header in your requests:

```javascript
// Example fetch request with development API key and admin access
fetch('/api/admin/users', {
  headers: {
    'X-Dev-API-Key': process.env.DEV_API_KEY,
    'X-Dev-Admin': 'true',
    'Content-Type': 'application/json'
  }
})
```

## Authentication in Development

The application now uses a more secure authentication system in development mode:

1. If `DEV_API_KEY` is set, requests must include this key in the `X-Dev-API-Key` header
2. If `DEV_API_KEY` is not set, a warning is logged and a simulated user is created (less secure)
3. For admin access, include the `X-Dev-Admin: true` header

This approach provides a more realistic simulation of production authentication while maintaining development convenience.

## Rate Limiting

Rate limiting is now applied to all API endpoints, including in development mode. This helps prevent accidental abuse and simulates production conditions.

### API Key Endpoints

API key management endpoints have particularly aggressive rate limiting:

- General API key operations: 3 requests per minute
- API key creation: 1 request per 5 minutes
- Suspicious activity detection: 5 requests per hour before blocking

### Testing Rate Limiting

To test how your application handles rate limiting:

1. Make multiple rapid requests to an endpoint
2. Observe the `429 Too Many Requests` response
3. Check the response headers for rate limit information:
   - `X-RateLimit-Limit`: Maximum requests allowed
   - `X-RateLimit-Remaining`: Requests remaining in the current window
   - `X-RateLimit-Reset`: Time until the rate limit resets (in seconds)

## Security Testing

### Running Security Tests

The application includes security tests that verify the encryption, authentication, and rate limiting systems. Run these tests regularly:

```bash
npm run test:security
```

### Manual Security Testing

Perform these manual security checks regularly:

1. Verify that API key endpoints require authentication
2. Test rate limiting by making multiple rapid requests
3. Verify that suspicious activity detection works by making unusual requests
4. Check that encryption is properly configured

### Security Logging

Security-related events are now logged to help identify potential issues:

- Authentication failures
- Rate limit breaches
- Encryption key issues
- Suspicious activity

Check the logs regularly for security warnings and errors.

## Conclusion

Following these secure development practices will help ensure that your local environment is as secure as possible and that security issues are caught early in the development process.

For any questions or concerns about security, please contact the security team.
