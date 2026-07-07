import { asc, desc, sql } from 'drizzle-orm';
import type { MedicalAppointment, MedicalCategory, MedicalRecord } from '../db/schema';
import { medicalAppointments, medicalRecords } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { MEDICAL_CATEGORY_CADENCE } from './medicalCategoryCadence';

// Compact text snapshot of the admin's medical history for embedding in
// `agentPersonalAssistantMedical`'s system prompt. Same shape as
// `mediaSnapshotForAgent`: each row keeps its id inline so the sub-agent
// can lift ids for mutation tools without burning a `medicalRecordsList`
// call. Re-fetched on every delegation — both tables are single-user and
// journal-scale.
//
// Grouped by category so the sub-agent's mental model matches the way the
// user thinks ("dentist", "GP") and matches the overview UI. Cadence /
// last-visit is precomputed for each category so red flags ("your dentist
// is overdue") land without a follow-up read.
export async function medicalSnapshotForAgent(serverRuntime: ServerRuntime): Promise<string> {
    const [appointmentRows, recordRows] = await Promise.all([
        serverRuntime.db
            .select()
            .from(medicalAppointments)
            .orderBy(
                sql`CASE ${medicalAppointments.status}
                        WHEN 'scheduled' THEN 0
                        WHEN 'completed' THEN 1
                        WHEN 'missed' THEN 2
                        WHEN 'cancelled' THEN 3
                        ELSE 4
                    END`,
                asc(medicalAppointments.scheduledAt),
            ),
        serverRuntime.db.select().from(medicalRecords).orderBy(desc(medicalRecords.occurredAt), desc(medicalRecords.createdAt)),
    ]);

    const now = new Date();
    const appointmentsByCategory = groupByCategory(appointmentRows);
    const recordsByCategory = groupByCategory(recordRows);
    const categories = Array.from(new Set<MedicalCategory>([...appointmentsByCategory.keys(), ...recordsByCategory.keys()]));
    categories.sort();

    const lines: string[] = ['## Medical'];
    if (categories.length === 0) {
        lines.push('- (no medical records or appointments tracked yet)');
        return lines.join('\n');
    }

    for (const category of categories) {
        lines.push('', `### ${category}`);
        const cadence = MEDICAL_CATEGORY_CADENCE[category];
        const categoryAppointments = appointmentsByCategory.get(category) ?? [];
        const completed = categoryAppointments
            .filter((a) => a.status === 'completed' && a.completedAt !== null)
            .sort((a, b) => b.completedAt!.getTime() - a.completedAt!.getTime());
        const upcoming = categoryAppointments
            .filter((a) => a.status === 'scheduled' && a.scheduledAt.getTime() >= now.getTime())
            .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
        const lastCompleted = completed[0] ?? null;

        let nextDueAt: Date | null = null;
        if (lastCompleted?.nextDueAt) {
            nextDueAt = lastCompleted.nextDueAt;
        } else if (lastCompleted?.completedAt && cadence !== null) {
            const derived = new Date(lastCompleted.completedAt);
            derived.setMonth(derived.getMonth() + cadence);
            nextDueAt = derived;
        } else if (upcoming.length > 0) {
            nextDueAt = upcoming[0]!.scheduledAt;
        }
        const overdue = nextDueAt !== null && nextDueAt.getTime() < now.getTime();

        const meta: string[] = [];
        if (cadence !== null) meta.push(`cadence: every ${cadence} months`);
        if (lastCompleted?.completedAt) meta.push(`last visit: ${lastCompleted.completedAt.toISOString().slice(0, 10)}`);
        if (nextDueAt) meta.push(`${overdue ? '⚠️ OVERDUE — ' : ''}next due: ${nextDueAt.toISOString().slice(0, 10)}`);
        if (meta.length > 0) lines.push(`_${meta.join(' · ')}_`);

        if (upcoming.length > 0) {
            lines.push('Upcoming:');
            for (const a of upcoming.slice(0, 3)) lines.push(appointmentLine(a));
        }
        if (completed.length > 0) {
            lines.push('Recent visits:');
            for (const a of completed.slice(0, 3)) lines.push(appointmentLine(a));
        }
        const categoryRecords = recordsByCategory.get(category) ?? [];
        if (categoryRecords.length > 0) {
            lines.push('Records:');
            for (const r of categoryRecords.slice(0, 5)) lines.push(recordLine(r));
        }
    }

    return lines.join('\n');
}

function groupByCategory<T extends { category: MedicalCategory }>(rows: T[]): Map<MedicalCategory, T[]> {
    const map = new Map<MedicalCategory, T[]>();
    for (const row of rows) {
        const bucket = map.get(row.category) ?? [];
        bucket.push(row);
        map.set(row.category, bucket);
    }
    return map;
}

function appointmentLine(row: MedicalAppointment): string {
    const when = row.scheduledAt.toISOString().slice(0, 10);
    const status = row.status !== 'scheduled' ? `, ${row.status}` : '';
    const provider = row.providerName ? ` @ ${row.providerName}` : '';
    return `- ${when}: ${row.title}${provider} (id: ${row.appointmentId}${status})`;
}

function recordLine(row: MedicalRecord): string {
    const when = (row.occurredAt ?? row.createdAt).toISOString().slice(0, 10);
    const severity = row.severity ? `, ${row.severity}` : '';
    const symptoms = row.symptoms.length > 0 ? `, symptoms: ${row.symptoms.join('/')}` : '';
    return `- ${when}: ${row.title} (id: ${row.recordId}${severity}${symptoms})`;
}
