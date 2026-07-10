import { asc, desc, inArray } from 'drizzle-orm';
import { medicalCategories, medicalAppointments, medicalRecordFiles, medicalRecords, fileUploads } from '../db/schema';
import type { FileUpload, AdminMedicalAppointment, AdminMedicalCategory, AdminMedicalRecord, AdminMedicalRecordFile } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMedicalCategoryOverview, GqlSSession } from '../graphql/generated';
import { MEDICAL_CATEGORY_CADENCE } from '../agents/medicalCategoryCadence';
import { toGqlAdminMedicalAppointment } from '../mappers/toGqlAdminMedicalAppointment';
import { toGqlAdminMedicalRecord } from '../mappers/toGqlAdminMedicalRecord';
import { toGqlAdminMedicalRecordFile } from '../mappers/toGqlAdminMedicalRecordFile';

// How many recent records to preview per category on the Overview card.
const RECENT_RECORDS_PER_CATEGORY = 3;

// One row per `AdminMedicalCategory` for the Overview tab. For each category:
//   - `lastCompletedAt` = most recent `completed` appointment's `completedAt`
//   - `nextDueAt`       = the last completed visit's explicit override
//                         (`nextDueAt`) OR its `completedAt + defaultCadence`
//                         OR (fallback) the earliest currently-scheduled
//                         appointment
//   - `isOverdue`       = `nextDueAt < now` when a date exists
//   - `upcoming`        = all `scheduled` appointments in this category
//   - `recentRecords`   = last few records in this category
//
// Categories with no data still surface with `defaultCadenceMonths` filled
// in so the overview never has a hole in the grid.
export async function adminMedicalCategoryOverviewFindMany(
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminMedicalCategoryOverview[]> {
    try {
        const now = new Date();

        // One trip per relation — the total row count is small (single-user,
        // journal-scale) so we don't need per-category pagination or JSON
        // aggregation.
        const appointmentRows = await serverRuntime.db.select().from(medicalAppointments).orderBy(asc(medicalAppointments.scheduledAt));

        const recordRows = await serverRuntime.db
            .select()
            .from(medicalRecords)
            .orderBy(desc(medicalRecords.occurredAt), desc(medicalRecords.createdAt));

        // Files: join in for `recentRecords` previews. We only need files
        // for the top-N-per-category records, but computing that set here
        // requires the per-category grouping below — so we resolve records
        // first, then look up files for the ones that made the cut.
        const appointmentsByCategory = new Map<AdminMedicalCategory, AdminMedicalAppointment[]>();
        for (const a of appointmentRows) {
            const bucket = appointmentsByCategory.get(a.category) ?? [];
            bucket.push(a);
            appointmentsByCategory.set(a.category, bucket);
        }

        const recordsByCategory = new Map<AdminMedicalCategory, AdminMedicalRecord[]>();
        for (const r of recordRows) {
            const bucket = recordsByCategory.get(r.category) ?? [];
            bucket.push(r);
            recordsByCategory.set(r.category, bucket);
        }

        const shortlistedRecords: AdminMedicalRecord[] = [];
        const shortlistedByCategory = new Map<AdminMedicalCategory, AdminMedicalRecord[]>();
        for (const category of medicalCategories) {
            const bucket = (recordsByCategory.get(category) ?? []).slice(0, RECENT_RECORDS_PER_CATEGORY);
            shortlistedByCategory.set(category, bucket);
            shortlistedRecords.push(...bucket);
        }

        // Load files only for the shortlisted records — the overview never
        // needs the full attachment set of every record, so we save a
        // large fan-out join by scoping to the previews.
        const filesByRecordId = new Map<string, AdminMedicalRecordFile[]>();
        const uploadsById = new Map<string, FileUpload>();
        if (shortlistedRecords.length > 0) {
            const shortlistedIds = shortlistedRecords.map((r) => r.recordId);
            const fileRows = await serverRuntime.db
                .select()
                .from(medicalRecordFiles)
                .where(inArray(medicalRecordFiles.recordId, shortlistedIds))
                .orderBy(desc(medicalRecordFiles.pinned), desc(medicalRecordFiles.createdAt));

            for (const f of fileRows) {
                const list = filesByRecordId.get(f.recordId) ?? [];
                list.push(f);
                filesByRecordId.set(f.recordId, list);
            }

            if (fileRows.length > 0) {
                const uploadIds = Array.from(new Set(fileRows.map((f) => f.fileUploadId)));
                const uploadRows = await serverRuntime.db.select().from(fileUploads).where(inArray(fileUploads.fileUploadId, uploadIds));
                for (const u of uploadRows) uploadsById.set(u.fileUploadId, u);
            }
        }

        return medicalCategories.map((category) => {
            const inCategory = appointmentsByCategory.get(category) ?? [];

            const completed = inCategory
                .filter((a) => a.status === 'completed' && a.completedAt !== null)
                .sort((a, b) => b.completedAt!.getTime() - a.completedAt!.getTime());
            const lastCompleted = completed[0] ?? null;
            const upcoming = inCategory
                .filter((a) => a.status === 'scheduled' && a.scheduledAt.getTime() >= now.getTime())
                .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

            const cadenceMonths = MEDICAL_CATEGORY_CADENCE[category];

            let nextDueAt: Date | null = null;
            if (lastCompleted?.nextDueAt) {
                nextDueAt = lastCompleted.nextDueAt;
            } else if (lastCompleted?.completedAt && cadenceMonths !== null) {
                const derived = new Date(lastCompleted.completedAt);
                derived.setMonth(derived.getMonth() + cadenceMonths);
                nextDueAt = derived;
            } else if (upcoming.length > 0) {
                nextDueAt = upcoming[0]!.scheduledAt;
            }

            const isOverdue = nextDueAt !== null && nextDueAt.getTime() < now.getTime();

            const shortlisted = shortlistedByCategory.get(category) ?? [];
            const recentRecords = shortlisted.map((row) => {
                const rowFiles = filesByRecordId.get(row.recordId) ?? [];
                const files = rowFiles
                    .map((f) => {
                        const upload = uploadsById.get(f.fileUploadId);
                        return upload ? toGqlAdminMedicalRecordFile(f, upload) : null;
                    })
                    .filter((f): f is NonNullable<typeof f> => f !== null);
                return toGqlAdminMedicalRecord(row, files);
            });

            return {
                category,
                defaultCadenceMonths: cadenceMonths,
                lastCompletedAt: lastCompleted?.completedAt ?? null,
                nextDueAt,
                isOverdue,
                upcoming: upcoming.map(toGqlAdminMedicalAppointment),
                recentRecords,
            } satisfies GqlSAdminMedicalCategoryOverview;
        });
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
