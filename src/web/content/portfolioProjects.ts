// Static portfolio projects rendered on `/projects`. Edited via PR.
//
// Phase 1 ships a hand-curated list of three projects so the landing page
// has a real destination instead of a "coming soon" stub. Phase 3 replaces
// this with a `cvProjects`-style DB table plus an admin editor under
// `/workspace/projects`; until then PR friction is acceptable for three
// entries that change on the order of once a year.
//
// Bilingual fields follow the paired `*De` / `*En` convention used by the
// CV tables (see docs/architecture/content-model.md). `name`, `url`, and
// `techStack` labels are display-only and locale-independent.
//
// Hero images live under `public/projects/<id>/`. The capture script at
// `scripts/captureProjectScreenshots.ts` re-grabs them; sites that block
// headless traffic are flagged `manualOnly` there and the asset is dropped
// in by hand. Each project carries a small gallery (`images`) — the first
// entry is the hero, the rest render in a thumbnail strip below. `imageKind`
// switches the route between two visual treatments:
//   - `'browser'` frames the image in a faked browser-window chrome (used
//     for software products)
//   - `'photo'` renders the image edge-to-edge inside the rounded card
//     (used for real-world businesses where the live URL is a brochure
//     for a place)
// `accent` is a CSS color expression applied as a soft glow behind the
// image — keeps each row distinct without per-component theming.
//
// See docs/features/projects.md.

interface ProjectImage {
    src: string;
    altDe: string;
    altEn: string;
}

interface PortfolioProject {
    id: string;
    name: string;
    url: string;
    repoUrl?: string;
    roleDe: string;
    roleEn: string;
    taglineDe: string;
    taglineEn: string;
    descriptionDe: string;
    descriptionEn: string;
    techStack: ReadonlyArray<string>;
    images: ReadonlyArray<ProjectImage>;
    imageKind: 'browser' | 'photo';
    /** Soft glow color behind the image. Any valid CSS color expression. */
    accent: string;
}

export const portfolioProjects: ReadonlyArray<PortfolioProject> = [
    {
        id: 'people-eat',
        name: 'peopleeat',
        url: 'https://people-eat.com',
        roleDe: 'Gründungs-Architekt',
        roleEn: 'Founding architect',
        taglineDe: 'Marktplatz für private Dining-Erlebnisse mit lokalen Köchen.',
        taglineEn: 'Marketplace for private dining experiences with local chefs.',
        descriptionDe:
            'Seit Gründung des Startups verantworte ich die technische Architektur. Skalierbares Nx-Monorepo mit TypeScript, Next.js und GraphQL, CQRS und Domain-Driven Design, plus Integrationen mit Payment-, AI- und Messaging-Diensten.',
        descriptionEn:
            'Founding architect at peopleeat — responsible for the technical foundation since day one. Scalable Nx monorepo with TypeScript, Next.js and GraphQL, CQRS and domain-driven design, plus payment, AI and messaging integrations.',
        techStack: ['Next.js', 'React', 'GraphQL', 'TypeScript', 'Drizzle', 'MySQL', 'Nx'],
        imageKind: 'browser',
        accent: 'oklch(0.78 0.16 55)', // warm orange — peopleeat brand
        images: [
            {
                src: '/projects/people-eat/1.png',
                altDe: 'Startseite von peopleeat: festlich gedeckter Tisch',
                altEn: 'peopleeat landing page: festively laid table',
            },
            {
                src: '/projects/people-eat/2.png',
                altDe: 'Übersicht der Köche auf peopleeat',
                altEn: 'Chef directory on peopleeat',
            },
        ],
    },
    {
        id: 'draw-schema',
        name: 'Draw Schema',
        url: 'https://draw-schema.com',
        repoUrl: 'https://github.com/CemYil03/draw-schema',
        roleDe: 'Eigenes Projekt',
        roleEn: 'Own project',
        taglineDe: 'Kollaboratives, KI-gestütztes Datenbank-Modellierungs-Tool für Entwicklerteams.',
        taglineEn: 'Collaborative, AI-guided database modelling tool for developer teams.',
        descriptionDe:
            'Mein eigenes nicht-produktives SaaS. Schemas im Team in Echtzeit entwerfen, bestehende Codebasen importieren (SQL, Drizzle, TypeORM) und produktionsreife Migrationen generieren. EU-gehostet.',
        descriptionEn:
            'My own non-productive SaaS. Design schemas with your team in real-time, import existing codebases (SQL, Drizzle, TypeORM) and generate production-ready migrations. EU-hosted.',
        techStack: ['React 19', 'TanStack Start', 'GraphQL', 'Drizzle', 'PostgreSQL', 'Vercel AI SDK'],
        imageKind: 'browser',
        accent: 'oklch(0.7 0.13 240)', // cool slate-blue — draw-schema brand
        images: [
            {
                src: '/projects/draw-schema/1.png',
                altDe: 'Draw Schema: kollaboratives Schema-Modellierungs-Canvas mit Tabellen und Relationen',
                altEn: 'Draw Schema: collaborative schema-modelling canvas with tables and relations',
            },
            {
                src: '/projects/draw-schema/2.png',
                altDe: 'Leeres Canvas — Ausgangspunkt für ein neues Schema',
                altEn: 'Empty canvas — starting point for a new schema',
            },
            {
                src: '/projects/draw-schema/3.png',
                altDe: 'Landing-Page von Draw Schema mit dem Slogan „The blueprint for your team\'s data"',
                altEn: 'Draw Schema landing page with the headline "The blueprint for your team\'s data"',
            },
        ],
    },
    {
        id: 'podologie-dudenhofen',
        name: 'Podologie Dudenhofen',
        url: 'https://podologie-dudenhofen.de',
        roleDe: 'Kundenprojekt',
        roleEn: 'Client work',
        taglineDe: 'Zweisprachige Website für eine Podologie-Praxis in Dudenhofen.',
        taglineEn: 'Bilingual website for a podiatry practice in Dudenhofen, Germany.',
        descriptionDe:
            'Vollständig zweisprachige Praxis-Website mit Leistungen, Preisen, Terminanfragen und KI-Assistent. Ersetzt die alte Jimdo-Seite durch einen modernen, eigens entwickelten Stack.',
        descriptionEn:
            'Fully bilingual practice website with services, pricing, appointment requests and an AI assistant. Replaces the legacy Jimdo site with a modern, custom-built stack.',
        techStack: ['TanStack Start', 'React 19', 'GraphQL', 'Drizzle', 'PostgreSQL', 'Tailwind CSS'],
        imageKind: 'photo',
        accent: 'oklch(0.75 0.1 165)', // calm green-teal
        images: [
            {
                src: '/projects/podologie-dudenhofen/1.png',
                altDe: 'Behandlungsraum der Podologie-Praxis in Dudenhofen',
                altEn: 'Treatment room of the podiatry practice in Dudenhofen',
            },
            {
                src: '/projects/podologie-dudenhofen/2.png',
                altDe: 'Annette Yilmaz, Inhaberin der Praxis, im Behandlungsraum',
                altEn: 'Annette Yilmaz, owner of the practice, in the treatment room',
            },
            {
                src: '/projects/podologie-dudenhofen/3.png',
                altDe: 'Annette Yilmaz, Inhaberin der Praxis, im Behandlungsraum',
                altEn: 'Annette Yilmaz, owner of the practice, in the treatment room',
            },
        ],
    },
];
