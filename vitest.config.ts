import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    name: 'Pulse Backend',
    include: ['packages/github/src/**/*.test.ts', 'packages/jira/src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['html', 'lcov', 'json'],
      clean: true,
      cleanOnRerun: true,
      reportOnFailure: true,
      include: ['packages/github/src/**/', 'packages/jira/src/**/'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/test/**'],
    },
  },
});
