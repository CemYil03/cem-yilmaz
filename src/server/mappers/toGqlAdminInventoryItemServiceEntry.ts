import type { AdminInventoryItemServiceEntry } from '../db/schema';
import type { GqlSAdminInventoryItemServiceEntry } from '../graphql/generated';

// `files` is populated by the caller (item detail loader) after joining
// through `itemFiles.serviceEntryId`. The mapper alone doesn't know files.
export function toGqlAdminInventoryItemServiceEntry(row: AdminInventoryItemServiceEntry): GqlSAdminInventoryItemServiceEntry {
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
