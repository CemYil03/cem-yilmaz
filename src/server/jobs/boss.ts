import { PgBoss, fromDrizzle } from 'pg-boss';
import { sql } from 'drizzle-orm';
import type { QueuedJobDefinition } from './types';
import type { DatabaseTransaction } from '../db';
import { environmentVariables } from '../env/environmentVariablesCreate';

const globalRef = globalThis as unknown as { __pgBoss?: PgBoss; __pgBossStartPromise?: Promise<void> };

export async function ensureBossStarted(): Promise<PgBoss> {
    if (!globalRef.__pgBoss) {
        globalRef.__pgBoss = new PgBoss(environmentVariables.databaseUrl);
        globalRef.__pgBoss.on('error', (error) => {
            console.error('[pg-boss]', error.message);
        });
    }

    if (!globalRef.__pgBossStartPromise) {
        globalRef.__pgBossStartPromise = globalRef.__pgBoss.start().then(() => undefined);
    }

    await globalRef.__pgBossStartPromise;
    return globalRef.__pgBoss;
}

export async function jobEnqueue<TData>(
    definition: QueuedJobDefinition<TData>,
    data: TData,
    options?: { startAfter?: Date | string | number; transaction?: DatabaseTransaction },
): Promise<string | null> {
    const boss = await ensureBossStarted();
    return boss.send(definition.name, data as object, {
        startAfter: options?.startAfter,
        db: options?.transaction ? fromDrizzle(options.transaction, sql) : undefined,
    });
}
