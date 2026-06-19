// Static identity facts for the site. Used by:
//   - the public pages (`/`, `/about`, `/cv`, `/impressum`)
//   - SEO heads (rare — most pages set their own title/description)
//   - the visitor AI agent's system prompt (so it can answer "where does
//     Cem live?" / "how do I contact Cem?" deterministically)
//
// Edited via PR. Things that change once a decade live here; things that
// change a few times a year (jobs, skills, hobbies) live in the DB and are
// edited from `/workspace/cv`. See `docs/features/cv.md`.
//
// `publicVisibility` controls which contact channels render on the public
// site. The phone number is hidden by default — `/impressum` is the legal
// surface that needs it, not `/about`. Flip a flag here rather than wiring
// each page's render block.

interface BilingualText {
    de: string;
    en: string;
}

interface PersonalInfo {
    fullName: string;
    dateOfBirth: string; // ISO yyyy-mm-dd
    placeOfBirth: string;
    nationality: BilingualText;
    residence: { postalCode: string; city: string };
    spokenLanguages: ReadonlyArray<BilingualText>;
    tagline: BilingualText;
    subtitle: BilingualText;
    bio: BilingualText;
    contact: {
        phone: string;
        emails: ReadonlyArray<string>;
        github: { handle: string; url: string };
        linkedin: { handle: string; url: string };
    };
    publicVisibility: {
        phone: boolean;
        emails: boolean;
        github: boolean;
        linkedin: boolean;
    };
}

export const personalInfo: PersonalInfo = {
    fullName: 'Cem Yilmaz',
    dateOfBirth: '1999-03-26',
    placeOfBirth: 'Ludwigshafen am Rhein',
    nationality: { de: 'deutsch', en: 'German' },
    residence: { postalCode: '67373', city: 'Dudenhofen' },
    spokenLanguages: [
        { de: 'Deutsch (Muttersprache)', en: 'German (native)' },
        { de: 'Englisch (Fortgeschritten)', en: 'English (advanced)' },
    ],
    tagline: { de: 'Full-Stack & AI Engineer', en: 'Full-Stack & AI Engineer' },
    subtitle: {
        de: 'mit Enterprise- und Startup-Erfahrung.',
        en: 'with enterprise and startup experience.',
    },
    bio: {
        de: 'Hi, ich bin Cem — Full-Stack- und AI-Engineer mit Erfahrung in großen SAP-Projekten und in Startups. Ich baue Produkte, die Menschen tatsächlich nutzen, von der Datenbank bis zum Pixel. Diese Seite ist gleichzeitig mein Portfolio und meine private Plattform.',
        en: 'Hi, I’m Cem — a full-stack and AI engineer with experience across large SAP projects and startups. I build products people actually use, from the database to the pixel. This site is both my portfolio and my private platform.',
    },
    contact: {
        phone: '+49 1525 6207005',
        emails: ['yilmaz.cem.2603@gmail.com', 'cem.yilmaz@sap.com'],
        github: { handle: 'CemYil03', url: 'https://github.com/CemYil03' },
        linkedin: {
            handle: 'cem-yilmaz-b28ab21b4',
            url: 'https://www.linkedin.com/in/cem-yilmaz-b28ab21b4/',
        },
    },
    publicVisibility: {
        phone: false,
        emails: true,
        github: true,
        linkedin: true,
    },
};
