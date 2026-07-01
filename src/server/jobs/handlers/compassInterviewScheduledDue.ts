import { eq, or } from 'drizzle-orm';
import { compassInterviews } from '../../db/schema';
import type { CompassInterviewCreate } from '../../db/schema';
import { COMPASS_INTERVIEW_CRON } from '../../agents/compassInterviewConfig';
import type { RecurringJobDefinition } from '../types';

// Scheduled cron — see `docs/features/compass.md` ("Psychological-interview
// agent"). Fires on the cadence set by `COMPASS_INTERVIEW_CRON` (the cron
// expression is the single source of truth — change it there, not here) and
// inserts a `pending` interview row that Cem can start the next time he
// opens `/workspace/compass`.
//
// IDEMPOTENT. The handler short-circuits when an open interview (pending or
// in_progress) already exists, so:
//
// - Two firings in the same minute (pg-boss redelivery, manual replay) do
//   not produce two pending rows.
// - A tick where Cem never opened the previous pending interview does not
//   pile a second one on top — he sees the existing one when he comes back.
// - A worker crash that misses a firing simply resumes on the next one.
//
// `endReason`/`completedAt` stay null; they only fill in on transitions.
export const compassInterviewScheduledDue: RecurringJobDefinition = {
    kind: 'recurring',
    name: 'compass-interview-scheduled-due',
    cron: COMPASS_INTERVIEW_CRON,
    handler: async ({ serverRuntime }) => {
        try {
            const [existing] = await serverRuntime.db
                .select({ interviewId: compassInterviews.interviewId, status: compassInterviews.status })
                .from(compassInterviews)
                .where(or(eq(compassInterviews.status, 'pending'), eq(compassInterviews.status, 'in_progress')))
                .limit(1);

            if (existing) {
                serverRuntime.log.info(
                    `compassInterviewScheduledDue: open interview ${existing.interviewId} (status=${existing.status}) already exists — skipping`,
                );
                return;
            }

            const now = new Date();
            const insert: CompassInterviewCreate = {
                interviewId: crypto.randomUUID(),
                status: 'pending',
                dueAt: now,
                triggerReason: 'scheduled',
                observationCount: 0,
            };
            await serverRuntime.db.insert(compassInterviews).values(insert);
            serverRuntime.log.info(`compassInterviewScheduledDue: created pending interview ${insert.interviewId}`);
        } catch (error) {
            serverRuntime.log.error(error, null);
            throw error;
        }
    },
    options: {
        retryLimit: 2,
        retryDelay: 120,
        expireInSeconds: 60,
    },
};
