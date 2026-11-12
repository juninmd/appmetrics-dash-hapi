import json from '@eslint/json';
import js from '@eslint/js';

export default [
  {
    files: ['**/*.json'],
    language: 'json/json',
    plugins: { json },
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2018,
      sourceType: 'commonjs',
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      strict: ['error', 'safe'],
      eqeqeq: ['error', 'always'],
      'no-var': 'warn',
      'prefer-const': 'warn',
      'no-undef': 'error',
      semi: ['error', 'always'],
      quotes: ['error', 'single', { avoidEscape: true }],
      indent: ['warn', 4, { SwitchCase: 1 }],
      'comma-dangle': ['error', 'never'],
      'no-trailing-spaces': 'error',
      'eol-last': ['error', 'always'],
    },
  },
];
