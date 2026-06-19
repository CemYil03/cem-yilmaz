import type { CvExperience } from '../db/schema';
import type { GqlSCvExperience } from '../graphql/generated';

export function toGqlCvExperience(row: CvExperience): GqlSCvExperience {
    return {
        cvExperienceId: row.cvExperienceId,
        roleDe: row.roleDe,
        roleEn: row.roleEn,
        companyDe: row.companyDe,
        companyEn: row.companyEn,
        startDate: row.startDate,
        endDate: row.endDate,
        descriptionDe: row.descriptionDe,
        descriptionEn: row.descriptionEn,
        technologies: row.technologies,
        managerName: row.managerName,
        position: row.position,
    };
}
