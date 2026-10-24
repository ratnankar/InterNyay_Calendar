// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // `dist/*` only matches direct children; use `dist/**` to ignore the whole tree
    ignores: ['dist/**'],
  },
  {
    // React Compiler is not enabled (no babel-plugin-react-compiler in babel.config.js),
    // so these four react-hooks v6 rules check constraints that don't apply to this build.
    // Kept as warnings so they still show in review, but don't fail `npm run check`.
    rules: {
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/immutability': 'warn',
    },
  },
]);