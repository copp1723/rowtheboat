#!/bin/bash
set -e

echo "Cleaning dist directory..."
rm -rf dist

echo "Compiling TypeScript..."
npx tsc

echo "Build completed successfully!"
