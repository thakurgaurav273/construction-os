/** @type {import("eslint").Linter.Config} */
module.exports = {
  ...require('./eslint-base'),
  rules: {
    ...require('./eslint-base').rules,
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'error',
  },
};
