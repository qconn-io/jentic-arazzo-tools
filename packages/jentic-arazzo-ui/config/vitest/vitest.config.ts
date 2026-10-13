import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['test/**/*.test.{ts,tsx}'],
    exclude: ['test/mocha-bootstrap.ts'],
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    passWithNoTests: false,
  },
});
