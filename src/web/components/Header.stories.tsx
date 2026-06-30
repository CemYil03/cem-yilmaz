import type { Meta, StoryObj } from '@storybook/react-vite';
import { Header } from './Header';
import { CodeXmlIcon, FolderKanbanIcon } from 'lucide-react';
import { MockVisitorChatProvider, MockWorkspaceAssistantChatProvider } from '../storybook/MockChatProviders';

// `Header` is the floating glass nav used across every public page. Stories
// stage it inside a fixed-height background that mimics the landing page so
// the sticky positioning and the progressive-blur layer above it are
// visible at preview size.

const meta = {
    title: 'Layout/Header',
    component: Header,
    parameters: { layout: 'fullscreen' },
    decorators: [
        (Story) => (
            <MockVisitorChatProvider>
                <MockWorkspaceAssistantChatProvider>
                    <div className="relative min-h-[420px] w-full bg-background">
                        <Story />
                        <div className="mx-auto mt-12 max-w-6xl px-4 pb-12 text-sm text-muted-foreground">
                            Page content scrolls under the floating header. The progressive blur layer fades the content where it approaches
                            the header.
                        </div>
                    </div>
                </MockWorkspaceAssistantChatProvider>
            </MockVisitorChatProvider>
        ),
    ],
    tags: ['autodocs'],
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

const NAV_ITEMS = [
    { label: { de: 'Über mich', en: 'About me' }, href: '/about' },
    { label: { de: 'Lebenslauf', en: 'CV' }, href: '/cv' },
    { label: { de: 'Projekte', en: 'Projects' }, href: '/projects' },
] as const;

export const Default: Story = {
    name: 'Default — brand + nav + selectors',
    args: { navItems: NAV_ITEMS },
};

export const WithSubtitle: Story = {
    name: 'With subtitle',
    args: { subtitle: '/ design preview', navItems: NAV_ITEMS },
};

export const BrandLabel: Story = {
    name: 'Brand-as-label — logo + "Workspace" plain text',
    args: { brandLabel: 'Workspace' },
};

export const Breadcrumbs: Story = {
    name: 'Breadcrumb trail (workspace-style)',
    args: {
        breadcrumbs: [
            { label: 'Workspace', to: '/workspace' },
            { label: 'Software', icon: CodeXmlIcon },
        ],
        hideSelectors: true,
        chatVariant: 'workspace',
    },
};

export const BreadcrumbsDeep: Story = {
    name: 'Breadcrumb trail — deep path collapses to icon-only intermediates',
    args: {
        breadcrumbs: [
            { label: 'Workspace', to: '/workspace' },
            { label: 'Projects', icon: FolderKanbanIcon, iconOnly: true, to: '/workspace/projects' },
            { label: 'Site relaunch' },
        ],
        hideSelectors: true,
        chatVariant: 'workspace',
    },
};

export const NoNav: Story = {
    name: 'No nav (e.g. legal pages)',
    args: {},
};
