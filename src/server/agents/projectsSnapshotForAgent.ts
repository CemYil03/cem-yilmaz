import { asc, isNull } from 'drizzle-orm';
import type { Project, ProjectStatus, Task } from '../db/schema';
import { projects, tasks } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';

// Compact text snapshot of the projects board for embedding in
// `agentPersonalAssistantProjects`'s system prompt. The sub-agent reads the
// snapshot at construction time so it can answer "what projects do I have?"
// or address a project by id without burning a `projectsList` tool step.
// Re-fetched on every delegation — the table is small (indexed by `(status,
// position)`) and the freshness is more valuable than the saved query.
//
// Format keeps the project id on each line: the sub-agent's mutation tools
// take ids, and we want it to be able to lift one straight out of the prompt
// rather than guessing or re-querying. Task counts are pre-bucketed by
// status so the sub-agent can answer progress questions without listing.
//
// Mirrors `cvSummaryForAgent.ts` — a single async helper returning one
// already-newline-joined string. Caller embeds it into the prompt directly.
export async function projectsSnapshotForAgent(serverRuntime: ServerRuntime): Promise<string> {
    const [projectRows, taskRows, standaloneTaskRows] = await Promise.all([
        serverRuntime.db.select().from(projects).orderBy(asc(projects.status), asc(projects.position)),
        serverRuntime.db.select().from(tasks).orderBy(asc(tasks.status), asc(tasks.position)),
        serverRuntime.db.select().from(tasks).where(isNull(tasks.projectId)).orderBy(asc(tasks.position)),
    ]);

    const tasksByProject = new Map<string, Task[]>();
    for (const task of taskRows) {
        if (!task.projectId) continue;
        const bucket = tasksByProject.get(task.projectId) ?? [];
        bucket.push(task);
        tasksByProject.set(task.projectId, bucket);
    }

    const byStatus = new Map<ProjectStatus, Project[]>();
    for (const project of projectRows) {
        const bucket = byStatus.get(project.status) ?? [];
        bucket.push(project);
        byStatus.set(project.status, bucket);
    }

    const lines: string[] = ['## Projects'];
    if (projectRows.length === 0) {
        lines.push('- (no projects yet)');
    } else {
        for (const status of ['idea', 'planning', 'active', 'paused', 'done', 'archived'] as const) {
            const bucket = byStatus.get(status);
            if (!bucket || bucket.length === 0) continue;
            lines.push(`### ${status}`);
            for (const project of bucket) lines.push(projectLine(project, tasksByProject.get(project.projectId) ?? []));
        }
    }

    lines.push('', '## Standalone tasks (no project)');
    if (standaloneTaskRows.length === 0) {
        lines.push('- (none)');
    } else {
        for (const task of standaloneTaskRows) lines.push(standaloneTaskLine(task));
    }

    return lines.join('\n');
}

function projectLine(project: Project, projectTasks: Task[]): string {
    const total = projectTasks.length;
    const done = projectTasks.filter((task) => task.status === 'done').length;
    const taskFragment = total === 0 ? 'no tasks' : `${done}/${total} tasks done`;
    return `- ${project.title} (id: ${project.projectId}, ${taskFragment})`;
}

function standaloneTaskLine(task: Task): string {
    return `- ${task.title} (id: ${task.taskId}, ${task.status})`;
}
