import type { AdminMedicalAppointment } from '../db/schema';
import type { GqlSAdminMedicalAppointment } from '../graphql/generated';

export function toGqlAdminMedicalAppointment(row: AdminMedicalAppointment): GqlSAdminMedicalAppointment {
    return {
        appointmentId: row.appointmentId,
        category: row.category,
        providerName: row.providerName,
        title: row.title,
        notes: row.notes,
        scheduledAt: row.scheduledAt,
        completedAt: row.completedAt,
        nextDueAt: row.nextDueAt,
        status: row.status,
        topics: row.topics,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}
