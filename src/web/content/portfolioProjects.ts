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
// See docs/features/projects.md.

interface PortfolioProject {
    id: string;
    name: string;
    url: string;
    roleDe: string;
    roleEn: string;
    taglineDe: string;
    taglineEn: string;
    descriptionDe: string;
    descriptionEn: string;
    techStack: ReadonlyArray<string>;
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
    },
    {
        id: 'draw-schema',
        name: 'Draw Schema',
        url: 'https://draw-schema.com',
        roleDe: 'Eigenes Projekt',
        roleEn: 'Own project',
        taglineDe: 'Kollaboratives, KI-gestütztes Datenbank-Modellierungs-Tool für Entwicklerteams.',
        taglineEn: 'Collaborative, AI-guided database modelling tool for developer teams.',
        descriptionDe:
            'Mein eigenes nicht-produktives SaaS. Schemas im Team in Echtzeit entwerfen, bestehende Codebasen importieren (SQL, Drizzle, TypeORM) und produktionsreife Migrationen generieren. EU-gehostet.',
        descriptionEn:
            'My own non-productive SaaS. Design schemas with your team in real-time, import existing codebases (SQL, Drizzle, TypeORM) and generate production-ready migrations. EU-hosted.',
        techStack: ['React 19', 'TanStack Start', 'GraphQL', 'Drizzle', 'PostgreSQL', 'Vercel AI SDK'],
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
    },
];
