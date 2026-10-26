import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['extensions/*/tests/**/*.test.js'],
    coverage: {
      include: ['extensions/*/src/run.js'],
    },
  },
});
