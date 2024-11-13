import js from '@eslint/js';
import globals from 'globals';

export default [
    {
        languageOptions: {
            globals: {
                ...globals.node
            }
        }
    },
    js.configs.recommended,
    {
        rules: {
            'no-console': 'off'
        }
    }
];
