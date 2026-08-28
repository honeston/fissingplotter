import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'node',
          include: ['test/unit/**/*.test.ts'],
          exclude: ['test/unit/clusterRecords.test.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'jsdom',
          include: ['test/unit/clusterRecords.test.ts'],
          environment: 'jsdom',
        },
      },
    ],
  },
})
