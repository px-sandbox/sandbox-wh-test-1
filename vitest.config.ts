import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Other Vitest configurations
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      clean: true,
      reportOnFailure: true,
      include: ['packages/github/src/**/test/'],
      exclude: ['packages/jira/'],
    },
  },
});
