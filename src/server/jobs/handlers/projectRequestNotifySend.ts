import { eq } from 'drizzle-orm';
import { projectRequests } from '../../db/schema';
import type { AdminProjectRequestType } from '../../db/schema';
import type { QueuedJobDefinition } from '../types';

// Email Cem the full project brief, *after* the visitor has proved control
// of their email address (the verify tool flipped the row to
// `emailVerified` and enqueued this job). The handler refuses to send if
// the row is in any other state — defense in depth against a future
// caller that forgets to gate on verification.
//
// Sets `replyTo` to the (now-verified) visitor address so Cem can reply
// directly. See `docs/features/project-requests.md`.

export interface ProjectRequestNotifySendData {
    projectRequestId: string;
}

const PROJECT_TYPE_LABELS: Record<AdminProjectRequestType, string> = {
    webApp: 'Web app',
    mobile: 'Mobile app',
    consulting: 'Consulting',
    aiIntegration: 'AI integration',
    other: 'Other',
};

export const projectRequestNotifySend: QueuedJobDefinition<ProjectRequestNotifySendData> = {
    kind: 'queued',
    name: 'project-request-notify-send',
    handler: async ({ data, serverRuntime }) => {
        const { projectRequestId } = data;

        const [row] = await serverRuntime.db
            .select()
            .from(projectRequests)
            .where(eq(projectRequests.projectRequestId, projectRequestId))
            .limit(1);
        if (!row) {
            serverRuntime.log.warn(`projectRequestNotifySend: ${projectRequestId} not found`);
            return;
        }
        if (row.status !== 'emailVerified') {
            // Refuse to send a brief for an unverified row even if a caller
            // somehow enqueued us. The verify tool is the only legitimate
            // enqueue site; anything else is a bug.
            serverRuntime.log.error(
                new Error(`projectRequestNotifySend: refusing to send ${projectRequestId} in status=${row.status}`),
                null,
            );
            return;
        }

        const projectTypeLabel = PROJECT_TYPE_LABELS[row.projectType];
        const lines = [
            `New project request from ${row.name} <${row.email}>`,
            ``,
            `Name: ${row.name}`,
            `Email: ${row.email}  (verified at ${row.verifiedAt?.toISOString() ?? '—'})`,
            row.company ? `Company: ${row.company}` : null,
            `Type: ${projectTypeLabel}`,
            row.budget ? `Budget: ${row.budget}` : null,
            row.timeline ? `Timeline: ${row.timeline}` : null,
            ``,
            `Description:`,
            row.description,
            ``,
            `— sent via the visitor chat on cem-yilmaz.de`,
            `AdminProject request id: ${projectRequestId}`,
        ].filter((line): line is string => line !== null);
        const text = lines.join('\n');

        const htmlRows = [
            ['Name', row.name],
            ['Email', `${row.email} <span style="color:#888">(verified)</span>`],
            row.company ? ['Company', row.company] : null,
            ['Type', projectTypeLabel],
            row.budget ? ['Budget', row.budget] : null,
            row.timeline ? ['Timeline', row.timeline] : null,
        ].filter((entry): entry is [string, string] => entry !== null);
        const html = [
            `<p>New project request from <strong>${escapeHtml(row.name)}</strong> &lt;${escapeHtml(row.email)}&gt;</p>`,
            `<table style="border-collapse:collapse;font-size:14px">`,
            ...htmlRows.map(
                ([label, value]) =>
                    `<tr><td style="padding:4px 12px 4px 0;color:#666;vertical-align:top">${escapeHtml(label)}</td><td style="padding:4px 0">${value}</td></tr>`,
            ),
            `</table>`,
            `<h3 style="margin-top:24px">Description</h3>`,
            `<p style="white-space:pre-wrap">${escapeHtml(row.description)}</p>`,
            `<hr />`,
            `<p style="color:#888;font-size:12px">Sent via the visitor chat on cem-yilmaz.de. AdminProject request id: ${projectRequestId}</p>`,
        ].join('');

        await serverRuntime.emailService.sendEmail({
            to: { email: serverRuntime.emailService.cemPrimaryAddress, name: 'Cem Yilmaz' },
            replyTo: row.email,
            subject: `[AdminProject request] ${projectTypeLabel} — ${row.name}`,
            text,
            html,
        });
        serverRuntime.log.info(`projectRequestNotifySend: delivered ${projectRequestId} (${projectTypeLabel})`);
    },
    options: {
        retryLimit: 3,
        retryDelay: 60,
        expireInSeconds: 600,
    },
};

function escapeHtml(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
