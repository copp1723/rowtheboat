#!/bin/bash
set -e

echo "Fixing Node.js built-in module imports..."

# Find all TypeScript files
find src -name "*.ts" | while read -r file; do
  # Fix Node.js built-in module imports
  sed -i '' -E 's/from ['\''"]fs\.js['\''"]/from '\''fs'\''/g' "$file"
  sed -i '' -E 's/from ['\''"]path\.js['\''"]/from '\''path'\''/g' "$file"
  sed -i '' -E 's/from ['\''"]crypto\.js['\''"]/from '\''crypto'\''/g' "$file"
  sed -i '' -E 's/from ['\''"]http\.js['\''"]/from '\''http'\''/g' "$file"
  sed -i '' -E 's/from ['\''"]dotenv\.js['\''"]/from '\''dotenv'\''/g' "$file"
  sed -i '' -E 's/from ['\''"]zod\.js['\''"]/from '\''zod'\''/g' "$file"
  sed -i '' -E 's/from ['\''"]express\.js['\''"]/from '\''express'\''/g' "$file"
  sed -i '' -E 's/from ['\''"]uuid\.js['\''"]/from '\''uuid'\''/g' "$file"
  sed -i '' -E 's/from ['\''"]yaml\.js['\''"]/from '\''yaml'\''/g' "$file"
  sed -i '' -E 's/from ['\''"]openai\.js['\''"]/from '\''openai'\''/g' "$file"
  sed -i '' -E 's/from ['\''"]typeorm\.js['\''"]/from '\''typeorm'\''/g' "$file"
  sed -i '' -E 's/from ['\''"]drizzle-orm\.js['\''"]/from '\''drizzle-orm'\''/g' "$file"
  sed -i '' -E 's/from ['\''"]drizzle-orm\/pg-core\.js['\''"]/from '\''drizzle-orm\/pg-core'\''/g' "$file"
  sed -i '' -E 's/from ['\''"]pino\.js['\''"]/from '\''pino'\''/g' "$file"
  sed -i '' -E 's/from ['\''"]pdf-parse\.js['\''"]/from '\''pdf-parse'\''/g' "$file"
  sed -i '' -E 's/from ['\''"]react\.js['\''"]/from '\''react'\''/g' "$file"
  sed -i '' -E 's/from ['\''"]vitest\.js['\''"]/from '\''vitest'\''/g' "$file"
  sed -i '' -E 's/from ['\''"]postgres\.js['\''"]/from '\''postgres'\''/g' "$file"
  
  # Fix dynamic imports
  sed -i '' -E 's/import\(['\''"]fs\.js['\''"]\)/import('\''fs'\'')/g' "$file"
  sed -i '' -E 's/import\(['\''"]path\.js['\''"]\)/import('\''path'\'')/g' "$file"
  sed -i '' -E 's/import\(['\''"]http\.js['\''"]\)/import('\''http'\'')/g' "$file"
  
  echo "Processed $file"
done

echo "Done fixing Node.js built-in module imports."
