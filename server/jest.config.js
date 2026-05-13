module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/__tests__/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/', '/__tests__/setup/'],
  globalSetup: '<rootDir>/__tests__/setup/global-setup.js',
  setupFiles: ['<rootDir>/__tests__/setup/env.js'],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup/jest.setup.js'],
  testTimeout: 30000,
  maxWorkers: 1,
  forceExit: true,
};
