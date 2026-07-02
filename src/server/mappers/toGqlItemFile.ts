import type { FileUpload, ItemFile } from '../db/schema';
import type { GqlSItemFile } from '../graphql/generated';
import { toGqlFileUpload } from './toGqlFileUpload';

// The caller loads the paired `FileUpload` row alongside `itemFiles` and
// hands both in — the join is single-owner (one upload per `ItemFiles` row)
// so this mapper stays trivial. Bytes are never surfaced inline; the
// `fileUpload.url` field points at the shared `/api/file-uploads/:id`
// download route.
export function toGqlItemFile(row: ItemFile, upload: FileUpload): GqlSItemFile {
    return {
        itemFileId: row.itemFileId,
        itemId: row.itemId,
        serviceEntryId: row.serviceEntryId,
        fileUpload: toGqlFileUpload(upload),
        label: row.label,
        kind: row.kind,
        pinned: row.pinned,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}
