import type { QueuedJobDefinition } from '../types';

interface SignupReminderData {
    userId: string;
    email: string;
}

export const signupReminderSend: QueuedJobDefinition<SignupReminderData> = {
    kind: 'queued',
    name: 'signup-reminder-send',
    handler: async ({ data, serverRuntime }) => {
        serverRuntime.log.info(`Sending signup reminder to ${data.email}`);
        // TODO: implement reminder logic
    },
    options: {
        retryLimit: 3,
        retryDelay: 60,
        expireInSeconds: 600,
    },
};
