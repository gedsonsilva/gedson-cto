import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'jsdom', setupFiles: ['./tests/setup.ts'], include: ['tests/**/*.test.tsx'], reporters: ['default', 'junit'], outputFile: { junit: 'test-results/website.xml' }, restoreMocks: true }, oxc: { jsx: { runtime: 'automatic' } } });
