import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
    stories: ['../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
    addons: ['@storybook/addon-docs'],
    core: {
        builder: {
            name: '@storybook/builder-vite',
            options: {
                viteConfigPath: '.storybook/vite.config.ts',
            },
        },
        disableTelemetry: true,
    },
    framework: {
        name: '@storybook/react-vite',
        options: {},
    },
};

export default config;
