import { tool } from 'ai';
import { z } from 'zod';

// --- toolWriteToConsole ------------------------------------------------------
//
// Prints a message to the server console. Wired into the user-conversation
// agent in `agentUserConversation.ts` and gated by `needsApproval` so the AI
// SDK can suspend the loop and emit a `tool-approval-request` part when the
// chat's `requireToolCallApprovals` is on.
//
// The whole approval lifecycle is SDK-driven — see
// `docs/architecture/chat.md` ("Tool approvals"). On approve, the SDK
// re-enters the agent loop, runs `execute` itself, and feeds the result to
// the model. We do not call `execute` from the respond command.
//
// Reused across agents — keep agent-specific behavior out of here.

interface ToolWriteToConsoleOptions {
    needsApproval: boolean;
}

export function toolWriteToConsole({ needsApproval }: ToolWriteToConsoleOptions) {
    return tool({
        needsApproval,
        description: [
            'Print a message to the server console.',
            'Call this whenever the user explicitly asks you to log, print, or write something to the console.',
        ].join(' '),
        inputSchema: z.object({
            message: z.string().describe('Exact text to print.'),
        }),
        execute({ message }) {
            console.log(message);
            return { ok: true, message };
        },
    });
}
