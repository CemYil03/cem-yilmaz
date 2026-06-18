import type { RecurringJobDefinition } from '../types';

export const staleSessionsCleanup: RecurringJobDefinition = {
    kind: 'recurring',
    name: 'stale-sessions-cleanup',
    cron: '* * * * *',
    handler: async ({ serverRuntime }) => {
        serverRuntime.log.info('Running stale sessions cleanup');
        // TODO: implement cleanup logic
    },
    options: {
        retryLimit: 2,
        expireInSeconds: 300,
    },
};
