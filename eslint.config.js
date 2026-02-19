const universe = require('eslint-config-universe/flat/native');
const universeWeb = require('eslint-config-universe/flat/web');

module.exports = [
  ...universe,
  ...universeWeb,
  {
    ignores: ['build/**'],
  },
];
