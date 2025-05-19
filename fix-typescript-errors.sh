#!/bin/bash
set -e

echo "Starting TypeScript error fixes..."

# Step 1: Update logger imports
echo "Step 1: Updating logger imports..."
./fix-logger-imports.sh

# Step 2: Add file extensions to imports
echo "Step 2: Adding file extensions to imports..."
./add-extensions.sh

# Step 3: Create stub implementations
echo "Step 3: Creating stub implementations..."
./create-stubs.sh

# Step 4: Run type checking
echo "Step 4: Running type checking..."
./check-types.sh || true

echo "TypeScript error fixes completed."
echo "There may still be some errors to fix manually."
echo "Run './check-types.sh' to see remaining errors."
