import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/__tests__/**/*.test.ts'],
    testTimeout: 30000,
    // Add WASM support
    server: {
      deps: {
        // Allow loading WASM files from node_modules
        inline: [/@wgb5445\/aptos-dynamic-transaction-composer/]
      }
    }
  },
  // Allow import handling for .wasm files
  optimizeDeps: {
    exclude: ['@wgb5445/aptos-dynamic-transaction-composer']
  }
});