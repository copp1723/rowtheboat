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
    
    echo "Fixed $file"
  else
    echo "No incorrect logger import found in $file"
  fi
}

# Process files one by one
fix_file "src/config/monitoring.ts"
fix_file "src/config/index.ts"
fix_file "src/config/secrets.ts"
fix_file "src/shared/middleware/rateLimiter.ts"
fix_file "src/shared/middleware/rbacMiddleware.ts"
fix_file "src/services/rbacService.ts"
fix_file "src/services/apiKeyService.ts"
fix_file "src/services/enhancedApiKeyService.ts"
fix_file "src/services/monitoringService.ts"
fix_file "src/services/performanceMonitor.ts"

echo "All files processed"
