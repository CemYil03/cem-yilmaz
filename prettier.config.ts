import type { Config } from 'prettier';

const config: Config = {
    singleQuote: true,
    trailingComma: 'all',
    tabWidth: 4,
    printWidth: 140,
    overrides: [
        {
            files: ['*.yaml', '*.yml'],
            options: {
                tabWidth: 2,
            },
        },
        {
            files: ['.vscode/*.json'],
            options: {
                parser: 'jsonc',
            },
        },
        {
            files: ['*.md'],
            options: {
                parser: 'markdown',
                tabWidth: 2,
                proseWrap: 'always',
            },
        },
    ],
};

export default config;
