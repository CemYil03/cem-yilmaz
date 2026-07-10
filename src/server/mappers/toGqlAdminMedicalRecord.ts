import type { AdminMedicalRecord } from '../db/schema';
import type { GqlSAdminMedicalRecord, GqlSAdminMedicalRecordFile } from '../graphql/generated';

// `files` is passed in from the loading query — the mapper is trivial and
// the caller decides how (and when) to join `MedicalRecordFiles`. This
// mirrors `toGqlAdminInventoryItem` / `toGqlAdminInventoryItemFile`: keep the shape simple, let the
// query own the fan-out.
export function toGqlAdminMedicalRecord(row: AdminMedicalRecord, files: GqlSAdminMedicalRecordFile[]): GqlSAdminMedicalRecord {
    return {
        recordId: row.recordId,
        category: row.category,
        title: row.title,
        summary: row.summary,
        severity: row.severity,
        symptoms: row.symptoms,
        bodyAreas: row.bodyAreas,
        occurredAt: row.occurredAt,
        resolvedAt: row.resolvedAt,
        appointmentId: row.appointmentId,
        topics: row.topics,
        files,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}
