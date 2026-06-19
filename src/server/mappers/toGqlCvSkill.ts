import type { CvSkill } from '../db/schema';
import type { GqlSCvSkill } from '../graphql/generated';

export function toGqlCvSkill(row: CvSkill): GqlSCvSkill {
    return {
        cvSkillId: row.cvSkillId,
        category: row.category,
        label: row.label,
        position: row.position,
    };
}
