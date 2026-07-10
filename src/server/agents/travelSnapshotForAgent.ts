import { asc, inArray } from 'drizzle-orm';
import type { AdminTravelTrip, AdminTravelTripActivity, AdminTravelTripDay, AdminTravelTripPackingItem } from '../db/schema';
import { adminTravelTripActivities, adminTravelTripDays, adminTravelTripPackingItems, adminTravelTrips } from '../db/schema';
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
        lines.push('- (no trips yet — create the first one with `tripsUpsert`)');
        return lines.join('\n');
    }

    const daysByTripId = new Map<string, AdminTravelTripDay[]>();
    for (const d of dayRows) {
        const list = daysByTripId.get(d.tripId) ?? [];
        list.push(d);
        daysByTripId.set(d.tripId, list);
    }
    const activitiesByDayId = new Map<string, AdminTravelTripActivity[]>();
    for (const a of activityRows) {
        const list = activitiesByDayId.get(a.tripDayId) ?? [];
        list.push(a);
        activitiesByDayId.set(a.tripDayId, list);
    }
    const packingByTripId = new Map<string, AdminTravelTripPackingItem[]>();
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
            const byCategory = new Map<string, AdminTravelTripPackingItem[]>();
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

async function loadAll(
    serverRuntime: ServerRuntime,
): Promise<[AdminTravelTrip[], AdminTravelTripDay[], AdminTravelTripActivity[], AdminTravelTripPackingItem[]]> {
    const tripRows = await serverRuntime.db
        .select()
        .from(adminTravelTrips)
        .orderBy(asc(adminTravelTrips.startsOn), asc(adminTravelTrips.createdAt));
    if (tripRows.length === 0) return [tripRows, [], [], []];

    const tripIds = tripRows.map((t) => t.tripId);
    const dayRows = await serverRuntime.db
        .select()
        .from(adminTravelTripDays)
        .where(inArray(adminTravelTripDays.tripId, tripIds))
        .orderBy(asc(adminTravelTripDays.tripId), asc(adminTravelTripDays.dayNumber));
    const packingRows = await serverRuntime.db
        .select()
        .from(adminTravelTripPackingItems)
        .where(inArray(adminTravelTripPackingItems.tripId, tripIds))
        .orderBy(
            asc(adminTravelTripPackingItems.tripId),
            asc(adminTravelTripPackingItems.category),
            asc(adminTravelTripPackingItems.position),
        );

    let activityRows: AdminTravelTripActivity[] = [];
    if (dayRows.length > 0) {
        const dayIds = dayRows.map((d) => d.tripDayId);
        activityRows = await serverRuntime.db
            .select()
            .from(adminTravelTripActivities)
            .where(inArray(adminTravelTripActivities.tripDayId, dayIds))
            .orderBy(asc(adminTravelTripActivities.tripDayId), asc(adminTravelTripActivities.position));
    }
    return [tripRows, dayRows, activityRows, packingRows];
}

function tripHeader(trip: AdminTravelTrip): string {
    const dates = trip.startsOn && trip.endsOn ? ` ${trip.startsOn} → ${trip.endsOn}` : trip.startsOn ? ` from ${trip.startsOn}` : '';
    const transport = trip.transportMode ? ` via ${trip.transportMode}` : '';
    return `- ${trip.title} → ${trip.destination}${dates}${transport} [${trip.status}] (id: ${trip.tripId})`;
}

function dayHeader(day: AdminTravelTripDay): string {
    const dateBit = day.date ? ` (${day.date})` : '';
    const titleBit = day.title ? ` — ${day.title}` : '';
    return `Day ${day.dayNumber}${dateBit}${titleBit} (id: ${day.tripDayId})`;
}

function activityLine(activity: AdminTravelTripActivity): string {
    const time = activity.startsAt ? `${activity.startsAt}${activity.endsAt ? `–${activity.endsAt}` : ''} ` : '';
    const loc = activity.location ? ` @ ${activity.location}` : '';
    return `${time}${activity.title}${loc} (id: ${activity.tripActivityId})`;
}
