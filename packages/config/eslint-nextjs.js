/** @type {import("eslint").Linter.Config} */
module.exports = {
  ...require('./eslint-base'),
  extends: [
    ...require('./eslint-base').extends,
    'next/core-web-vitals',
  ],
  rules: {
    ...require('./eslint-base').rules,
    'react/no-unescaped-entities': 'off',
    '@next/next/no-html-link-for-pages': 'off',
  },
};
