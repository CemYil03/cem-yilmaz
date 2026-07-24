import type { AdminTaxFile, FileUpload } from '../db/schema';
import type { GqlSAdminTaxFile } from '../graphql/generated';
import { toGqlFileUpload } from './toGqlFileUpload';

// The caller loads the paired `FileUpload` row alongside `taxFiles` and hands
// both in — same wire as `toGqlAdminInventoryItemFile` / `toGqlAdminMedicalRecordFile`.
// Bytes are never surfaced inline; `fileUpload.url` points at `/api/file-uploads/:id`.
export function toGqlAdminTaxFile(row: AdminTaxFile, upload: FileUpload): GqlSAdminTaxFile {
    return {
        taxFileId: row.taxFileId,
        taxYearId: row.taxYearId,
        expenseId: row.expenseId,
        documentId: row.documentId,
        fileUpload: toGqlFileUpload(upload),
        label: row.label,
        kind: row.kind,
        pinned: row.pinned,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}
