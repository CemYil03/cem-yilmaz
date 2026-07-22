import type { Meta, StoryObj } from '@storybook/react-vite';
import { MockVisitorChatProvider, MockWorkspaceAssistantChatProvider } from '../storybook/MockChatProviders';
import { HeaderChatButton } from './HeaderChatButton';
import { SidebarProvider } from './base/sidebar';

// Two variants of the same affordance — `visitor` (default, public site) and
// `workspace` (admin assistant). Both rely on a chat context; the stories
// wrap them in the mock providers so the button renders without throwing.
// The workspace variant additionally calls `useSidebar()`, so the stories
// mount a `<SidebarProvider />` around it — the real workspace layout does
// the same.

const meta = {
    title: 'Header/HeaderChatButton',
    component: HeaderChatButton,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <MockVisitorChatProvider>
                <MockWorkspaceAssistantChatProvider>
                    <SidebarProvider>
                        <Story />
                    </SidebarProvider>
                </MockWorkspaceAssistantChatProvider>
            </MockVisitorChatProvider>
        ),
    ],
    tags: ['autodocs'],
} satisfies Meta<typeof HeaderChatButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Visitor: Story = {
    name: 'Visitor — MessageCircle icon, opens visitor sheet',
    args: { variant: 'visitor' },
};

export const Workspace: Story = {
    name: 'Workspace — Sparkles icon, toggles assistant sidebar',
    args: { variant: 'workspace' },
};

export const Pulsing: Story = {
    name: 'Pulsing — fires the highlight pulse on close',
    decorators: [
        (Story) => (
            // Bump the highlight signal from 0 → 1 on mount via React's
            // commit phase to trigger the pulse animation. A fresh mount is
            // the same edge as "the user just closed the sheet".
            <MockVisitorChatProvider highlightSignal={1}>
                <MockWorkspaceAssistantChatProvider>
                    <SidebarProvider>
                        <Story />
                    </SidebarProvider>
                </MockWorkspaceAssistantChatProvider>
            </MockVisitorChatProvider>
        ),
    ],
    args: { variant: 'visitor' },
};
