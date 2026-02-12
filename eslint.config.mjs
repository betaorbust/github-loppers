import js from '@eslint/js';
import globals from 'globals';
import tsEslintPlugin from '@typescript-eslint/eslint-plugin';
import tsEslintParser from '@typescript-eslint/parser';

export default [
    {
        ignores: ['dist/**', 'node_modules/**']
    },
    {
        files: ['**/*.ts'],
        languageOptions: {
            parser: tsEslintParser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module'
            },
            globals: {
                ...globals.node
            }
        },
        plugins: {
            '@typescript-eslint': tsEslintPlugin
        },
        rules: {
            ...js.configs.recommended.rules,
            ...tsEslintPlugin.configs.recommended.rules,
            'no-console': 'off'
        }
    },
    {
        files: ['**/*.mjs', '**/*.js'],
        languageOptions: {
            globals: {
                ...globals.node
            }
        },
        rules: {
            ...js.configs.recommended.rules,
            'no-console': 'off'
        }
    }
];
