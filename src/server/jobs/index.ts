import type { ServerRuntime } from '../domain/ServerRuntime';
import { ensureBossStarted } from './boss';
import { jobDefinitions } from './jobDefinitions';

let workersRegistered = false;

export async function ensureJobsStarted(serverRuntime: ServerRuntime): Promise<void> {
    const boss = await ensureBossStarted();

    if (workersRegistered) return;
    workersRegistered = true;

    for (const definition of jobDefinitions) {
        await boss.createQueue(definition.name);
        await boss.work(definition.name, async (jobs) => {
            const job = jobs[0]!;
            await definition.handler({ data: job.data, serverRuntime });
        });

        if (definition.kind === 'recurring') {
            await boss.schedule(definition.name, definition.cron);
        }
    }

    process.on('SIGTERM', async () => {
        await boss.stop({ graceful: true });
    });
    process.on('SIGINT', async () => {
        await boss.stop({ graceful: true });
    });
}

export { signupReminderSend } from './handlers/signupReminderSend';
export { staleSessionsCleanup } from './handlers/staleSessionsCleanup';
