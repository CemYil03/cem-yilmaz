import type { Locale } from '../utils/locale';
import { GlassCard } from './GlassCard';

type CvSkillCategoryKey = 'capabilities' | 'frameworks' | 'services' | 'tools' | 'languages';

export interface CvSkillItem {
    cvSkillId: string;
    category: CvSkillCategoryKey;
    label: string;
    position: number;
}

const CATEGORY_LABELS: Record<CvSkillCategoryKey, { de: string; en: string }> = {
    capabilities: { de: 'Fähigkeiten', en: 'Capabilities' },
    frameworks: { de: 'Bibliotheken & Frameworks', en: 'Libraries & Frameworks' },
    services: { de: 'Services & APIs', en: 'Services & APIs' },
    tools: { de: 'Werkzeuge', en: 'Tools' },
    languages: { de: 'Programmiersprachen', en: 'Programming Languages' },
};

const CATEGORY_ORDER: ReadonlyArray<CvSkillCategoryKey> = ['capabilities', 'frameworks', 'services', 'tools', 'languages'];

// Groups skills by category and renders them as labelled chip lists. Pure
// view component: it reads the inbound list as-is and trusts that the route
// loader already sorted by `position`. Empty categories are skipped so a
// future deletion doesn't leave behind a hollow header.
export function CvSkillGroup({ skills, locale }: { skills: ReadonlyArray<CvSkillItem>; locale: Locale }) {
    const grouped: Record<CvSkillCategoryKey, CvSkillItem[]> = {
        capabilities: [],
        frameworks: [],
        services: [],
        tools: [],
        languages: [],
    };
    for (const skill of skills) grouped[skill.category].push(skill);

    return (
        <div className="grid gap-4 md:grid-cols-2">
            {CATEGORY_ORDER.filter((key) => grouped[key].length > 0).map((key) => (
                <GlassCard key={key} className="px-6 py-5">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{CATEGORY_LABELS[key][locale]}</h3>
                    <ul className="mt-3 flex flex-wrap gap-1.5">
                        {grouped[key].map((skill) => (
                            <li
                                key={skill.cvSkillId}
                                className="rounded-full border border-border/60 bg-foreground/5 px-2.5 py-0.5 text-xs"
                            >
                                {skill.label}
                            </li>
                        ))}
                    </ul>
                </GlassCard>
            ))}
        </div>
    );
}
