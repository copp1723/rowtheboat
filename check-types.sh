#!/bin/bash
set -e

echo "Running TypeScript type checking..."
npx tsc --noEmit

if [ $? -eq 0 ]; then
  echo "TypeScript type checking passed successfully!"
  exit 0
else
  echo "TypeScript type checking failed. Please fix the errors above."
  exit 1
fi
