// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

/** @type {import("eslint").Linter.Config} */
const config = {
  overrides: [
    {
      extends: ['plugin:@typescript-eslint/recommended-requiring-type-checking'],
      files: ['*.ts', '*.tsx'],
      parserOptions: {
        project: path.join(__dirname, 'tsconfig.json'),
      },
      rules: {
        '@typescript-eslint/no-floating-promises': 'off',
        '@typescript-eslint/no-misused-promises': 'off',
      },
    },
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: path.join(__dirname, 'tsconfig.json'),
  },
  plugins: ['@typescript-eslint', 'prettier', 'simple-import-sort'],
  extends: ['next/core-web-vitals', 'plugin:@typescript-eslint/recommended', 'prettier'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'prettier/prettier': 'warn',
    'simple-import-sort/imports': [
      'warn',
      {
        groups: [
          [
            '^react',
            '^\\u0000',
            '^node:',
            '^@?\\w',
            '^',
            '^\\.',
            '^node:.*\\u0000$',
            '^@?\\w.*\\u0000$',
            '^[^.].*\\u0000$',
            '^\\..*\\u0000$',
          ],
        ],
      },
    ],
    'simple-import-sort/exports': 'warn',
    'import/first': 'warn',
    'import/no-duplicates': 'warn',
    '@typescript-eslint/consistent-type-imports': 'warn',
    'import/consistent-type-specifier-style': ['warn', 'prefer-top-level'],
    'react-hooks/exhaustive-deps': 'off',
    '@next/next/no-img-element': 'off',
  },
  reportUnusedDisableDirectives: true,
};

module.exports = config;
