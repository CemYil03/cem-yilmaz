import { eq } from 'drizzle-orm';
import { itemServiceEntries } from '../db/schema';
import type { ItemServiceEntryCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationItemServiceEntryUpsertArgs, GqlSItemServiceEntry, GqlSSession } from '../graphql/generated';
import { toGqlItemServiceEntry } from '../mappers/toGqlItemServiceEntry';

// Create or update a service entry row. `serviceEntryId` set → update;
// absent → insert.
export async function itemServiceEntryUpsert(
    userId: string,
    args: GqlSAdminMutationItemServiceEntryUpsertArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSItemServiceEntry> {
    const { input } = args;
    const now = new Date();

    try {
        if (input.serviceEntryId) {
            const [updated] = await serverRuntime.db
                .update(itemServiceEntries)
                .set({
                    kind: input.kind,
                    performedAt: input.performedAt,
                    vendor: input.vendor ?? null,
                    costCents: input.costCents ?? null,
                    notes: input.notes ?? null,
                    nextDueAt: input.nextDueAt ?? null,
                    updatedAt: now,
                })
                .where(eq(itemServiceEntries.serviceEntryId, input.serviceEntryId))
                .returning();
            if (!updated) throw new Error(`itemServiceEntryUpsert: row ${input.serviceEntryId} not found`);
            await serverRuntime.publish.userUpdates({ userId });
            return toGqlItemServiceEntry(updated);
        }

        const payload: ItemServiceEntryCreate = {
            serviceEntryId: crypto.randomUUID(),
            itemId: input.itemId,
            kind: input.kind,
            performedAt: input.performedAt,
            vendor: input.vendor ?? null,
            costCents: input.costCents ?? null,
            notes: input.notes ?? null,
            nextDueAt: input.nextDueAt ?? null,
            updatedAt: now,
        };
        const [inserted] = await serverRuntime.db.insert(itemServiceEntries).values(payload).returning();
        if (!inserted) throw new Error('itemServiceEntryUpsert: insert returned no rows');
        await serverRuntime.publish.userUpdates({ userId });
        return toGqlItemServiceEntry(inserted);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
