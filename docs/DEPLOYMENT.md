# Deployment Guide

This document describes the deployment process for the Row The Boat application, including staging and production environments.

## Table of Contents

1. [Environment Overview](#environment-overview)
2. [Deployment Process](#deployment-process)
3. [Staging Environment](#staging-environment)
4. [Production Environment](#production-environment)
5. [Rollback Procedure](#rollback-procedure)
6. [Monitoring After Deployment](#monitoring-after-deployment)
7. [Troubleshooting](#troubleshooting)

## Environment Overview

The application uses the following environments:

- **Development**: Local development environment
- **Staging**: Pre-production environment for testing
- **Production**: Live environment for end users

## Deployment Process

The general deployment process follows these steps:

1. Code changes are made in feature branches
2. Changes are merged to the `staging` branch
3. The `staging` branch is deployed to the staging environment
4. Testing is performed in the staging environment
5. The `staging` branch is merged to `main`
6. The `main` branch is deployed to production

## Staging Environment

The staging environment is used to test changes before they are deployed to production. It should be as similar to production as possible.

### Deploying to Staging

To deploy to the staging environment:

```bash
# Make sure you're on the staging branch
git checkout staging

# Run the staging deployment script
./deploy-staging.sh
```

The deployment script will:

1. Verify you're on the staging branch
2. Pull the latest changes
3. Install dependencies
4. Run type checking
5. Run tests
6. Build the application
7. Run database migrations
8. Deploy to the staging environment

### Verifying Staging Deployment

After deploying to staging, you should:

1. Verify the application is running correctly
2. Run manual tests of key workflows
3. Monitor logs for any errors
4. Check that all services are operational

### Staging Environment Variables

The staging environment requires the following environment variables:

```
NODE_ENV=staging
DATABASE_URL=<staging-database-url>
REDIS_URL=<staging-redis-url>
JWT_SECRET=<staging-jwt-secret>
ENCRYPTION_KEY=<staging-encryption-key>
```

See [Environment Variables Documentation](ENVIRONMENT_VARIABLES.md) for a complete list.

## Production Environment

The production environment is the live environment used by end users.

### Deploying to Production

To deploy to the production environment:

1. Merge the `staging` branch to `main`:

```bash
git checkout main
git merge staging
git push origin main
```

2. Run the production deployment script:

```bash
./deploy-production.sh
```

### Production Deployment Checklist

Before deploying to production:

- [ ] All tests pass in the staging environment
- [ ] Manual testing has been performed in staging
- [ ] No critical or blocking issues have been observed
- [ ] Database migrations have been tested
- [ ] Rollback procedure has been reviewed
- [ ] Stakeholders have been informed of the deployment

### Production Environment Variables

See [Environment Variables Documentation](ENVIRONMENT_VARIABLES.md) for a complete list of required environment variables.

## Rollback Procedure

If issues are encountered after deployment, follow these steps to rollback:

1. Identify the last stable version
2. Checkout the corresponding commit or tag
3. Run the deployment script for that version
4. Verify the rollback was successful

## Monitoring After Deployment

After deployment, monitor the following:

- Application logs for errors
- Database performance
- API response times
- Memory and CPU usage
- Error tracking system (Sentry)

## Troubleshooting

### Common Deployment Issues

1. **Database Migration Failures**
   - Check migration logs
   - Verify database connection
   - Run migrations manually

2. **Application Startup Failures**
   - Check application logs
   - Verify environment variables
   - Check for missing dependencies

3. **Performance Issues**
   - Check database query performance
   - Monitor memory usage
   - Check for slow API endpoints

For more troubleshooting information, see the [Troubleshooting Guide](TROUBLESHOOTING.md).
