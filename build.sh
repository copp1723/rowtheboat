#!/bin/bash
set -e

echo "Running TypeScript type checking..."
npx tsc --noEmit

if [ $? -ne 0 ]; then
  echo "TypeScript type checking failed. Please fix the errors above."
  exit 1
fi

echo "Cleaning dist directory..."
rm -rf dist

echo "Compiling TypeScript..."
npx tsc

echo "Build completed successfully!"
