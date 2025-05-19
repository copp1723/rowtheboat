#!/bin/bash
set -e

echo "Fixing logger usage in shared/db.ts..."

# Replace logger.info with info
sed -i '' -E 's/logger\.info/info/g' src/shared/db.ts

echo "Done fixing logger usage in shared/db.ts."
