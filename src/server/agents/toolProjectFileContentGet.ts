import { tool } from 'ai';
import { z } from 'zod';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { adminProjectFileContentFindOne } from '../queries/adminProjectFileContentFindOne';

// Read tool for `agentPersonalAssistantProjects`. Decodes an attached project
// file to a UTF-8 `content` string so the sub-agent can actually read what is
// attached to a project — the offer/brief/note markdown it (or Cem) attached,
// the contract text, etc. `projectsList` / `projectGet` only surface file
// *metadata* (filename, media type, size); the bytes live behind an HTTP
// download route the in-process agent can't fetch. This closes that gap the
// same way the standalone-docs `workspaceFileGet` tool does. Binary files
// (PDF, images) return `readable: false` + the download `url` rather than
// dumping bytes — the agent should point Cem at the file instead of reading it.

const projectFileContentGetInputSchema = z.object({
    projectFileId: z
        .uuid()
        .describe('The project file to read. Ids come from a `projectGet` / `projectsList` result or a just-created file.'),
});

interface ProjectsAgentReadContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolProjectFileContentGet({ serverRuntime, session }: ProjectsAgentReadContext) {
    return tool({
        description: [
            "Read the text content of a file attached to a project. Use this to see a document's body before you",
            'summarize, quote, or revise it — a drafted offer, a brief, a contract, a note. Returns `readable: true`',
            'with the full `content` for text/markdown files. For binary files (PDF, images) it returns',
            '`readable: false` and a `url` — do NOT try to read those; tell Cem to open the file at that link',
            'instead. To CHANGE an existing markdown file, read it here first, then re-create it with',
            '`projectFileCreate` (there is no in-place file edit).',
        ].join(' '),
        inputSchema: projectFileContentGetInputSchema,
        execute: async (input) => {
            return adminProjectFileContentFindOne(input.projectFileId, session, serverRuntime);
        },
    });
}
