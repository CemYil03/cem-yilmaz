import type { Meta, StoryObj } from '@storybook/react-vite';
import { CvSkillGroup } from './CvSkillGroup';
import type { CvSkillItem } from './CvSkillGroup';

const meta = {
    title: 'CV/CvSkillGroup',
    component: CvSkillGroup,
    parameters: { layout: 'padded' },
    decorators: [
        (Story) => (
            <div className="mx-auto max-w-4xl p-4">
                <Story />
            </div>
        ),
    ],
    tags: ['autodocs'],
} satisfies Meta<typeof CvSkillGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

const skills = (entries: ReadonlyArray<[CvSkillItem['category'], string]>): CvSkillItem[] =>
    entries.map(([category, label], index) => ({
        cvSkillId: `${category}-${index}`,
        category,
        label,
        position: index,
    }));

const fullSet = skills([
    ['capabilities', 'Software architecture'],
    ['capabilities', 'AI workflows'],
    ['capabilities', 'GraphQL API design'],
    ['capabilities', 'Database modelling'],
    ['frameworks', 'React'],
    ['frameworks', 'TanStack Router'],
    ['frameworks', 'Apollo Server'],
    ['frameworks', 'URQL'],
    ['frameworks', 'Tailwind CSS'],
    ['services', 'PostgreSQL'],
    ['services', 'Vercel AI SDK'],
    ['services', 'Google Gemini'],
    ['tools', 'Vite'],
    ['tools', 'Drizzle ORM'],
    ['tools', 'Vitest'],
    ['tools', 'Playwright'],
    ['languages', 'TypeScript'],
    ['languages', 'JavaScript'],
    ['languages', 'SQL'],
    ['languages', 'ABAP'],
    ['languages', 'Java'],
]);

const oneCategory = skills([
    ['languages', 'TypeScript'],
    ['languages', 'JavaScript'],
    ['languages', 'SQL'],
]);

const sparseAcrossCategories = skills([
    ['capabilities', 'Software architecture'],
    ['languages', 'TypeScript'],
]);

export const Full: Story = {
    name: 'Every category populated',
    args: { skills: fullSet, locale: 'en' },
};

export const German: Story = {
    name: 'German locale — bilingual category headings',
    args: { skills: fullSet, locale: 'de' },
};

export const OneCategoryOnly: Story = {
    name: 'Only one category — empty groups are skipped',
    args: { skills: oneCategory, locale: 'en' },
};

export const SparseAcrossCategories: Story = {
    name: 'Sparse — two categories with a single skill each',
    args: { skills: sparseAcrossCategories, locale: 'en' },
};

export const Empty: Story = {
    name: 'Empty — renders an empty grid',
    args: { skills: [], locale: 'en' },
};
