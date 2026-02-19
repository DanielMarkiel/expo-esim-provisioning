/** @type {import('jest').Config} */
module.exports = {
  ...require('expo-module-scripts/jest-preset-plugin.js'),
  transformIgnorePatterns: ['/node_modules/(?!(react-native|@react-native|@react-native-community|expo|@expo)/)'],
  globals: {
    __DEV__: true,
  },
};
