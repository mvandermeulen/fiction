// @ts-check
import antfu from '@antfu/eslint-config'

export default antfu(

  {
    // typescript: {
    //   tsconfigPath: './tsconfig.json',
    //   parserOptions: {
    //     project: './tsconfig.json',
    //     extraFileExtensions: ['.vue', '.json'],
    //     tsconfigRootDir: __dirname,
    //   },
    // },
    vue: true,
    rules: {
      'no-alert': 'off',
      'no-undef-init': 'off',
      'eslint-comments/no-unlimited-disable': 'off',
      'no-async-promise-executor': 'off',
      'unused-imports/no-unused-vars': 'warn',
      'jsonc/sort-keys': 'off',
      'no-irregular-whitespace': 'warn',
      'import/no-cycle': ['error', { maxDepth: 2 }],
      'max-statements-per-line': ['error', { max: 2 }],
      'eqeqeq': 'warn',
      'vue/eqeqeq': 'warn',
      'vue/no-unused-refs': 'warn',
      'vue/max-attributes-per-line': ['error', { singleline: { max: 5 }, multiline: { max: 1 } }],
      'vue/no-v-text-v-html-on-component': 'off',
      'vue/no-mutating-props': ['error', { shallowOnly: true }],
      'vue/no-ref-as-operand': 'error',
      'ts/consistent-type-definitions': 'off',
      'ts/strict-boolean-expressions': 'off',
      'ts/no-unsafe-assignment': 'off',
      'ts/no-throw-literal': 'off',
      'ts/no-unsafe-argument': 'off',
      'ts/no-unsafe-call': 'off',
      'ts/no-unsafe-return': 'off',
      'ts/no-unsafe-member-access': 'off',
      'ts/no-misused-promises': 'off',
      'style/max-statements-per-line': ['error', { max: 2 }],
      'regexp/no-super-linear-backtracking': 'warn',
      'regexp/no-unused-capturing-group': 'warn',
      'unicorn/consistent-function-scoping': 'off',
    },
  },
  { ignores: [
    '**/.ref/**/*',
    '**/.ref-*/**/*',
    '**/__*',
    'node_modules',
    'dist/',
    'cache/',
    '**/.fiction/**',
    '.pnpmfile.cjs',
    'docs/**/*.md',
  ] },
)
