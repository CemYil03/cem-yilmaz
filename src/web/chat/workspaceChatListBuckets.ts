import { differenceInCalendarDays, parseISO } from 'date-fns';
import type { GqlCWorkspaceChatListItemFragment } from '../graphql/generated';

// Chat list bucketing shared by the workspace assistant surfaces. The
// sidebar's chat browser groups its paged results by day so the user
// scans by "today / yesterday / this week / earlier" instead of ten
// identical "vor N Stunden" rows. Bucketing is calendar-day based so a
// chat modified last night reads as "Yesterday" even if the wall-clock
// delta is only a few hours.

type ChatBucketKey = 'today' | 'yesterday' | 'thisWeek' | 'earlier';

export interface ChatBucket {
    key: ChatBucketKey;
    label: { de: string; en: string };
    chats: ReadonlyArray<GqlCWorkspaceChatListItemFragment>;
}

const LABELS: Record<ChatBucketKey, { de: string; en: string }> = {
    today: { de: 'Heute', en: 'Today' },
    yesterday: { de: 'Gestern', en: 'Yesterday' },
    thisWeek: { de: 'Diese Woche', en: 'This week' },
    earlier: { de: 'Früher', en: 'Earlier' },
};

const ORDER: ReadonlyArray<ChatBucketKey> = ['today', 'yesterday', 'thisWeek', 'earlier'];

// The list arrives newest-first from the server. Bucketing preserves that
// order within each bucket, so the top row of each section is the most
// recently modified chat in it. `now` is a parameter so tests can pin a
// clock without patching globals.
export function bucketChatsByDay(
    chats: ReadonlyArray<GqlCWorkspaceChatListItemFragment>,
    now: Date = new Date(),
): ReadonlyArray<ChatBucket> {
    const bucketed: Record<ChatBucketKey, GqlCWorkspaceChatListItemFragment[]> = {
        today: [],
        yesterday: [],
        thisWeek: [],
        earlier: [],
    };
    for (const chat of chats) {
        const lastModified = parseISO(chat.lastModifiedAt as unknown as string);
        const delta = differenceInCalendarDays(now, lastModified);
        if (delta <= 0) bucketed.today.push(chat);
        else if (delta === 1) bucketed.yesterday.push(chat);
        else if (delta < 7) bucketed.thisWeek.push(chat);
        else bucketed.earlier.push(chat);
    }
    return ORDER.filter((key) => bucketed[key].length > 0).map((key) => ({
        key,
        label: LABELS[key],
        chats: bucketed[key],
    }));
}
