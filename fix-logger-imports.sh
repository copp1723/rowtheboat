#!/bin/bash

# This script fixes incorrect logger imports in TypeScript files
# It replaces 'import { logger } from '../shared/logger.js';' with
# 'import { debug, info, warn, error } from '../shared/logger';'

# Function to fix a single file
fix_file() {
  local file=$1
  echo "Fixing $file..."

  # Check if the file imports logger from shared/logger.js
  if grep -q "import { logger } from .*shared/logger.js" "$file"; then
    # Get the relative path to the logger
    local path=$(grep "import { logger } from .*shared/logger.js" "$file" | sed -E "s/import \{ logger \} from '(.*)\/logger.js';/\1/")

    # Replace the import statement
    sed -i '' -E "s/import \{ logger \} from '(.*)\/logger.js';/import { debug, info, warn, error } from '\1\/logger';/" "$file"

    # Replace logger.info with info
    sed -i '' -E "s/logger\.info\(/info\(/g" "$file"

    # Replace logger.warn with warn
    sed -i '' -E "s/logger\.warn\(/warn\(/g" "$file"

    # Replace logger.error with error
    sed -i '' -E "s/logger\.error\(/error\(/g" "$file"

    # Replace logger.debug with debug
    sed -i '' -E "s/logger\.debug\(/debug\(/g" "$file"

    echo "Fixed shared logger import in $file"
  fi

  # Check if the file imports logger from utils/logger.js
  if grep -q "import logger from .*utils/logger.js" "$file"; then
    # Replace the import statement
    sed -i '' -E "s/import logger from '(.*)utils\/logger.js';/import { debug, info, warn, error } from '\1shared\/logger';/" "$file"

    # Replace logger.info with info
    sed -i '' -E "s/logger\.info\(/info\(/g" "$file"

    # Replace logger.warn with warn
    sed -i '' -E "s/logger\.warn\(/warn\(/g" "$file"

    # Replace logger.error with error
    sed -i '' -E "s/logger\.error\(/error\(/g" "$file"

    # Replace logger.debug with debug
    sed -i '' -E "s/logger\.debug\(/debug\(/g" "$file"

    echo "Fixed utils logger import in $file"
  fi
}

# Process all TypeScript files
find src -name "*.ts" | while read -r file; do
  fix_file "$file"
done

echo "All files processed"
