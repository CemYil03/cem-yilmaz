import type { AdminTaxDocument } from '../db/schema';
import type { GqlSAdminTaxDocument, GqlSAdminTaxFile } from '../graphql/generated';

// The caller loads and maps the attached files (scans), then hands them in.
// Every other column maps 1:1.
export function toGqlAdminTaxDocument(row: AdminTaxDocument, files: GqlSAdminTaxFile[]): GqlSAdminTaxDocument {
    return {
        documentId: row.documentId,
        kind: row.kind,
        title: row.title,
        status: row.status,
        notes: row.notes,
        files,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}
