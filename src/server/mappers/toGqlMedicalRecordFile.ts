import type { FileUpload, MedicalRecordFile } from '../db/schema';
import type { GqlSMedicalRecordFile } from '../graphql/generated';
import { toGqlFileUpload } from './toGqlFileUpload';

// The caller loads the paired `FileUpload` row alongside `medicalRecordFiles`
// and hands both in — same wire as `toGqlItemFile`. Bytes are never surfaced
// inline; `fileUpload.url` points at `/api/file-uploads/:id`.
export function toGqlMedicalRecordFile(row: MedicalRecordFile, upload: FileUpload): GqlSMedicalRecordFile {
    return {
        recordFileId: row.recordFileId,
        recordId: row.recordId,
        fileUpload: toGqlFileUpload(upload),
        label: row.label,
        pinned: row.pinned,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}
