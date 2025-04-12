/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  // preset: 'ts-jest', // We'll define transform explicitly instead
  testEnvironment: 'node',
  transform: {
    // Use ts-jest for .ts files (and .tsx if you had them)
    '^.+\\.tsx?$': ['ts-jest', {
      // ts-jest configuration options can go here if needed,
      // e.g., specifying tsconfig:
      // tsconfig: 'tsconfig.json'
    }],
  },
  // Optional: specify test file pattern if needed
  // testMatch: [
  //   '**/tests/**/*.test.ts'
  // ],
};
