import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@react-native-async-storage/async-storage': path.resolve(process.cwd(), 'tests/mockAsyncStorage.ts'),
      '@': path.resolve(process.cwd(), 'src'),
    },
  },
});
