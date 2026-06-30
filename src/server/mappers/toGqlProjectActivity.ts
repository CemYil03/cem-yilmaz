import type { ProjectActivity, ProjectFile, ProjectLink, FileUpload } from '../db/schema';
import type { GqlSProjectActivity } from '../graphql/generated';
import { toGqlProjectFile } from './toGqlProjectFile';
import { toGqlProjectLink } from './toGqlProjectLink';

// Straight one-to-one mapping — the table columns and the GraphQL type
// were designed together. `channel` is null on rows whose `kind` is not
// `clientContact` / `meeting`; the UI hides the field for those kinds.
// `amountCents` / `offerStatus` are meaningful only when `kind = offer`.
//
// `links` and `files` are supplied eagerly by the list / detail query —
// they're joined against the activity's id in the same pass that loads
// the project itself. Pass empty arrays when none exist; pass the upload
// row lookup so file rows resolve their `fileUpload` field without a
// follow-up roundtrip.
export function toGqlProjectActivity(
    row: ProjectActivity,
    links: ReadonlyArray<ProjectLink> = [],
    files: ReadonlyArray<ProjectFile> = [],
    fileUploadsById: ReadonlyMap<string, FileUpload> = new Map(),
): GqlSProjectActivity {
    return {
        activityId: row.activityId,
        projectId: row.projectId,
        taskId: row.taskId,
        kind: row.kind,
        channel: row.channel,
        direction: row.direction,
        title: row.title,
        notes: row.notes,
        occurredAt: row.occurredAt,
        startedAt: row.startedAt,
        endedAt: row.endedAt,
        durationSec: row.durationSec,
        amountCents: row.amountCents,
        offerStatus: row.offerStatus,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        links: links.map(toGqlProjectLink),
        files: files
            .map((f) => {
                const upload = fileUploadsById.get(f.fileUploadId);
                return upload ? toGqlProjectFile(f, upload) : null;
            })
            .filter((f): f is NonNullable<typeof f> => f !== null),
    };
}
