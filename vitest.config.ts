import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.{test,spec}.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/frontend/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/frontend/**'],
    },
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 30000, // 30 seconds timeout for tests
    hookTimeout: 30000, // 30 seconds timeout for hooks
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
