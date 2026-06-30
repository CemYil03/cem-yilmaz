import type { Meta, StoryObj } from '@storybook/react-vite';
import { MockVisitorChatProvider, MockWorkspaceAssistantChatProvider } from '../storybook/MockChatProviders';
import { WorkspaceHeader } from './WorkspaceHeader';

// `WorkspaceHeader` builds its breadcrumb trail from `useLocation()` against
// the `WORKSPACE_TITLES` map. The story-side router (configured in
// `.storybook/preview.tsx`) only mounts a `/` route, so the trail here will
// always read "Workspace". Production behavior — segment-by-segment crumbs
// with icons — is covered by `Header.stories.tsx` via `breadcrumbs` args.

const meta = {
    title: 'Layout/WorkspaceHeader',
    component: WorkspaceHeader,
    parameters: { layout: 'fullscreen' },
    decorators: [
        (Story) => (
            <MockVisitorChatProvider>
                <MockWorkspaceAssistantChatProvider>
                    <div className="relative min-h-[320px] w-full bg-background">
                        <Story />
                    </div>
                </MockWorkspaceAssistantChatProvider>
            </MockVisitorChatProvider>
        ),
    ],
    tags: ['autodocs'],
} satisfies Meta<typeof WorkspaceHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
