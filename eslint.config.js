// ESLint v9+ config migration for TypeScript
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  js.config({
    files: ['**/*.js', '**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {},
  }),
  tseslint.config({
    files: ['**/*.ts'],
    rules: {},
  }),
];
