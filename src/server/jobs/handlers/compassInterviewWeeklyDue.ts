import { eq, or } from 'drizzle-orm';
import { compassInterviews } from '../../db/schema';
import type { CompassInterviewCreate } from '../../db/schema';
import { COMPASS_INTERVIEW_CRON } from '../../agents/compassInterviewConfig';
import type { RecurringJobDefinition } from '../types';

// Weekly cron — see `docs/features/compass.md` ("Psychological-interview
// agent"). Inserts a `pending` interview row that Cem can start the next
// time he opens `/workspace/compass`.
//
// IDEMPOTENT. The handler short-circuits when an open interview (pending or
// in_progress) already exists, so:
//
// - Two firings in the same minute (pg-boss redelivery, manual replay) do
//   not produce two pending rows.
// - A week where Cem never opened last week's pending interview does not
//   pile a second one on top — he sees the existing one when he comes back.
// - A worker crash that misses a Monday simply resumes the next Monday.
//
// `endReason`/`completedAt` stay null; they only fill in on transitions.
export const compassInterviewWeeklyDue: RecurringJobDefinition = {
    kind: 'recurring',
    name: 'compass-interview-weekly-due',
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
                    `compassInterviewWeeklyDue: open interview ${existing.interviewId} (status=${existing.status}) already exists — skipping`,
                );
                return;
            }

            const now = new Date();
            const insert: CompassInterviewCreate = {
                interviewId: crypto.randomUUID(),
                status: 'pending',
                dueAt: now,
                triggerReason: 'weekly_cron',
                observationCount: 0,
            };
            await serverRuntime.db.insert(compassInterviews).values(insert);
            serverRuntime.log.info(`compassInterviewWeeklyDue: created pending interview ${insert.interviewId}`);
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
