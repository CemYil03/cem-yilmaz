import { asc, inArray } from 'drizzle-orm';
import type { AdminTravelTrip, AdminTravelTripActivity, AdminTravelTripDay, AdminTravelTripPackingItem } from '../db/schema';
import { tripActivities, tripDays, tripPackingItems, trips } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { deriveDayDate } from '../mappers/toGqlAdminTravelTripDay';

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
                lines.push(`    - ${dayHeader(day, trip.startsOn)}`);
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

    let activityRows: AdminTravelTripActivity[] = [];
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

function tripHeader(trip: AdminTravelTrip): string {
    const dates = trip.startsOn && trip.endsOn ? ` ${trip.startsOn} → ${trip.endsOn}` : trip.startsOn ? ` from ${trip.startsOn}` : '';
    const transport = trip.transportMode ? ` via ${trip.transportMode}` : '';
    // Status is planning intent only; the time-phase word is derived so the
    // agent reads the same "underway / upcoming / past" the UI shows.
    const phase = trip.status === 'cancelled' ? '' : ` ${derivePhase(trip.startsOn, trip.endsOn)}`;
    return `- ${trip.title} → ${trip.destination}${dates}${transport} [${trip.status}${phase}] (id: ${trip.tripId})`;
}

// Today as `yyyy-MM-dd` in UTC — the same basis `deriveDayDate` uses, so a
// day's derived date and the phase comparison never straddle a tz boundary.
function todayIso(): string {
    return new Date().toISOString().slice(0, 10);
}

function derivePhase(startsOn: string | null, endsOn: string | null): 'planning' | 'upcoming' | 'underway' | 'past' {
    if (!startsOn) return 'planning';
    const today = todayIso();
    if (endsOn && endsOn < today) return 'past';
    if (startsOn > today) return 'upcoming';
    return 'underway';
}

function dayHeader(day: AdminTravelTripDay, tripStartsOn: string | null): string {
    const derived = deriveDayDate(tripStartsOn, day.dayNumber);
    const dateBit = derived ? ` (${derived})` : '';
    const titleBit = day.title ? ` — ${day.title}` : '';
    return `Day ${day.dayNumber}${dateBit}${titleBit} (id: ${day.tripDayId})`;
}

function activityLine(activity: AdminTravelTripActivity): string {
    const time = activity.startsAt ? `${activity.startsAt}${activity.endsAt ? `–${activity.endsAt}` : ''} ` : '';
    const loc = activity.location ? ` @ ${activity.location}` : '';
    return `${time}${activity.title}${loc} (id: ${activity.tripActivityId})`;
}
