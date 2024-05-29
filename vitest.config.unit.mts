import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.unit.test.ts'],
    coverage: {
      exclude: ['**/__tests__/**', '**/__tests_setup__/**', '**/scripts/**'],
    },
  },
});
