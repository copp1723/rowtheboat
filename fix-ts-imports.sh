#!/bin/bash
# Find all TypeScript files in the src and frontend/src directories
# and remove .js extensions from import statements.
# Preserves extensions for actual JS files (though this script doesn't explicitly check for that,
# it relies on the assumption that .js extensions are overwhelmingly incorrect in .ts files).

find src frontend/src -type f \( -name "*.ts" -o -name "*.tsx" \) -print0 | while IFS= read -r -d $'\0' file; do
  if [ -f "$file" ]; then
    sed -i '' -E "s/from '([^']*)\.js'/from '\1'/g" "$file"
    sed -i '' -E "s/from \"([^\"]*)\.js\"/from \"\1\"/g" "$file"
  else
    echo "Warning: File not found: $file" >&2
  fi
done

echo "Done removing .js extensions from TypeScript imports."
