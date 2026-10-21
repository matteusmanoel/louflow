import { defineConfig } from 'vitest/config';

const raiz = import.meta.dirname;

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\/(.*)$/, replacement: `${raiz}/$1` },
      { find: 'server-only', replacement: `${raiz}/tests/stubs/vazio.ts` },
    ],
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'features/**/*.test.ts', 'lib/**/*.test.ts'],
    globalSetup: ['tests/setup-global.ts'],
    setupFiles: ['tests/setup-env.ts'],
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
