#!/bin/bash
set -e

echo "Fixing duplicate .js.js extensions in imports..."

# Find all TypeScript files
find src -name "*.ts" | while read -r file; do
  # Replace .js.js with .js in imports
  sed -i '' -E 's/from ['\''"]([^'\''"]*)\.js\.js['\''"]/from '\''\1.js'\''/g' "$file"
  
  echo "Processed $file"
done

echo "Done fixing duplicate extensions."
