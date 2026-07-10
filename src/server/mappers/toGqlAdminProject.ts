import type {
    FileUpload,
    AdminProject,
    AdminProjectActivity,
    AdminProjectFile,
    AdminProjectLink,
    AdminProjectRequest,
    AdminProjectTask,
} from '../db/schema';
import type { GqlSAdminProject } from '../graphql/generated';
import { toGqlAdminProjectActivity } from './toGqlAdminProjectActivity';
import { toGqlAdminProjectFile } from './toGqlAdminProjectFile';
import { toGqlAdminProjectLink } from './toGqlAdminProjectLink';
import { toGqlAdminProjectTask } from './toGqlAdminProjectTask';

// `tasks` / `activities` / `links` / `files` are supplied eagerly by the
// list / detail query — the projects board and the detail page each render
// every nested row alongside its project, so a sub-resolver round-trip per
// row would just be N+1 churn. `sourceRequest` is similarly joined once
// at list time; pass `null` for hand-created projects with no source
// request. `totalWorkSec` is precomputed against the same row set so the
// project card can render the total without a follow-up roundtrip.
//
// Per-activity `links` / `files` (the activity rows born those resources
// from) are sliced out of the project-wide lists at the activity step. The
// `fileUploadsById` map drives both the project-level `files` field and
// every activity's nested `files`.
//
// Note: re-exporting `toGqlAdminProjectRequest` here would create a cycle with
// `toGqlAdminProjectRequest.ts` (which imports this file for its
// `convertedProject` field). The list query is responsible for building
// the unwrapped `sourceRequest` shape and handing it in.
export function toGqlAdminProject(
    row: AdminProject,
    tasks: ReadonlyArray<AdminProjectTask>,
    sourceRequest: AdminProjectRequest | null,
    activities: ReadonlyArray<AdminProjectActivity> = [],
    totalWorkSec: number = 0,
    links: ReadonlyArray<AdminProjectLink> = [],
    files: ReadonlyArray<AdminProjectFile> = [],
    fileUploadsById: ReadonlyMap<string, FileUpload> = new Map(),
): GqlSAdminProject {
    return {
        projectId: row.projectId,
        title: row.title,
        description: row.description,
        notes: row.notes,
        status: row.status,
        position: row.position,
        sourceRequest: sourceRequest
            ? {
                  projectRequestId: sourceRequest.projectRequestId,
                  chatId: sourceRequest.chatId,
                  name: sourceRequest.name,
                  email: sourceRequest.email,
                  company: sourceRequest.company,
                  projectType: sourceRequest.projectType,
                  description: sourceRequest.description,
                  budget: sourceRequest.budget,
                  timeline: sourceRequest.timeline,
                  status: sourceRequest.status,
                  verifiedAt: sourceRequest.verifiedAt,
                  createdAt: sourceRequest.createdAt,
                  updatedAt: sourceRequest.updatedAt,
                  convertedProject: null,
              }
            : null,
        startedAt: row.startedAt,
        completedAt: row.completedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        tasks: tasks.map(toGqlAdminProjectTask),
        activities: activities.map((a) =>
            toGqlAdminProjectActivity(
                a,
                links.filter((l) => l.activityId === a.activityId),
                files.filter((f) => f.activityId === a.activityId),
                fileUploadsById,
            ),
        ),
        totalWorkSec,
        links: links.map(toGqlAdminProjectLink),
        files: files
            .map((f) => {
                const upload = fileUploadsById.get(f.fileUploadId);
                return upload ? toGqlAdminProjectFile(f, upload) : null;
            })
            .filter((f): f is NonNullable<typeof f> => f !== null),
    };
}
