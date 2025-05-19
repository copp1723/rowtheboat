#!/bin/bash
set -e

echo "Fixing error function usage in userCredentialService.ts..."

# Fix error function usage
sed -i '' -E 's/error\(/error(\"/g' src/features/auth/services/userCredentialService.ts

echo "Done fixing error function usage."
