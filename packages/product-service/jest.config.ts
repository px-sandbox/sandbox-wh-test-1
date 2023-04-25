/*
 * For a detailed explanation regarding each configuration property and type check, visit:
 * https://jestjs.io/docs/configuration
 */

export default {
  preset: 'ts-jest',
  // Indicates whether the coverage information should be collected while executing the test
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/service/*.ts'],
  // An array of regexp pattern strings used to skip coverage collection
  // coveragePathIgnorePatterns: ['/node_modules/'],

  // Indicates which provider should be used to instrument code for coverage
  // coverageProvider: 'v8',
  // transform: {
  //   '\\.js': 'babel-jest',
  // },
  // transformIgnorePatterns: ['<rootDir>/src/', 'src/'],
  coverageReporters: ['json', 'lcov', 'clover', 'cobertura', 'text'],
  testMatch: ['**/*.test.ts'],
  testEnvironment: 'node',
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'test-reports',
      },
    ],
  ],
  moduleDirectories: ['node_modules', 'src'],
};
