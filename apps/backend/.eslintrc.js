module.exports = {
  ...require('@sitepilot/config/eslint/nestjs'),
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
};
