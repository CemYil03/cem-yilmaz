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
// `techStack` is one flat ordered array — most-prominent / most-distinctive
// items first. The route renders the items as a wrapping row of subtle
// chips, in order, with no truncation. `facts` are short chip-sized tags
// rendered near the title ("4 languages", "RTL support", "EU-hosted").
// Both `facts` and tagline are concise on purpose — the layout leans on
// the screenshot, not on copy.
//
// Hero images live under `public/projects/<id>/` and are curated by hand
// (sibling-repo exports, simulator screenshots, or one-off captures). Each
// project carries a small gallery (`images`) — the first entry is the hero,
// the rest render in a thumbnail strip below. `imageKind` switches the route
// between three visual treatments:
//   - `'browser'` frames the image in a faked browser-window chrome (used
//     for software products with a live URL)
//   - `'photo'` renders the image edge-to-edge inside the rounded card
//     (used for real-world businesses where the live URL is a brochure
//     for a place)
//   - `'ipad'` wraps the image in a landscape iPad bezel (used for
//     iPad-only apps with no public URL — the hero is the product)
//
// `url` is optional: showcase-only projects (e.g. internal iPad apps) omit
// it and the route renders no "Visit site" button.
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
    /** Live URL. Omitted for showcase-only projects (e.g. iPad apps without
     *  a public landing page) — the route then renders no "Visit site"
     *  button and skips the hostname pill on `'browser'` frames. */
    url?: string;
    repoUrl?: string;
    roleDe: string;
    roleEn: string;
    taglineDe: string;
    taglineEn: string;
    descriptionDe: string;
    descriptionEn: string;
    /** Short chip-sized tags rendered near the title. Locale-independent. */
    facts?: ReadonlyArray<string>;
    /** Flat ordered tech list — most-distinctive items first. Rendered as
     *  a wrapping row of subtle chips. */
    techStack: ReadonlyArray<string>;
    images: ReadonlyArray<ProjectImage>;
    imageKind: 'browser' | 'photo' | 'ipad';
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
            'Verantwortlich für technische Architektur und Umsetzung seit Tag eins — und Mitgestaltung der Geschäftsprozesse darüber hinaus. Eine zweiseitige Plattform für Gäste und Köche, ergänzt um einen umfangreichen Admin-Bereich als dritte Seite für Operations, Einblicke und Kuration. Mobile, Desktop und Barrierefreiheit als ein Produkt gedacht; SEO und GEO von Anfang an Teil der Architektur.',
        descriptionEn:
            'Owning technical architecture and implementation since day one — and shaping the business processes alongside. A two-sided platform for guests and chefs, complemented by an extensive admin space as a third side for operations, insights and curation. Mobile, desktop and accessibility treated as one product; SEO and GEO baked into the architecture from the start.',
        facts: ['Live since 2022', 'DE + EN'],
        techStack: [
            'TypeScript',
            'Next.js',
            'GraphQL',
            'Nx',
            'Drizzle',
            'MySQL',
            'Vercel AI SDK',
            'Google Gemini',
            'OpenAI',
            'Stripe',
            'Klaviyo',
            'Metabase',
            'Meta WhatsApp',
            'Slack',
        ],
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
        id: 'podologie-dudenhofen',
        name: 'Podologie Dudenhofen',
        url: 'https://podologie-dudenhofen.de',
        roleDe: 'Kundenprojekt',
        roleEn: 'Client work',
        taglineDe: 'Mehrsprachige Praxis-Website mit KI-Assistent und voller Barrierefreiheit.',
        taglineEn: 'Multilingual practice website with an AI assistant and full accessibility.',
        descriptionDe:
            'Vollständig mehrsprachige Praxis-Website in vier Sprachen, inklusive RTL für Arabisch. Leistungen, Preisen und Terminanfragen sind durch einen KI-Assistenten ergänzt, der typische Fragen direkt beantwortet. Mobile-first, barrierefrei und sauber für SEO und GEO aufgesetzt — ersetzt die alte Jimdo-Seite durch einen modernen, eigens entwickelten Stack.',
        descriptionEn:
            'A fully multilingual practice website in four languages, with proper RTL support for Arabic. Services, pricing and appointment requests sit alongside an AI assistant that answers common questions directly. Mobile-first, accessibility-led and built properly for SEO and GEO — replacing the legacy Jimdo site with a modern, custom-built stack.',
        facts: ['4 languages', 'RTL support'],
        techStack: [
            'TypeScript',
            'React',
            'TanStack Start',
            'Tailwind CSS',
            'shadcn/ui',
            'GraphQL',
            'Drizzle',
            'PostgreSQL',
            'Google Gemini',
            'Resend',
        ],
        imageKind: 'browser',
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
    {
        id: 'draw-schema',
        name: 'Draw Schema',
        url: 'https://draw-schema.com',
        // repoUrl: 'https://github.com/CemYil03/draw-schema',
        roleDe: 'Eigenes Projekt',
        roleEn: 'Own project',
        taglineDe: 'Kollaboratives, KI-gestütztes Datenbank-Modellierungs-Tool für Entwicklerteams.',
        taglineEn: 'Collaborative, AI-guided database modelling tool for developer teams.',
        descriptionDe:
            'Ein eigenes SaaS: Schemas im Team in Echtzeit entwerfen, bestehende Codebasen importieren (SQL, Drizzle, TypeORM) und produktionsreife Migrationen generieren. EU-gehostet und Open Source.',
        descriptionEn:
            'A self-built SaaS: design schemas with your team in real-time, import existing codebases (SQL, Drizzle, TypeORM) and generate production-ready migrations. EU-hosted and open source.',
        facts: ['EU-hosted', 'Open source'],
        techStack: [
            'TypeScript',
            'React',
            'TanStack Start',
            'Tailwind CSS',
            'GraphQL',
            'Drizzle',
            'PostgreSQL',
            'Vercel AI SDK',
            'Google Gemini',
            'Stripe',
            'Resend',
        ],
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
        id: 'arm-skill-training',
        name: 'Arm Skill Training',
        // No public URL — iPad-only research tool, distributed inside the
        // study cohort. The row renders without a "Visit site" button.
        roleDe: 'Kundenprojekt — stiftungsfinanziert',
        roleEn: 'Client work — foundation-funded',
        taglineDe: 'iPad-App für die ergotherapeutische Armtrainings-Forschung.',
        taglineEn: 'iPad app for occupational-therapy arm-training research.',
        descriptionDe:
            'Nativ in SwiftUI entwickelte iPad-App, die einen neuen ergotherapeutischen Trainingsansatz für die Doktorarbeit einer Doktorandin überprüfbar macht. Übungen, Patientenakten und Verlaufsdaten werden lokal über SwiftData persistiert; Swift Charts visualisiert Fortschritt und Bewegungsmuster über die Zeit. Vollständig auf Querformat und Tablet-Workflows optimiert.',
        descriptionEn:
            'A native iPad app built in SwiftUI to validate a new occupational-therapy training approach as part of a doctoral dissertation. Exercises, patient records and progress data are persisted locally via SwiftData; Swift Charts visualizes progress and movement patterns over time. Built entirely around landscape and tablet-first workflows.',
        facts: ['iPad only', 'Landscape', 'Research tool'],
        techStack: ['Swift', 'SwiftUI', 'SwiftData', 'Swift Charts', 'iPadOS'],
        imageKind: 'ipad',
        accent: 'oklch(0.74 0.13 200)', // calm cyan — clinical, not corporate
        images: [
            {
                src: '/projects/arm-skill-training/landing-page.png',
                altDe: 'Startbildschirm der Arm Skill Training iPad-App mit Patientenübersicht',
                altEn: 'Arm Skill Training iPad app home screen with patient overview',
            },
            {
                src: '/projects/arm-skill-training/exercise-aiming.png',
                altDe: 'Zielübung der Arm Skill Training App mit Bewegungs-Feedback in Echtzeit',
                altEn: 'Aiming exercise in Arm Skill Training with real-time movement feedback',
            },
        ],
    },
];
