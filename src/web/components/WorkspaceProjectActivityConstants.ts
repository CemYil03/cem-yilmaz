import { parseISO } from 'date-fns';
import { FlagIcon, HandshakeIcon, PhoneCallIcon, StickyNoteIcon, TimerIcon, VideoIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type {
    GqlCAdminProjectActivityChannel,
    GqlCAdminProjectActivityDirection,
    GqlCAdminProjectActivityKind,
    GqlCAdminProjectOfferStatus,
    GqlCWorkspaceProjectDetailUserFragment,
} from '../graphql/generated';
import type { Locale } from '../utils/locale';

// Activity-specific constants, labels, and helpers for the project detail
// page's Activity tab. Extracted from `projects_.$projectId.tsx` so the
// timeline / message / composer cluster (all `WorkspaceProjectActivity*`)
// share one source of truth. A handful of these (`ACTIVITY_KIND_ICONS`,
// `ACTIVITY_KIND_LABELS`, `activityHeading`, `formatDuration`) are also
// re-imported by the route's Overview tab. See
// `docs/features/workspace-projects.md`.

// Row-type aliases derived from the detail-page fragment, shared by every
// `WorkspaceProjectActivity*` component and the route.
type WorkspaceProjectDetailAdmin = NonNullable<GqlCWorkspaceProjectDetailUserFragment['admin']>;
type ProjectRow = WorkspaceProjectDetailAdmin['adminProjectFindOne'];
export type WorkspaceProjectTaskRow = ProjectRow['tasks'][number];
export type WorkspaceProjectActivityRow = ProjectRow['activities'][number];

export const ACTIVITY_KIND_ORDER: ReadonlyArray<GqlCAdminProjectActivityKind> = [
    'clientContact',
    'meeting',
    'work',
    'offer',
    'milestone',
    'note',
];
export const ACTIVITY_KIND_LABELS: Record<GqlCAdminProjectActivityKind, { de: string; en: string }> = {
    clientContact: { de: 'Kundenkontakt', en: 'Client contact' },
    meeting: { de: 'Meeting', en: 'Meeting' },
    work: { de: 'Arbeit', en: 'Work' },
    offer: { de: 'Angebot', en: 'Offer' },
    milestone: { de: 'Meilenstein', en: 'Milestone' },
    note: { de: 'Notiz', en: 'Note' },
};
export const ACTIVITY_KIND_ICONS: Record<GqlCAdminProjectActivityKind, LucideIcon> = {
    clientContact: PhoneCallIcon,
    meeting: VideoIcon,
    work: TimerIcon,
    offer: HandshakeIcon,
    milestone: FlagIcon,
    note: StickyNoteIcon,
};
export const ACTIVITY_CHANNEL_ORDER: ReadonlyArray<GqlCAdminProjectActivityChannel> = [
    'malt',
    'email',
    'phone',
    'videoCall',
    'inPerson',
    'aiAssistant',
    'other',
];
export const ACTIVITY_CHANNEL_LABELS: Record<GqlCAdminProjectActivityChannel, { de: string; en: string }> = {
    malt: { de: 'Malt', en: 'Malt' },
    email: { de: 'E-Mail', en: 'Email' },
    phone: { de: 'Telefon', en: 'Phone' },
    videoCall: { de: 'Videoanruf', en: 'Video call' },
    inPerson: { de: 'Vor Ort', en: 'In person' },
    aiAssistant: { de: 'KI-Assistent', en: 'AI assistant' },
    other: { de: 'Sonstiges', en: 'Other' },
};

// Direction picker labels for the activity composer. `internal` is set by the
// server for `work` / `note` / `milestone` rows and is not surfaced as a
// choice in the picker.
export const ACTIVITY_DIRECTION_LABELS: Record<GqlCAdminProjectActivityDirection, { de: string; en: string }> = {
    outgoing: { de: 'Von mir', en: 'From me' },
    incoming: { de: 'Vom Kunden', en: 'From client' },
    internal: { de: 'Intern', en: 'Internal' },
};

export const OFFER_STATUS_ORDER: ReadonlyArray<GqlCAdminProjectOfferStatus> = ['sent', 'accepted', 'rejected', 'withdrawn'];
export const OFFER_STATUS_LABELS: Record<GqlCAdminProjectOfferStatus, { de: string; en: string }> = {
    sent: { de: 'Gesendet', en: 'Sent' },
    accepted: { de: 'Angenommen', en: 'Accepted' },
    rejected: { de: 'Abgelehnt', en: 'Rejected' },
    withdrawn: { de: 'Zurückgezogen', en: 'Withdrawn' },
};

// Channels where a duration is meaningful (a live conversation has a length).
// Async channels (Malt messages, email, AI chat) do not — the duration field
// is hidden for those so the composer doesn't ask for a number that has no
// answer.
export const DURATION_CHANNELS: ReadonlyArray<GqlCAdminProjectActivityChannel> = ['phone', 'videoCall', 'inPerson'];

// Kind + channel-aware default direction for the composer (matches
// `resolveDirection` in the server command). The form pre-fills with this when
// adding a new row. A video call is a shared moment — `internal`, centered like
// a note — regardless of kind.
export function defaultDirectionForKind(
    kind: GqlCAdminProjectActivityKind,
    channel: GqlCAdminProjectActivityChannel | null,
): GqlCAdminProjectActivityDirection {
    if (kind === 'work' || kind === 'note' || kind === 'milestone') return 'internal';
    if (channel === 'videoCall') return 'internal';
    if (kind === 'clientContact') return 'incoming';
    return 'outgoing';
}

// The one-line heading shown for an activity row. Manual composer entries carry
// no title (their whole body lives in `notes`); fall back to the kind label so
// a titleless row still reads as something in glance views.
export function activityHeading(activity: WorkspaceProjectActivityRow, locale: Locale): string {
    return activity.title ?? ACTIVITY_KIND_LABELS[activity.kind][locale];
}

export function formatDuration(totalSec: number): string {
    if (totalSec < 60) return `${totalSec}s`;
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    return `${minutes}m`;
}

export function isSameDay(aIso: string, bIso: string): boolean {
    const a = parseISO(aIso);
    const b = parseISO(bIso);
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
