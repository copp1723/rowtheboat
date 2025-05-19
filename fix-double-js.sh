#!/bin/bash
set -e

echo "Fixing double .js.js extensions in imports..."

# Find all TypeScript files
find src -name "*.ts" | while read -r file; do
  # Fix imports with double .js.js extension
  sed -i '' -E 's/from ['\''"]([^'\''"]*)\.js\.js['\''"]/from '\''\1.js'\''/g' "$file"
  
  echo "Processed $file"
done

echo "Done fixing double .js.js extensions."
