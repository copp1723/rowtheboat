#!/bin/bash
set -e

echo "Fixing logger imports in TypeScript files..."

# Find all TypeScript files
find src -name "*.ts" | while read -r file; do
  # Fix logger imports with .js.js extension
  sed -i '' -E 's/from ['\''"]([^'\''"]*)\/logger\.js\.js['\''"]/from '\''\1\/logger.js'\''/g' "$file"
  
  # Fix other imports with .js.js extension
  sed -i '' -E 's/from ['\''"]([^'\''"]*)\.js\.js['\''"]/from '\''\1.js'\''/g' "$file"
  
  echo "Processed $file"
done

echo "Done fixing logger imports."
