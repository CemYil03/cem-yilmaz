import { tool } from 'ai';
import { z } from 'zod';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import type { ProjectsAgentMutation, ProjectsAgentMutationLog } from './agentPersonalAssistantProjects';
import { agentPersonalAssistantProjects } from './agentPersonalAssistantProjects';

// Orchestrator-side tool that delegates a project/task brief to
// `agentPersonalAssistantProjects`. Runs the sub-agent in-process inside
// `execute`, returns its summary plus a structured mutation log the
// orchestrator narrates back to the user. See
// `docs/architecture/agent-delegation.md` for the pattern, the trade-offs,
// and the `needsMoreInfo` sentinel contract.
//
// The sub-agent's intermediate tool calls do NOT land in chat-message rows
// — this delegate tool's result row carries the mutation log instead. That
// is the deliberate compactness trade-off: one row in the transcript per
// delegation, not one per touched DB row.

const delegateToProjectsInputSchema = z.object({
    brief: z
        .string()
        .min(1)
        .max(2000)
        .describe(
            [
                "Natural-language instruction for the projects sub-agent. Pass the user's request verbatim plus any context",
                'you have collected (project ids referenced in earlier turns, dates the user named). The sub-agent has the',
                "live project board in its system prompt — you don't need to summarize it here.",
            ].join(' '),
        ),
});

interface DelegateToProjectsContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

interface NeedsMoreInfoSentinel {
    status: 'needsMoreInfo' | 'noOp';
    missingFields: string[];
    summary: string;
}

export function toolDelegateToProjects({ serverRuntime, session }: DelegateToProjectsContext) {
    return tool({
        description: [
            'Hand a project or task instruction to the projects sub-agent. Use this for ANY ask that touches the',
            'workspace projects board or its tasks — listing, creating, updating, archiving, deleting, summarizing',
            'progress, moving tasks between projects. Pass the brief in natural language; the sub-agent has its own',
            'tools and a live snapshot of the board.',
            "The tool result is shaped `{ status: 'completed' | 'needsMoreInfo' | 'noOp', summary, mutations? }`.",
            'On `needsMoreInfo`, call `promptUserForInput` to gather the slots named in `missingFields`, then call',
            'this tool again with the brief enriched by their answers.',
            'On `noOp`, the sub-agent decided the request is not in its domain — fall back to a plain conversational',
            'reply or another tool.',
            'On `completed`, narrate `summary` and (optionally) the `mutations` list back to the user.',
        ].join(' '),
        inputSchema: delegateToProjectsInputSchema,
        execute: async (input) => {
            const mutations: ProjectsAgentMutationLog = [];
            const agent = await agentPersonalAssistantProjects({ session, serverRuntime, mutations });
            const result = await agent.generate({ messages: [{ role: 'user', content: input.brief }] });
            const text = typeof result.text === 'string' ? result.text : '';

            const sentinel = tryParseSentinel(text);
            if (sentinel) {
                return {
                    status: sentinel.status,
                    summary: sentinel.summary,
                    missingFields: sentinel.missingFields,
                    mutations,
                } as const;
            }

            return {
                status: 'completed' as const,
                summary: text,
                mutations: mutations satisfies ProjectsAgentMutation[],
            };
        },
    });
}

// The sub-agent is coached to emit JSON-only as its final text when it
// cannot complete the brief. Accept the bare object or a fenced ```json
// block defensively — Gemini occasionally wraps things even when told not to.
function tryParseSentinel(text: string): NeedsMoreInfoSentinel | null {
    const trimmed = text.trim();
    if (!trimmed) return null;

    const candidates = [trimmed];
    const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch?.[1]) candidates.push(fenceMatch[1].trim());

    for (const candidate of candidates) {
        if (!candidate.startsWith('{')) continue;
        try {
            const parsed = JSON.parse(candidate);
            if (parsed && typeof parsed === 'object' && (parsed.status === 'needsMoreInfo' || parsed.status === 'noOp')) {
                const missingFields = Array.isArray(parsed.missingFields)
                    ? parsed.missingFields.filter((field: unknown): field is string => typeof field === 'string')
                    : [];
                const summary = typeof parsed.summary === 'string' ? parsed.summary : '';
                return { status: parsed.status, missingFields, summary };
            }
        } catch {
            // not JSON — keep looking
        }
    }
    return null;
}
