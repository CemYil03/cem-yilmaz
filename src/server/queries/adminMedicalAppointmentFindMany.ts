import { asc, desc, sql } from 'drizzle-orm';
import { medicalAppointments } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMedicalAppointment, GqlSSession } from '../graphql/generated';
import { toGqlMedicalAppointment } from '../mappers/toGqlMedicalAppointment';

// Lists every appointment. Ordered so upcoming visits float to the top
// (scheduled ASC by `scheduledAt` — the soonest future date first),
// followed by completed/cancelled/missed rows in reverse chronological
// order. The medical page's Appointments tab groups by category and then
// by this order within each group.
export async function adminMedicalAppointmentFindMany(
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMedicalAppointment[]> {
    try {
        const rows = await serverRuntime.db
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
                // Scheduled: soonest first; everything else: most recent first.
                sql`CASE WHEN ${medicalAppointments.status} = 'scheduled' THEN ${medicalAppointments.scheduledAt} END ASC NULLS LAST`,
                desc(medicalAppointments.scheduledAt),
                asc(medicalAppointments.appointmentId),
            );
        return rows.map(toGqlMedicalAppointment);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
