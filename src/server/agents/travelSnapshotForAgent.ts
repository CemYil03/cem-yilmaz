import { asc, inArray } from 'drizzle-orm';
import type { Trip, TripActivity, TripDay, TripPackingItem } from '../db/schema';
import { tripActivities, tripDays, tripPackingItems, trips } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';

// Compact text snapshot of every trip for embedding in the travel sub-agent's
// system prompt. Same shape as `mediaSnapshotForAgent` /
// `projectsSnapshotForAgent`: each entity keeps its id inline so the agent
// can lift ids for mutation tools without a `tripsList` call. Re-fetched on
// every delegation — trip volume is low (dozens, not thousands), so
// hydrating the full graph is cheap.
export async function travelSnapshotForAgent(serverRuntime: ServerRuntime): Promise<string> {
    const [tripRows, dayRows, activityRows, packingRows] = await loadAll(serverRuntime);

    const lines: string[] = ['## Trips'];
    if (tripRows.length === 0) {
        lines.push('- (no trips yet — create the first one with `tripUpsert`)');
        return lines.join('\n');
    }

    const daysByTripId = new Map<string, TripDay[]>();
    for (const d of dayRows) {
        const list = daysByTripId.get(d.tripId) ?? [];
        list.push(d);
        daysByTripId.set(d.tripId, list);
    }
    const activitiesByDayId = new Map<string, TripActivity[]>();
    for (const a of activityRows) {
        const list = activitiesByDayId.get(a.tripDayId) ?? [];
        list.push(a);
        activitiesByDayId.set(a.tripDayId, list);
    }
    const packingByTripId = new Map<string, TripPackingItem[]>();
    for (const p of packingRows) {
        const list = packingByTripId.get(p.tripId) ?? [];
        list.push(p);
        packingByTripId.set(p.tripId, list);
    }

    for (const trip of tripRows) {
        lines.push('', tripHeader(trip));
        const days = daysByTripId.get(trip.tripId) ?? [];
        if (days.length === 0) {
            lines.push('  - itinerary: (no days yet)');
        } else {
            lines.push('  - itinerary:');
            for (const day of days) {
                lines.push(`    - ${dayHeader(day)}`);
                const activities = activitiesByDayId.get(day.tripDayId) ?? [];
                if (activities.length === 0) {
                    lines.push('      - (no activities)');
                } else {
                    for (const activity of activities) lines.push(`      - ${activityLine(activity)}`);
                }
            }
        }

        const packing = packingByTripId.get(trip.tripId) ?? [];
        const packedCount = packing.filter((p) => p.packed).length;
        if (packing.length === 0) {
            lines.push('  - packing: (empty)');
        } else {
            lines.push(`  - packing: ${packedCount}/${packing.length} packed`);
            const byCategory = new Map<string, TripPackingItem[]>();
            for (const p of packing) {
                const list = byCategory.get(p.category) ?? [];
                list.push(p);
                byCategory.set(p.category, list);
            }
            for (const [category, items] of [...byCategory.entries()].sort(([a], [b]) => a.localeCompare(b))) {
                const label = items
                    .map((p) => `${p.packed ? '✓' : '·'} ${p.label}${p.quantity > 1 ? ` ×${p.quantity}` : ''} (id: ${p.tripPackingItemId})`)
                    .join(', ');
                lines.push(`    - ${category}: ${label}`);
            }
        }
    }

    return lines.join('\n');
}

async function loadAll(serverRuntime: ServerRuntime): Promise<[Trip[], TripDay[], TripActivity[], TripPackingItem[]]> {
    const tripRows = await serverRuntime.db.select().from(trips).orderBy(asc(trips.startsOn), asc(trips.createdAt));
    if (tripRows.length === 0) return [tripRows, [], [], []];

    const tripIds = tripRows.map((t) => t.tripId);
    const dayRows = await serverRuntime.db
        .select()
        .from(tripDays)
        .where(inArray(tripDays.tripId, tripIds))
        .orderBy(asc(tripDays.tripId), asc(tripDays.dayNumber));
    const packingRows = await serverRuntime.db
        .select()
        .from(tripPackingItems)
        .where(inArray(tripPackingItems.tripId, tripIds))
        .orderBy(asc(tripPackingItems.tripId), asc(tripPackingItems.category), asc(tripPackingItems.position));

    let activityRows: TripActivity[] = [];
    if (dayRows.length > 0) {
        const dayIds = dayRows.map((d) => d.tripDayId);
        activityRows = await serverRuntime.db
            .select()
            .from(tripActivities)
            .where(inArray(tripActivities.tripDayId, dayIds))
            .orderBy(asc(tripActivities.tripDayId), asc(tripActivities.position));
    }
    return [tripRows, dayRows, activityRows, packingRows];
}

function tripHeader(trip: Trip): string {
    const dates = trip.startsOn && trip.endsOn ? ` ${trip.startsOn} → ${trip.endsOn}` : trip.startsOn ? ` from ${trip.startsOn}` : '';
    const transport = trip.transportMode ? ` via ${trip.transportMode}` : '';
    return `- ${trip.title} → ${trip.destination}${dates}${transport} [${trip.status}] (id: ${trip.tripId})`;
}

function dayHeader(day: TripDay): string {
    const dateBit = day.date ? ` (${day.date})` : '';
    const titleBit = day.title ? ` — ${day.title}` : '';
    return `Day ${day.dayNumber}${dateBit}${titleBit} (id: ${day.tripDayId})`;
}

function activityLine(activity: TripActivity): string {
    const time = activity.startsAt ? `${activity.startsAt}${activity.endsAt ? `–${activity.endsAt}` : ''} ` : '';
    const loc = activity.location ? ` @ ${activity.location}` : '';
    return `${time}${activity.title}${loc} (id: ${activity.tripActivityId})`;
}
