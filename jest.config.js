/** @type {import('jest').Config} */
module.exports = {
  ...require('expo-module-scripts/jest-preset-plugin.js'),
  transformIgnorePatterns: ['/node_modules/(?!(react-native|@react-native|@react-native-community|expo|@expo)/)'],
  globals: {
    __DEV__: true,
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/__tests__/**'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
