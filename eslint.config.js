import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import nextPlugin from '@next/eslint-plugin-next';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        project: './tsconfig.json',
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      globals: {
        ...globals.browser,
        React: 'readonly',
        JSX: 'readonly',
        process: 'readonly',
        // Next.js specific globals
        Image: 'readonly',
        Link: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      '@next/next': nextPlugin,
      'react-hooks': reactHooks,
    },
    rules: {
      // Next.js rules
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,

      // TypeScript rules
      'no-unused-vars': 'off', // Turn off base rule
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'off',

      // Next.js specific rules
      'react/react-in-jsx-scope': 'off',
      'jsx-a11y/anchor-is-valid': 'off',

      // Error rules (no warnings)
      'no-console': ['error', { allow: ['error', 'log'] }], // Allow console.error
      'no-debugger': 'error',
      'prefer-const': 'error',
      'no-var': 'error',

      // Formatting rules
      indent: ['error', 2],
      'comma-spacing': ['error', { before: false, after: true }],
      quotes: ['error', 'single', { avoidEscape: true }],
      semi: ['error', 'always'],
      'object-curly-spacing': ['error', 'always'],
      'array-bracket-spacing': ['error', 'never'],
      'space-in-parens': ['error', 'never'],
      'space-before-blocks': ['error', 'always'],
      'space-before-function-paren': ['error', 'never'],
      'space-infix-ops': ['error'],
      'key-spacing': ['error', { beforeColon: false, afterColon: true }],
      'brace-style': ['error', '1tbs', { allowSingleLine: true }],
      'comma-dangle': ['error', 'always-multiline'],
      'eol-last': ['error', 'always'],
      'func-call-spacing': ['error', 'never'],
      'new-cap': [
        'error',
        {
          newIsCap: true,
          capIsNew: false,
          newIsCapExceptions: [],
          capIsNewExceptions: [
            'Inter',
            'Roboto',
            'Arial',
            'Helvetica',
            'Georgia',
            'Merriweather',
          ],
        },
      ],
      'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0 }],
      'no-trailing-spaces': 'error',
      'padded-blocks': ['error', 'never'],
      // React Hooks rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    files: ['src/app/**/*.{ts,tsx}'],
    rules: {
      'import/prefer-default-export': 'off',
      'react/function-component-definition': 'off',
    },
  },
  prettier,
];
