#!/bin/bash
set -e

echo "Fixing import paths in TypeScript files..."

# Find all TypeScript files
find src -name "*.ts" | while read -r file; do
  # Fix imports with missing .js extension
  sed -i '' -E 's/from ['\''"]([^'\''"]*)['\''"]/from '\''\1.js'\''/g' "$file"
  
  # Fix imports with double .js.js extension
  sed -i '' -E 's/from ['\''"]([^'\''"]*)\.js\.js['\''"]/from '\''\1.js'\''/g' "$file"
  
  # Fix imports with triple .js.js.js extension
  sed -i '' -E 's/from ['\''"]([^'\''"]*)\.js\.js\.js['\''"]/from '\''\1.js'\''/g' "$file"
  
  # Fix dynamic imports
  sed -i '' -E 's/import\(['\''"]([^'\''"]*)['\''"]\)/import('\''\1.js'\'')/g' "$file"
  
  # Fix dynamic imports with .js already
  sed -i '' -E 's/import\(['\''"]([^'\''"]*)\.js\.js['\''"]\)/import('\''\1.js'\'')/g' "$file"
  
  echo "Processed $file"
done

echo "Done fixing import paths."
