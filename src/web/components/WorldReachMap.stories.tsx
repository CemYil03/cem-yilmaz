import type { Meta, StoryObj } from '@storybook/react-vite';
import { WorldReachMap } from './WorldReachMap';

const meta = {
    title: 'Marketing/WorldReachMap',
    component: WorldReachMap,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[720px] max-w-[90vw] text-foreground/80">
                <Story />
            </div>
        ),
    ],
    tags: ['autodocs'],
} satisfies Meta<typeof WorldReachMap>;

export default meta;
type Story = StoryObj<typeof meta>;

const BERLIN = { label: 'Berlin', lat: 52.52, lng: 13.405, anchor: true } as const;
const NEW_YORK = { label: 'New York', lat: 40.7128, lng: -74.006 } as const;
const SAN_FRANCISCO = { label: 'San Francisco', lat: 37.7749, lng: -122.4194 } as const;
const BENGALURU = { label: 'Bengaluru', lat: 12.9716, lng: 77.5946 } as const;
const SINGAPORE = { label: 'Singapore', lat: 1.3521, lng: 103.8198 } as const;
const SYDNEY = { label: 'Sydney', lat: -33.8688, lng: 151.2093 } as const;
const LONDON = { label: 'London', lat: 51.5074, lng: -0.1278 } as const;

export const Default: Story = {
    name: 'Default — Berlin anchor + three regions',
    args: {
        title: 'Cem reaches across three timezones from Berlin',
        markers: [BERLIN, NEW_YORK, BENGALURU],
        arcsFromAnchorTo: [1, 2],
    },
};

export const Sparse: Story = {
    name: 'Sparse — only the anchor',
    args: {
        title: 'Berlin only',
        markers: [BERLIN],
        arcsFromAnchorTo: [],
    },
};

export const Dense: Story = {
    name: 'Dense — anchor + many regions',
    args: {
        title: 'Multi-region reach',
        markers: [BERLIN, NEW_YORK, SAN_FRANCISCO, BENGALURU, SINGAPORE, SYDNEY, LONDON],
        arcsFromAnchorTo: [1, 2, 3, 4, 5, 6],
    },
};

export const NoAnchor: Story = {
    name: 'No anchor — arcs are skipped',
    parameters: {
        docs: {
            description: {
                story: 'When no marker carries `anchor: true` the component skips the arc rendering entirely and renders pins only.',
            },
        },
    },
    args: {
        title: 'Markers without an anchor',
        markers: [NEW_YORK, BENGALURU, SYDNEY],
        arcsFromAnchorTo: [0, 1, 2],
    },
};

export const Empty: Story = {
    name: 'Empty markers — silhouettes only',
    args: {
        title: 'Empty world map',
        markers: [],
        arcsFromAnchorTo: [],
    },
};
