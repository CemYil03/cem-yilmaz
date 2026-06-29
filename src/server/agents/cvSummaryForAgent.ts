import { asc } from 'drizzle-orm';
import { personalInfo } from '../../web/content/personalInfo';
import type { CvEducation, CvExperience, CvHobby, CvSkill, CvSkillCategory } from '../db/schema';
import { cvEducation, cvExperience, cvHobby, cvSkill } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';

// Renders a compact German prose summary of Cem's CV for embedding into the
// visitor agent's system prompt. Pulled live from the DB on every chat turn,
// so admin edits land in the agent's answers immediately. No caching — four
// indexed reads against tiny tables, well below network noise.
//
// The summary is German-first because the existing visitor prompt is German;
// the agent itself replies in whatever language the user wrote in. See
// `agentVisitorAboutCem.ts`.
export async function cvSummaryForAgent(serverRuntime: ServerRuntime): Promise<string> {
    const [experiences, educations, skills, hobbies] = await Promise.all([
        serverRuntime.db.select().from(cvExperience).orderBy(asc(cvExperience.position)),
        serverRuntime.db.select().from(cvEducation).orderBy(asc(cvEducation.position)),
        serverRuntime.db.select().from(cvSkill).orderBy(asc(cvSkill.position)),
        serverRuntime.db.select().from(cvHobby).orderBy(asc(cvHobby.position)),
    ]);

    return [
        identityBlock(),
        '',
        '## Verfügbarkeit & Zeitzonen',
        '- Wohnt in Deutschland (Zeitzone Europe/Berlin, also UTC+1 im Winter, UTC+2 im Sommer).',
        '- Arbeitet regelmäßig mit verteilten Teams in Kanada, den USA und Indien zusammen.',
        '- Ist zeitlich flexibel: frühe Calls vor dem Frühstück (z. B. ab ca. 7 Uhr deutscher Zeit für Indien) und späte Calls am Abend (z. B. bis ca. 22 Uhr deutscher Zeit für Nordamerika) sind ausdrücklich Teil des Pakets, nicht die Ausnahme.',
        '- Wenn jemand Bedenken äußert, ob die Zeitverschiebung zu einer Zusammenarbeit über Kontinente hinweg passt: bestätigen, dass das funktioniert, und auf die genannten gemeinsamen Zeitfenster verweisen.',
        '',
        '## Berufserfahrung',
        ...experiences.map(experienceLine),
        '',
        '## Ausbildung',
        ...educations.map(educationLine),
        '',
        '## Skills',
        ...skillBlock(skills),
        '',
        '## Hobbys',
        ...hobbies.map(hobbyLine),
    ].join('\n');
}

function identityBlock(): string {
    const dob = formatGermanDate(personalInfo.dateOfBirth);
    const languages = personalInfo.spokenLanguages.map((l) => l.de).join(', ');
    return [
        `## Über Cem`,
        `- Name: ${personalInfo.fullName}`,
        `- Geboren: ${dob} in ${personalInfo.placeOfBirth}`,
        `- Wohnort: ${personalInfo.residence.postalCode} ${personalInfo.residence.city}`,
        `- Staatsangehörigkeit: ${personalInfo.nationality.de}`,
        `- Sprachen: ${languages}`,
        `- Rolle: ${personalInfo.tagline.de} ${personalInfo.subtitle.de}`,
    ].join('\n');
}

function experienceLine(row: CvExperience): string {
    const start = formatGermanDate(row.startDate);
    const end = row.endDate ? formatGermanDate(row.endDate) : 'heute';
    const tech = row.technologies.length > 0 ? ` — Technologien: ${row.technologies.join(', ')}` : '';
    return `- **${start} – ${end}**, ${row.roleDe} bei ${row.companyDe}: ${row.descriptionDe}${tech}`;
}

function educationLine(row: CvEducation): string {
    const start = row.startDate ? formatGermanDate(row.startDate) : null;
    const end = formatGermanDate(row.endDate);
    const range = start ? `${start} – ${end}` : end;
    const subject = row.subjectDe ? ` (${row.subjectDe})` : '';
    const notes = row.notesDe ? ` — ${row.notesDe.replace(/\n+/g, ', ')}` : '';
    return `- **${range}**, ${row.degreeDe}${subject} an ${row.institutionDe}${notes}`;
}

function skillBlock(skills: CvSkill[]): string[] {
    const grouped: Record<CvSkillCategory, string[]> = {
        capabilities: [],
        frameworks: [],
        services: [],
        tools: [],
        languages: [],
    };
    for (const skill of skills) grouped[skill.category].push(skill.label);

    const labels: Record<CvSkillCategory, string> = {
        capabilities: 'Fähigkeiten',
        frameworks: 'Bibliotheken / Frameworks',
        services: 'Dienste',
        tools: 'Werkzeuge',
        languages: 'Sprachen',
    };

    return (Object.keys(labels) as CvSkillCategory[])
        .filter((key) => grouped[key].length > 0)
        .map((key) => `- ${labels[key]}: ${grouped[key].join(', ')}`);
}

function hobbyLine(row: CvHobby): string {
    return row.since ? `- Seit ${row.since}: ${row.textDe}` : `- ${row.textDe}`;
}

const GERMAN_MONTHS = [
    'Januar',
    'Februar',
    'März',
    'April',
    'Mai',
    'Juni',
    'Juli',
    'August',
    'September',
    'Oktober',
    'November',
    'Dezember',
];

// Drizzle returns `date` columns as `yyyy-mm-dd` strings; we format them as
// "1. März 2025" without pulling in a date-fns locale just for the agent
// summary path.
function formatGermanDate(iso: string): string {
    const [year, month, day] = iso.split('-');
    if (!year || !month || !day) return iso;
    const monthName = GERMAN_MONTHS[parseInt(month, 10) - 1] ?? month;
    return `${parseInt(day, 10)}. ${monthName} ${year}`;
}
