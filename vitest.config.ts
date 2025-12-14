import { defineConfig } from 'vitest/config';
import path from 'path';
import dotenv from 'dotenv';

// Load env for vitest runs, preferring .env.local when present
dotenv.config({ path: path.join(__dirname, '.env.local') });
dotenv.config({ path: path.join(__dirname, '.env') });

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: [path.join(__dirname, '__tests__', 'setup-env.ts')],
  },
  resolve: {
    alias: {
      'react-native': path.resolve(__dirname, '__tests__/mocks/react-native.ts'),
      'react-native-url-polyfill/auto': path.resolve(
        __dirname,
        '__tests__/mocks/react-native-url-polyfill-auto.ts',
      ),
    },
  },
});
