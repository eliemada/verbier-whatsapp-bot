import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-plugin-prettier/recommended';

export default [
    js.configs.recommended,
    prettier,
    {
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.node,
            },
        },
        rules: {
            'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            'no-console': 'off',
            'prefer-const': 'error',
            'no-var': 'error',
            'object-shorthand': 'error',
            'prefer-template': 'error',
            'prefer-arrow-callback': 'error',
            eqeqeq: ['error', 'always'],
            curly: ['error', 'multi-line'],
        },
    },
    {
        ignores: ['node_modules/', '.wwebjs_auth/', '.wwebjs_cache/'],
    },
];
