import type { ProjectActivity } from '../db/schema';
import type { GqlSProjectActivity } from '../graphql/generated';

// Straight one-to-one mapping — the table columns and the GraphQL type
// were designed together. `channel` is null on rows whose `kind` is not
// `clientContact` / `meeting`; the UI hides the field for those kinds.
export function toGqlProjectActivity(row: ProjectActivity): GqlSProjectActivity {
    return {
        activityId: row.activityId,
        projectId: row.projectId,
        taskId: row.taskId,
        kind: row.kind,
        channel: row.channel,
        title: row.title,
        notes: row.notes,
        occurredAt: row.occurredAt,
        startedAt: row.startedAt,
        endedAt: row.endedAt,
        durationSec: row.durationSec,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}
