import { createFileRoute } from '@tanstack/react-router';

import { environmentVariables } from '../../server/env/environmentVariablesCreate';

export const Route = createFileRoute('/api/health')({
    server: {
        handlers: {
            GET: () =>
                new Response(JSON.stringify({ status: 'ok', version: environmentVariables.buildSha }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                }),
        },
    },
});
