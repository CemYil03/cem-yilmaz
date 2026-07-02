import type { ItemServiceEntry } from '../db/schema';
import type { GqlSItemServiceEntry } from '../graphql/generated';

// `files` is populated by the caller (item detail loader) after joining
// through `itemFiles.serviceEntryId`. The mapper alone doesn't know files.
export function toGqlItemServiceEntry(row: ItemServiceEntry): GqlSItemServiceEntry {
    return {
        serviceEntryId: row.serviceEntryId,
        kind: row.kind,
        performedAt: row.performedAt,
        vendor: row.vendor,
        costCents: row.costCents,
        notes: row.notes,
        nextDueAt: row.nextDueAt,
        files: [],
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}
