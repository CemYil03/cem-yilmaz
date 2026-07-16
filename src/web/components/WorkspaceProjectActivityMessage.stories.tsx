import type { Meta, StoryObj } from '@storybook/react-vite';
import { WorkspaceProjectActivityMessage } from './WorkspaceProjectActivityMessage';
import type { WorkspaceProjectActivityRow } from './WorkspaceProjectActivityConstants';

// Visual-only story for the project Activity-tab message rows. Verifies the
// three direction layouts (outgoing / incoming / internal) and the opaque
// contrast on incoming + internal rows over a tinted backdrop.

const meta = {
    title: 'Workspace/ProjectActivityMessage',
    component: WorkspaceProjectActivityMessage,
} satisfies Meta<typeof WorkspaceProjectActivityMessage>;

export default meta;
type Story = StoryObj<typeof meta>;

function row(partial: Partial<WorkspaceProjectActivityRow>): WorkspaceProjectActivityRow {
    return {
        __typename: 'AdminProjectActivity',
        activityId: crypto.randomUUID(),
        projectId: 'p-1',
        taskId: null,
        kind: 'note',
        channel: null,
        direction: 'internal',
        title: null,
        notes: null,
        occurredAt: '2026-07-16T13:49:00.000Z',
        startedAt: null,
        endedAt: null,
        durationSec: null,
        amountCents: null,
        offerStatus: null,
        links: [],
        files: [],
        ...partial,
    } as WorkspaceProjectActivityRow;
}

const rows: ReadonlyArray<WorkspaceProjectActivityRow> = [
    row({ kind: 'clientContact', channel: 'phone', direction: 'incoming', notes: 'Kunde ruft an: Budget passt.' }),
    row({ kind: 'clientContact', channel: 'malt', direction: 'incoming', notes: 'dsadsad' }),
    row({ kind: 'meeting', channel: 'videoCall', direction: 'internal', notes: 'Kickoff-Call, alles besprochen.' }),
    row({ kind: 'offer', direction: 'outgoing', notes: 'Angebot v1 verschickt.', amountCents: 250000, offerStatus: 'sent' }),
    row({ kind: 'note', direction: 'internal', notes: 'dsdsadasda' }),
    row({ kind: 'work', direction: 'internal', durationSec: 4500, endedAt: '2026-07-16T15:04:00.000Z' }),
];

// Rendered over a brand-tinted panel to mirror the workspace ambient backdrop —
// this is where the old translucent bubbles washed out.
export const Timeline: Story = {
    args: { activity: rows[0]!, locale: 'de', onEdit: () => {}, onDelete: () => {} },
    render: () => (
        <div className="min-h-screen bg-[radial-gradient(closest-side,var(--brand)_0%,transparent_70%)] p-8">
            <ol className="mx-auto flex max-w-3xl flex-col gap-3">
                {rows.map((r) => (
                    <li key={r.activityId} data-row-id={r.activityId}>
                        <WorkspaceProjectActivityMessage activity={r} locale="de" onEdit={() => {}} onDelete={() => {}} />
                    </li>
                ))}
            </ol>
        </div>
    ),
};
