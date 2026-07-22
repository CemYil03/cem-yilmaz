import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CvTimelineEntry } from './CvTimeline';
import { CvTimeline } from './CvTimeline';

const meta = {
    title: 'CV/CvTimeline',
    component: CvTimeline,
    parameters: { layout: 'padded' },
    decorators: [
        (Story) => (
            <div className="mx-auto max-w-3xl p-4">
                <Story />
            </div>
        ),
    ],
    tags: ['autodocs'],
} satisfies Meta<typeof CvTimeline>;

export default meta;
type Story = StoryObj<typeof meta>;

const experienceEnglish: ReadonlyArray<CvTimelineEntry> = [
    {
        id: 'sap',
        title: 'Senior Software Engineer',
        subtitle: 'SAP SE · Walldorf, Germany',
        startDate: '2023-09-01',
        endDate: null,
        description:
            'Architecting AI-assisted workflows for enterprise customers and shipping the end-to-end web stack — TypeScript, React, GraphQL, Postgres — that ties them together.',
        technologies: ['TypeScript', 'React', 'GraphQL', 'PostgreSQL', 'Drizzle', 'AI SDK'],
    },
    {
        id: 'apprenticeship',
        title: 'IT Apprentice (Anwendungsentwicklung)',
        subtitle: 'SAP SE · Walldorf, Germany',
        startDate: '2020-09-01',
        endDate: '2023-08-31',
        description:
            'Three-year dual-study programme combining hands-on engineering rotations with an applied-CS degree. Built internal tooling, contributed to ABAP/Java services, and ran a community of practice for new joiners.',
        footnote: 'Awarded "Best Apprentice" by the Rhein-Neckar IHK in 2023.',
    },
    {
        id: 'school',
        title: 'Abitur · 1.4',
        subtitle: 'Eichendorff-Gymnasium · Sinsheim',
        startDate: '2012-09-01',
        endDate: '2020-06-30',
    },
];

const experienceGerman: ReadonlyArray<CvTimelineEntry> = [
    {
        id: 'sap',
        title: 'Senior Software Engineer',
        subtitle: 'SAP SE · Walldorf, Deutschland',
        startDate: '2023-09-01',
        endDate: null,
        description:
            'Architektur KI-gestützter Workflows für Großkunden und Umsetzung des gesamten Web-Stacks — TypeScript, React, GraphQL, Postgres — der sie zusammenhält.',
        technologies: ['TypeScript', 'React', 'GraphQL', 'PostgreSQL'],
    },
];

const noDescription: ReadonlyArray<CvTimelineEntry> = [
    {
        id: 'sap',
        title: 'Senior Software Engineer',
        subtitle: 'SAP SE · Walldorf, Germany',
        startDate: '2023-09-01',
        endDate: null,
    },
    {
        id: 'apprenticeship',
        title: 'IT Apprentice',
        subtitle: 'SAP SE · Walldorf, Germany',
        startDate: '2020-09-01',
        endDate: '2023-08-31',
    },
];

const singleOngoing: ReadonlyArray<CvTimelineEntry> = [experienceEnglish[0]!];

const longDescription: ReadonlyArray<CvTimelineEntry> = [
    {
        id: 'big',
        title: 'Tech Lead, Enterprise AI Platform',
        subtitle: 'SAP SE · Walldorf, Germany',
        startDate: '2023-09-01',
        endDate: null,
        description:
            'Owned the architecture and rollout of an internal platform that lets product teams ship AI features without rebuilding the same plumbing each time. Designed the agent-runtime layer, the evaluation harness, the secrets/quota model, and the audit pipeline. Worked across product, security, and platform groups to land a coherent design — and wrote most of the docs that the wider org now uses to onboard. Reduced time-to-first-prototype for new teams from six weeks to under three days.',
        technologies: ['TypeScript', 'React', 'GraphQL', 'Apollo Server', 'PostgreSQL', 'Drizzle', 'Vercel AI SDK', 'Google Gemini'],
        footnote: 'Patent application in progress on the evaluation harness.\nAlso presented internally at TechEd.',
    },
];

export const Experience: Story = {
    args: { entries: experienceEnglish, locale: 'en' },
};

export const ExperienceGerman: Story = {
    name: 'German locale — "heute" instead of "today"',
    args: { entries: experienceGerman, locale: 'de' },
};

export const NoDescription: Story = {
    name: 'Bare entries (no description, technologies, or footnote)',
    args: { entries: noDescription, locale: 'en' },
};

export const SingleOngoing: Story = {
    name: 'Single ongoing entry',
    args: { entries: singleOngoing, locale: 'en' },
};

export const LongDescription: Story = {
    name: 'Long description + many technologies + footnote',
    args: { entries: longDescription, locale: 'en' },
};

export const Empty: Story = {
    name: 'Empty array — renders nothing',
    args: { entries: [], locale: 'en' },
};
