module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
  clearMocks: true,
  restoreMocks: true,
  testPathIgnorePatterns: ['/node_modules/', '/.expo/'],
  collectCoverageFrom: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}', '!**/__tests__/**'],
  coverageReporters: ['text', 'lcov', 'html'],
};
