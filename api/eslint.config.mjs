// @ts-check
import eslint from '@eslint/js';
import jest from 'eslint-plugin-jest';
import tseslint from 'typescript-eslint';

const localDateMethods = [
  'getFullYear', 'getMonth', 'getDate', 'getDay', 'getHours', 'getMinutes',
  'getSeconds', 'getMilliseconds', 'setFullYear', 'setMonth', 'setDate',
  'setHours', 'setMinutes', 'setSeconds', 'setMilliseconds',
  'toLocaleString', 'toLocaleDateString', 'toLocaleTimeString',
];

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'src/generated/**', 'prisma/migrations/**'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // Async mistakes: an unawaited DB call or webhook handler fails silently
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      eqeqeq: ['error', 'always'],
      // AGENTS.md: never print secrets. Use the Nest Logger instead of console
      'no-console': 'error',
      // AGENTS.md: timestamps in UTC. Local-time Date methods are banned
      'no-restricted-properties': [
        'error',
        ...localDateMethods.map((property) => ({
          property,
          message: 'Use UTC (getUTC*/setUTC*/toISOString). Timestamps are UTC.',
        })),
      ],
      // AGENTS.md: money in integer cents. No floats for amounts
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.name='parseFloat']",
          message: 'Money is integer cents. Do not parse floats.',
        },
      ],
    },
  },
  {
    // Config files are outside the TypeScript project
    files: ['**/*.mjs'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    // Architecture: controllers go through services, never the database
    files: ['**/*.controller.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@prisma/*', '**/generated/**', '**/prisma/**', '**/prisma.service*'],
              message: 'Controllers must not import Prisma. Call a service instead.',
            },
          ],
          paths: [{ name: '@prisma/client', message: 'Controllers must not import Prisma. Call a service instead.' }],
        },
      ],
    },
  },
  {
    // No skipped or focused tests
    files: ['**/*.spec.ts', '**/*.e2e-spec.ts', 'test/**/*.ts'],
    plugins: { jest },
    rules: {
      'jest/no-disabled-tests': 'error',
      'jest/no-focused-tests': 'error',
    },
  },
  {
    // Tests may use looser typing for mocks
    files: ['**/*.spec.ts', 'test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },
);
