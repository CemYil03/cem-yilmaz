import type { Preview } from '@storybook/react-vite';
import { TooltipProvider } from '../src/web/components/base/tooltip';
import { Provider as GraphQLClientProvider } from 'urql';
import type { ReactElement } from 'react';
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router';

import '../src/styles.css';

function createStorybookRouter(Story: () => ReactElement) {
    const rootRoute = createRootRoute();
    const indexRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/',
        component: Story,
    });

    return createRouter({
        routeTree: rootRoute.addChildren([indexRoute]),
        history: createMemoryHistory({ initialEntries: ['/'] }),
    });
}

const preview: Preview = {
    parameters: {
        controls: {
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/i,
            },
        },
    },
    decorators: [
        (Story: () => ReactElement) => {
            const router = createStorybookRouter(Story);
            return (
                <TooltipProvider>
                    <GraphQLClientProvider value={{}}>
                        <RouterProvider router={router} />
                    </GraphQLClientProvider>
                </TooltipProvider>
            );
        },
    ],
};

export default preview;
