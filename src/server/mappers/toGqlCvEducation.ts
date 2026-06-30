import type { CvEducation } from '../db/schema';
import type { GqlSCvEducation } from '../graphql/generated';

export function toGqlCvEducation(row: CvEducation): GqlSCvEducation {
    return {
        cvEducationId: row.cvEducationId,
        degreeDe: row.degreeDe,
        degreeEn: row.degreeEn,
        institution: row.institution,
        subjectDe: row.subjectDe,
        subjectEn: row.subjectEn,
        startDate: row.startDate,
        endDate: row.endDate,
        notesDe: row.notesDe,
        notesEn: row.notesEn,
        position: row.position,
    };
}
