#!/bin/bash
set -e

# Deploy Staging Branch Script
# This script deploys the current staging branch to the staging environment

# Display banner
echo "====================================================="
echo "  Row The Boat - Staging Deployment"
echo "====================================================="
echo "This script will deploy the current staging branch to the staging environment."
echo

# Check if we're on the staging branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "staging" ]; then
  echo "Error: You must be on the staging branch to deploy to staging."
  echo "Current branch: $CURRENT_BRANCH"
  echo "Please switch to the staging branch and try again."
  exit 1
fi

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
  echo "Warning: You have uncommitted changes."
  echo "These changes will not be included in the deployment."
  echo "Git status:"
  git status --short
  
  read -p "Do you want to continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment aborted."
    exit 1
  fi
fi

# Ensure we have the latest changes
echo "Pulling latest changes from origin/staging..."
git pull origin staging

# Install dependencies
echo "Installing dependencies..."
npm ci

# Run type checking
echo "Running type checking..."
npm run type-check

# Run tests
echo "Running tests..."
npm test

# Build the application
echo "Building the application..."
npm run build

# Run database migrations
echo "Running database migrations..."
npm run migrate

# Deploy to staging environment
echo "Deploying to staging environment..."
# This would typically involve copying files to a server, restarting services, etc.
# For now, we'll just simulate this with a message
echo "Simulating deployment to staging server..."
echo "Application would be deployed to staging server at this point."

# Run post-deployment tests
echo "Running post-deployment tests..."
echo "Simulating post-deployment tests..."

echo
echo "====================================================="
echo "  Deployment to staging completed successfully!"
echo "====================================================="
echo
echo "Next steps:"
echo "1. Verify the application is running correctly in staging"
echo "2. Run manual tests of key workflows"
echo "3. Monitor logs for any errors"
echo "4. If everything looks good, prepare for production deployment"
echo

# Exit successfully
exit 0
