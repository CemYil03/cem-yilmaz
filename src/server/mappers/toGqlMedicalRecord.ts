import type { MedicalRecord } from '../db/schema';
import type { GqlSMedicalRecord, GqlSMedicalRecordFile } from '../graphql/generated';

// `files` is passed in from the loading query — the mapper is trivial and
// the caller decides how (and when) to join `MedicalRecordFiles`. This
// mirrors `toGqlItem` / `toGqlItemFile`: keep the shape simple, let the
// query own the fan-out.
export function toGqlMedicalRecord(row: MedicalRecord, files: GqlSMedicalRecordFile[]): GqlSMedicalRecord {
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
