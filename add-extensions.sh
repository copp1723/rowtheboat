#!/bin/bash
set -e

echo "Adding file extensions to imports..."

# Find all TypeScript files
find src -name "*.ts" | while read -r file; do
  # Add .js extension to relative imports
  sed -i '' -E 's/from ['\''"](\.\.[^'\''"]*)['\''"]/from '\''\1.js'\''/g' "$file"
  sed -i '' -E 's/from ['\''"](\.[^'\''"]*)['\''"]/from '\''\1.js'\''/g' "$file"
  
  echo "Processed $file"
done

echo "Done adding file extensions to imports."
