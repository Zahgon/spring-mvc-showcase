import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // `Date.toString()` prints the default zone's short name, so the original's
    // output carries whichever zone the JVM ran in. The goldens and the
    // rendered fixtures were captured under Asia/Kolkata; pinning it here is
    // what makes them mean the same thing on any host.
    env: { TZ: 'Asia/Kolkata' },
    globals: false,
    // Three async handlers sleep for two seconds and the DeferredResult tests
    // wait on a scheduled task; Surefire imposed no per-test deadline either.
    testTimeout: 30_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      reporter: ['text-summary', 'json-summary', 'json'],
    },
  },
});
