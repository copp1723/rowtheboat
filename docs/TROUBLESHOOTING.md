# Troubleshooting Guide

This document provides solutions for common issues you might encounter when setting up, developing, or running the Row The Boat application.

## Table of Contents

1. [Environment Setup Issues](#environment-setup-issues)
2. [Database Connection Issues](#database-connection-issues)
3. [Redis Connection Issues](#redis-connection-issues)
4. [Build and Compilation Errors](#build-and-compilation-errors)
5. [Runtime Errors](#runtime-errors)
6. [Testing Issues](#testing-issues)
7. [Authentication Issues](#authentication-issues)
8. [Email Service Issues](#email-service-issues)
9. [Performance Issues](#performance-issues)

## Environment Setup Issues

### Missing Environment Variables

**Problem:** Application fails to start with errors about missing environment variables.

**Solution:**
1. Check that you've copied `.env.example` to `.env`
2. Verify all required variables are set in your `.env` file
3. Check the [Environment Variables Documentation](ENVIRONMENT_VARIABLES.md) for required variables

```bash
# Example error
Error: Missing required environment variable: DATABASE_URL
```

### Node.js Version Mismatch

**Problem:** Errors related to unsupported JavaScript features.

**Solution:**
1. Verify you're using Node.js v16 or higher
2. Check your Node.js version with `node --version`
3. Consider using nvm to manage Node.js versions:

```bash
nvm install 16
nvm use 16
```

## Database Connection Issues

### Connection Refused

**Problem:** Application fails to connect to the database with "connection refused" errors.

**Solution:**
1. Verify PostgreSQL is running
2. Check your database connection string in `.env`
3. Ensure the database exists and the user has proper permissions

```bash
# Example error
Error: connect ECONNREFUSED 127.0.0.1:5432
```

### Authentication Failed

**Problem:** Database connection fails with authentication errors.

**Solution:**
1. Verify username and password in your connection string
2. Check that the database user exists and has the correct password
3. Ensure the user has appropriate permissions

```bash
# Example error
Error: password authentication failed for user "postgres"
```

### Missing Tables

**Problem:** Application fails with errors about missing tables.

**Solution:**
1. Run database migrations:
   ```bash
   npm run migrate
   ```
2. Check migration logs for errors
3. Verify the database schema matches the expected schema

## Redis Connection Issues

### Redis Connection Refused

**Problem:** Application fails to connect to Redis.

**Solution:**
1. Verify Redis is running
2. Check your Redis connection string in `.env`
3. Try connecting to Redis using the redis-cli:
   ```bash
   redis-cli ping
   ```

```bash
# Example error
Error: Redis connection to 127.0.0.1:6379 failed - connect ECONNREFUSED 127.0.0.1:6379
```

### Redis Authentication Failed

**Problem:** Redis connection fails with authentication errors.

**Solution:**
1. Verify the Redis password in your connection string
2. Check if Redis is configured to require authentication
3. Try connecting with the password using redis-cli:
   ```bash
   redis-cli -a your_password ping
   ```

## Build and Compilation Errors

### TypeScript Compilation Errors

**Problem:** Build fails with TypeScript errors.

**Solution:**
1. Fix the TypeScript errors reported in the console
2. Run `npm run type-check` to see all type errors
3. Check for missing type definitions or incorrect imports

```bash
# Example error
TS2322: Type 'string | undefined' is not assignable to type 'string'.
```

### Missing Dependencies

**Problem:** Build fails with errors about missing modules.

**Solution:**
1. Ensure all dependencies are installed:
   ```bash
   npm install
   ```
2. Check for outdated dependencies:
   ```bash
   npm outdated
   ```
3. Clear npm cache and reinstall:
   ```bash
   npm cache clean --force
   rm -rf node_modules
   npm install
   ```

## Runtime Errors

### Unhandled Promise Rejections

**Problem:** Application crashes with "Unhandled Promise Rejection" errors.

**Solution:**
1. Add proper error handling to async functions
2. Check the error message for specific issues
3. Add try/catch blocks around problematic code

```bash
# Example error
UnhandledPromiseRejectionWarning: Error: Request failed with status code 404
```

### Memory Leaks

**Problem:** Application memory usage grows over time.

**Solution:**
1. Check for event listeners that aren't being removed
2. Look for large objects being cached indefinitely
3. Use tools like `node --inspect` and Chrome DevTools to profile memory usage

## Testing Issues

### Tests Failing Due to Timeouts

**Problem:** Tests fail with timeout errors.

**Solution:**
1. Increase the test timeout in `vitest.config.ts`
2. Check for asynchronous operations that aren't properly awaited
3. Verify that external services used in tests are available

```bash
# Example error
Error: Test timed out in 5000ms
```

### Database Tests Failing

**Problem:** Database-related tests are failing.

**Solution:**
1. Ensure the test database is set up correctly
2. Check that migrations have been run on the test database
3. Verify that test data is being properly cleaned up between tests

### Mock/Stub Issues

**Problem:** Tests fail because mocks or stubs aren't working as expected.

**Solution:**
1. Check that you're importing the correct module to mock
2. Verify that the mock implementation matches the expected interface
3. Ensure mocks are reset between tests

## Authentication Issues

### JWT Token Issues

**Problem:** Authentication fails with JWT-related errors.

**Solution:**
1. Check that `JWT_SECRET` is set in your environment variables
2. Verify that tokens haven't expired
3. Ensure the token is being sent in the correct format (e.g., `Bearer <token>`)

```bash
# Example error
Error: jwt malformed
```

### Session Expiration

**Problem:** Users are logged out unexpectedly.

**Solution:**
1. Check the session duration in your configuration
2. Verify that Redis (if used for session storage) is working correctly
3. Check for issues with the session middleware

## Email Service Issues

### Email Sending Failures

**Problem:** Application fails to send emails.

**Solution:**
1. Verify your email service credentials in `.env`
2. Check that the email service is available
3. Look for specific error messages from the email provider

```bash
# Example error
Error: Invalid API key provided
```

### OTP Verification Issues

**Problem:** OTP verification fails.

**Solution:**
1. Check that the OTP email account is correctly configured
2. Verify that the OTP pattern regex matches the expected format
3. Ensure the OTP email is being received and processed correctly

## Performance Issues

### Slow API Responses

**Problem:** API endpoints are responding slowly.

**Solution:**
1. Check database query performance with `EXPLAIN ANALYZE`
2. Look for N+1 query problems
3. Consider adding caching for frequently accessed data
4. Monitor CPU and memory usage during high load

### High Memory Usage

**Problem:** Application uses more memory than expected.

**Solution:**
1. Check for memory leaks using profiling tools
2. Review large object caching strategies
3. Consider implementing pagination for large data sets
4. Monitor memory usage patterns over time

If you encounter an issue not covered in this guide, please check the application logs for more details and consider opening an issue on the project repository.
