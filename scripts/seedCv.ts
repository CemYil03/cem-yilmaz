import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { cvEducation, cvExperience, cvHobby, cvSkill } from '../src/server/db/schema';
import type { CvEducationCreate, CvExperienceCreate, CvHobbyCreate, CvSkillCreate } from '../src/server/db/schema';

// One-off seed for the CV tables. Mirrors the contents of `Lebenslauf.pdf` as
// of the file's commit. Idempotent: drops every existing row first, then
// re-inserts. Run with `npx tsx scripts/seedCv.ts`.
//
// All four tables get fresh rows; that's intentional. The admin editor at
// `/workspace/cv` is the long-term editing surface — this script exists only
// to bootstrap the DB from the PDF without 30+ admin saves.

config({ path: ['.env.local', '.env'] });

if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
}

const db = drizzle(process.env.DATABASE_URL);

// --- Experience -------------------------------------------------------------
// Experience has no `position` column — the public timeline reads
// `ORDER BY endDate DESC NULLS FIRST, startDate DESC`, so the ongoing
// "Senior Full-Stack ..." role appears at the top automatically.

const experienceRows: CvExperienceCreate[] = (
    [
        {
            roleDe: 'Senior Full-Stack und AI Engineer',
            roleEn: 'Senior Full-Stack and AI Engineer',
            company: 'Strategic Projects (SAP SE)',
            startDate: '2025-07-01',
            endDate: null,
            descriptionDe: 'Full-Stack und AI Entwicklung in Projekten mit hoher strategischer Relevanz für die Geschäftsfelder von SAP.',
            descriptionEn: 'Full-stack and AI development on projects with high strategic relevance for SAP’s business areas.',
            technologies: ['React', 'Vite', 'TanStack Start', 'GraphQL', 'Go', 'Kubernetes', 'Docker', 'BTP', 'HANA', 'Postgres'],
            managerName: 'Stefan Loetterle',
        },
        {
            roleDe: 'Full-Stack-Entwickler',
            roleEn: 'Full-Stack Engineer',
            company: 'SAP Concur Travel (SAP SE)',
            startDate: '2022-10-01',
            endDate: '2025-08-01',
            descriptionDe: 'Full-Stack-Entwicklung an T2, der Neuimplementierung des Travel Produkts. Mitglied in 2 Teams. Scrum.',
            descriptionEn: 'Full-stack development on T2, the re-implementation of the Travel product. Member of two teams. Scrum.',
            technologies: [
                'React',
                'RTL',
                'Enzyme',
                'Express',
                'GraphQL (Apollo)',
                'Swift',
                'SwiftUI',
                'UIKit',
                'Swift Package Manager',
                'yarn',
                'pnpm',
                'Storybook',
                'GitHub Actions',
                'Go',
                'Kotlin',
                'Kubernetes',
                'Docker',
                'AWS',
            ],
            managerName: 'Praveen N, Markus Schierle',
        },
        {
            roleDe: 'Unterstützung bei Promotionsprojekt',
            roleEn: 'Support on doctoral research project',
            company: 'Promotionsprojekt',
            startDate: '2025-03-27',
            endDate: '2025-05-01',
            descriptionDe:
                'Stiftungsgeförderte Entwicklung einer iPad App zum motorischen Armfähigkeitstraining für die Erhebung von Fortschrittsdaten in der Ergotherapie im Kontext einer Promotionsarbeit.',
            descriptionEn:
                'Foundation-funded development of an iPad app for motor arm-ability training, used to collect progress data in occupational therapy as part of a doctoral thesis.',
            technologies: ['Swift', 'SwiftUI', 'Express'],
            managerName: 'Eliane von Gunten',
        },
        {
            roleDe: 'Product Development',
            roleEn: 'Product Development',
            company: 'peopleeat.',
            startDate: '2022-04-01',
            endDate: null,
            descriptionDe:
                'Full-Stack-Entwicklung, UX Design und Business Prozess Entwicklung für eine Plattform zur Privatkoch Vermittlung.',
            descriptionEn:
                'Full-stack development, UX design and business-process work for a platform that connects private chefs with hosts.',
            technologies: [
                'Nx',
                'React',
                'Next.js',
                'Tailwindcss',
                'Storybook',
                'Express',
                'drizzle',
                'Sessions',
                'Stripe',
                'OpenAI',
                'Klaviyo',
                'Microsoft Graph API',
                'Swift',
                'SwiftUI',
                'GitHub Actions',
            ],
            managerName: 'Daniel Merkel',
        },
        {
            roleDe: 'Full-Stack-Entwickler',
            roleEn: 'Full-Stack Engineer',
            company: 'Experience Technology SE (SAP SE)',
            startDate: '2021-05-16',
            endDate: '2022-09-30',
            descriptionDe:
                'Full-Stack-Entwicklung Reimplementierung von SAP Minutes (Migration von Operational Transformation zu CRDTs) inkl. Go-Live.',
            descriptionEn:
                'Full-stack re-implementation of SAP Minutes (migration from Operational Transformation to CRDTs), including go-live.',
            technologies: [
                'Nx',
                'Angular',
                'GraphQL (Apollo)',
                'fundamental-ngx',
                'NestJS',
                'TypeORM',
                'TypeScript',
                'PostgreSQL',
                'Jest',
                'MS Graph API',
                'Sessions',
                'JWT',
                'Yjs',
            ],
            managerName: 'Jens Steckhan',
        },
        {
            roleDe: 'Full-Stack-Entwickler (Refactoring)',
            roleEn: 'Full-Stack Engineer (refactoring)',
            company: 'Experience Technology SE (SAP SE)',
            startDate: '2022-01-03',
            endDate: '2022-02-11',
            descriptionDe: 'Refactoring und Full-Stack-Entwicklung an dem Projekt SAP Minutes.',
            descriptionEn: 'Refactoring and full-stack development on the SAP Minutes project.',
            technologies: [
                'Nx',
                'Angular',
                'fundamental-ngx',
                'NestJS',
                'TypeORM',
                'TypeScript',
                'PostgreSQL',
                'Jest',
                'MS Graph API',
                'Sessions',
                'JWT',
                'ProseMirror',
            ],
            managerName: 'Jens Steckhan',
        },
        {
            roleDe: 'Full-Stack-Entwickler',
            roleEn: 'Full-Stack Engineer',
            company: 'Experience Center Walldorf (SAP SE)',
            startDate: '2021-06-28',
            endDate: '2021-10-01',
            descriptionDe:
                'Full-Stack-Entwicklung einer nativen Geofencing iOS-App von Grund auf. Full-Stack-Entwicklung eines visuellen Tools zur Kapazitätsplanung von Restaurants von Grund auf.',
            descriptionEn: 'Built a native geofencing iOS app from scratch. Built a visual restaurant-capacity planning tool from scratch.',
            technologies: [
                'Swift',
                'SwiftUI',
                'Geofencing',
                'Localization / Internationalization',
                'TypeScript',
                'NestJS',
                'TypeORM',
                'SAP HANA',
                'Angular',
                'UI5 Web Components',
                'fundamental-ngx',
                'GraphQL (Apollo)',
                'SVG',
            ],
            managerName: 'Thomas Goetz (Strategic Value Acceleration)',
        },
        {
            roleDe: 'Prototype Development',
            roleEn: 'Prototype Development',
            company: 'peopleeat',
            startDate: '2021-02-01',
            endDate: '2022-03-31',
            descriptionDe: 'iOS- und Backend-Entwicklung, UX Design und Business Prozess Entwicklung.',
            descriptionEn: 'iOS and backend development, UX design and business-process work.',
            technologies: ['Swift', 'SwiftUI', 'NestJS', 'REST', 'TypeORM'],
            managerName: 'Daniel Merkel',
        },
        {
            roleDe: 'Full-Stack-Entwickler',
            roleEn: 'Full-Stack Engineer',
            company: 'Sales Delivery SE (SAP SE)',
            startDate: '2021-01-04',
            endDate: '2021-03-26',
            descriptionDe: 'Full-Stack-Entwicklung an dem Projekt SAP Product One mit Neuimplementierung des gesamten Frontends.',
            descriptionEn: 'Full-stack development on SAP Product One, re-implementing the entire frontend.',
            technologies: ['SAP CAP (Node)', 'SAP HANA', 'TypeScript', 'Angular', 'Angular Material', 'fundamental-ngx', 'OData', 'Jest'],
            managerName: 'Robin Reeb',
        },
        {
            roleDe: 'Full-Stack-Entwickler',
            roleEn: 'Full-Stack Engineer',
            company: 'Practice Unit Insurance (SAP SE)',
            startDate: '2020-08-03',
            endDate: '2020-09-25',
            descriptionDe:
                'Full-Stack-Entwicklung einer nativen iOS-App zum Scannen und Einreichen von Versicherungsbelegen sowie einer Weboberfläche zur Bearbeitung dieser Anfragen.',
            descriptionEn:
                'Built a native iOS app for scanning and submitting insurance receipts, plus a web UI for processing those requests.',
            technologies: [
                'Swift',
                'SwiftUI',
                'SAP Cloud Platform SDK',
                'Push Notifications',
                'Camera Access',
                'Localization / Internationalization',
                'SAPUI5',
                'OpenUI5',
                'PHP',
                'MySQL',
            ],
            managerName: 'Bernd Helb',
        },
        {
            roleDe: 'iOS- und Frontend-Entwickler (Prototyp)',
            roleEn: 'iOS and Frontend Engineer (prototype)',
            company: 'Practice Unit Insurance (SAP SE)',
            startDate: '2019-10-21',
            endDate: '2019-12-16',
            descriptionDe:
                'Prototypen-Entwicklung einer abteilungsinternen Social-Media-App. Mitarbeit an einem SAPUI5-Dashboard für Kunden und an einem iOS-Prototypen.',
            descriptionEn:
                'Built a prototype social-media app for the department. Contributed to a SAPUI5 customer dashboard and to an iOS prototype.',
            technologies: [
                'Swift',
                'UIKit',
                'SAP Cloud Platform SDK',
                'Local Notifications',
                'Camera Access',
                'SAPUI5',
                'OpenUI5',
                'Dart',
                'Flutter',
            ],
            managerName: 'Bernd Helb',
        },
    ] as Array<Omit<CvExperienceCreate, 'cvExperienceId'>>
).map((row) => ({
    cvExperienceId: crypto.randomUUID(),
    ...row,
}));

// --- Education --------------------------------------------------------------

const educationRows: CvEducationCreate[] = (
    [
        {
            degreeDe: 'Duales Studium (Bachelor of Science, SAP SE)',
            degreeEn: 'Cooperative degree (Bachelor of Science, SAP SE)',
            institution: 'Duale Hochschule Baden-Württemberg Karlsruhe',
            subjectDe: 'Informatik',
            subjectEn: 'Computer Science',
            startDate: '2019-09-01',
            endDate: '2022-09-30',
            notesDe: 'Kursprecher SAP\nKursprecher DHBW',
            notesEn: 'Course representative at SAP\nCourse representative at DHBW',
        },
        {
            degreeDe: 'Abitur',
            degreeEn: 'Abitur (German university entrance qualification)',
            institution: 'Hans-Purrmann-Gymnasium Speyer',
            subjectDe: '',
            subjectEn: '',
            startDate: null,
            endDate: '2019-03-26',
            notesDe: 'Kursprecher\nStreitschlichter\nMitglied Zivilcourage AG\nKunstpreis für Architektur\nAbschlussprüfung Informatik: 1+',
            notesEn:
                'Course representative\nMediator (peer dispute resolution)\nMember of the Zivilcourage AG\nArt prize for architecture\nFinal exam in computer science: 1+',
        },
    ] as Array<Omit<CvEducationCreate, 'cvEducationId' | 'position'>>
).map((row, index) => ({
    cvEducationId: crypto.randomUUID(),
    position: index,
    ...row,
}));

// --- Skills -----------------------------------------------------------------
// Categories follow the PDF block grouping.

const skillCategories: Array<{ category: CvSkillCreate['category']; labels: string[] }> = [
    {
        category: 'capabilities',
        labels: [
            'Relationale Datenmodellierung',
            'Rapid Prototyping',
            'Accessibility Review und Optimierung',
            'Refactoring',
            'API Design (REST, GraphQL)',
            'Entwurf von Benutzeroberflächen (UI/UX)',
        ],
    },
    {
        category: 'frameworks',
        labels: [
            'React',
            'Next.js',
            'TanStack Start',
            'Nx',
            'Storybook',
            'shadcn',
            'Tailwindcss',
            'TanStack Form',
            'mui',
            'drizzle',
            'Angular',
            'NestJS',
            'SwiftUI',
            'UIKit',
            'TypeORM',
            'Express',
            'Apollo',
            'SAPUI5 / OpenUI5',
            '.NET',
            'SAP CAP',
            'React Native',
            'Flutter',
            'Passport',
            'Quasar',
            'socket.io',
            'Angular Material',
            'UI5 Web Components',
            'fundamental-ngx',
        ],
    },
    {
        category: 'services',
        labels: [
            'OpenAI API',
            'Microsoft Graph API',
            'Google Places API',
            'Meta / WhatsApp API',
            'Stripe API',
            'Klaviyo API',
            'Twilio API',
        ],
    },
    {
        category: 'tools',
        labels: [
            'Xcode',
            'VS Code',
            'IntelliJ',
            'Git',
            'GitHub',
            'SF Symbols',
            'Fastlane',
            'GitHub Actions',
            'Codacy',
            'ESLint',
            'Prettier',
            'Jest',
            'Figma',
            'Adobe XD',
            'Sketch',
            'Slack',
            'Jira',
            'YouTrack',
        ],
    },
    {
        category: 'languages',
        labels: [
            'TypeScript',
            'Swift',
            'SQL',
            'Java',
            'Go',
            'Kotlin',
            'PHP',
            'JavaScript',
            'HTML',
            'CSS',
            'C#',
            'Deno',
            'Dart',
            'ABAP',
            'C++',
        ],
    },
];

const skillRows: CvSkillCreate[] = [];
let skillPosition = 0;
for (const block of skillCategories) {
    for (const label of block.labels) {
        skillRows.push({
            cvSkillId: crypto.randomUUID(),
            category: block.category,
            label,
            position: skillPosition++,
        });
    }
}

// --- Hobbies ----------------------------------------------------------------

const hobbyRows: CvHobbyCreate[] = (
    [
        {
            since: 2011,
            textDe: 'Karate im JSV-Speyer (seit 2018 als ausgebildeter Trainer für Kinder und Jugend)',
            textEn: 'Karate at JSV-Speyer (qualified instructor for children and youth since 2018)',
        },
        {
            since: 2023,
            textDe: 'Karate im PSV Ludwigshafen',
            textEn: 'Karate at PSV Ludwigshafen',
        },
        {
            since: null,
            textDe: 'Tennis, Volleyball, Fußball, Schwimmen',
            textEn: 'Tennis, volleyball, football, swimming',
        },
        {
            since: null,
            textDe: 'Interesse an Filmanalysen und -kritiken',
            textEn: 'Interest in film analysis and reviews',
        },
    ] as Array<Omit<CvHobbyCreate, 'cvHobbyId' | 'position'>>
).map((row, index) => ({
    cvHobbyId: crypto.randomUUID(),
    position: index,
    ...row,
}));

// --- Apply ------------------------------------------------------------------

await db.transaction(async (transaction) => {
    await transaction.delete(cvExperience);
    await transaction.delete(cvEducation);
    await transaction.delete(cvSkill);
    await transaction.delete(cvHobby);

    if (experienceRows.length > 0) await transaction.insert(cvExperience).values(experienceRows);
    if (educationRows.length > 0) await transaction.insert(cvEducation).values(educationRows);
    if (skillRows.length > 0) await transaction.insert(cvSkill).values(skillRows);
    if (hobbyRows.length > 0) await transaction.insert(cvHobby).values(hobbyRows);
});

console.log(
    `seeded CV: ${experienceRows.length} experience, ${educationRows.length} education, ${skillRows.length} skills, ${hobbyRows.length} hobbies`,
);
process.exit(0);
