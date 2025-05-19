#!/bin/bash

# This script fixes incorrect .js extensions in TypeScript imports
# It replaces imports like 'import X from './file.js';' with 'import X from './file';'

# Function to fix a single file
fix_file() {
  local file=$1
  echo "Fixing $file..."
  
  # Check if the file has any .js imports
  if grep -q "import .* from '.*\.js';" "$file" || grep -q "import .* from \".*\.js\";" "$file"; then
    # Replace .js extensions in import statements
    sed -i '' -E "s/from '(.*)\\.js';/from '\1';/g" "$file"
    sed -i '' -E "s/from \"(.*)\\.js\";/from \"\1\";/g" "$file"
    
    echo "Fixed $file"
  else
    echo "No .js imports found in $file"
  fi
}

# Find all TypeScript files in the src directory
find_ts_files() {
  find src -name "*.ts" -type f
}

# Process all TypeScript files
for file in $(find_ts_files); do
  fix_file "$file"
done

echo "All files processed"
