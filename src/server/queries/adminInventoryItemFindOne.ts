import { asc, desc, eq, inArray } from 'drizzle-orm';
import { fileUploads, itemFiles, items, itemServiceEntries, itemValuations } from '../db/schema';
import type { FileUpload } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminInventoryItem, GqlSSession } from '../graphql/generated';
import { toGqlAdminInventoryItem } from '../mappers/toGqlAdminInventoryItem';
import { toGqlAdminInventoryItemFile } from '../mappers/toGqlAdminInventoryItemFile';
import { toGqlAdminInventoryItemServiceEntry } from '../mappers/toGqlAdminInventoryItemServiceEntry';
import { toGqlAdminInventoryItemValuation } from '../mappers/toGqlAdminInventoryItemValuation';

// Loads a single item by id with every nested row needed by the detail
// route (`/workspace/inventory/$itemId`): valuations (desc by valuedAt),
// service entries (desc by performedAt) with their attached files, and the
// broader per-item file list with the underlying `FileUploads` rows joined
// in. Mirrors `projectGet` — one query per relation, then normalize into
// the GraphQL shape in memory. Returns null when the id doesn't exist.
export async function adminInventoryItemFindOne(
    itemId: string,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminInventoryItem | null> {
    try {
        const [row] = await serverRuntime.db.select().from(items).where(eq(items.itemId, itemId)).limit(1);
        if (!row) return null;

        const valuationRows = await serverRuntime.db
            .select()
            .from(itemValuations)
            .where(eq(itemValuations.itemId, itemId))
            .orderBy(desc(itemValuations.valuedAt), asc(itemValuations.valuationId));

        const serviceRows = await serverRuntime.db
            .select()
            .from(itemServiceEntries)
            .where(eq(itemServiceEntries.itemId, itemId))
            .orderBy(desc(itemServiceEntries.performedAt), asc(itemServiceEntries.serviceEntryId));

        const fileRows = await serverRuntime.db
            .select()
            .from(itemFiles)
            .where(eq(itemFiles.itemId, itemId))
            .orderBy(desc(itemFiles.pinned), desc(itemFiles.createdAt));

        const fileUploadsById = new Map<string, FileUpload>();
        if (fileRows.length > 0) {
            const uploadIds = Array.from(new Set(fileRows.map((f) => f.fileUploadId)));
            const uploadRows = await serverRuntime.db.select().from(fileUploads).where(inArray(fileUploads.fileUploadId, uploadIds));
            for (const u of uploadRows) fileUploadsById.set(u.fileUploadId, u);
        }

        const files = fileRows
            .map((f) => {
                const upload = fileUploadsById.get(f.fileUploadId);
                return upload ? toGqlAdminInventoryItemFile(f, upload) : null;
            })
            .filter((f): f is NonNullable<typeof f> => f !== null);

        const filesByServiceEntryId = new Map<string, typeof files>();
        for (const f of files) {
            if (!f.serviceEntryId) continue;
            const list = filesByServiceEntryId.get(f.serviceEntryId) ?? [];
            list.push(f);
            filesByServiceEntryId.set(f.serviceEntryId, list);
        }

        const serviceEntries = serviceRows.map((s) => ({
            ...toGqlAdminInventoryItemServiceEntry(s),
            files: filesByServiceEntryId.get(s.serviceEntryId) ?? [],
        }));

        return {
            ...toGqlAdminInventoryItem(row),
            valuations: valuationRows.map(toGqlAdminInventoryItemValuation),
            serviceEntries,
            files,
        };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
