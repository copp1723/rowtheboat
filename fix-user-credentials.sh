#!/bin/bash
set -e

echo "Fixing userCredentials schema import in userCredentialService.ts..."

# Add the missing import
sed -i '' -E '9a\
import { userCredentials } from "../../../../shared/schema.js";
' src/features/auth/services/userCredentialService.ts

echo "Done fixing userCredentials schema import."
