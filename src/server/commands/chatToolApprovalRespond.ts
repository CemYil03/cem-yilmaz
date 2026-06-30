import { eq } from 'drizzle-orm';
import type { ChatMutationDispatch } from './chatMessageCreate';
import { chatAssistantTurnRunDetached } from './chatAssistantTurnRun';
import { chatMessageAppend } from './chatMessageAppend';
import type { ChatMessageCreate as ChatMessageRowCreate, ChatMessageToolApprovalResponseCreate } from '../db/schema';
import { chats, chatMessages, chatMessagesToolApprovalRequest, chatMessagesToolApprovalResponse } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSChatMessageCreateResult, GqlSMutationChatToolApprovalRespondArgs, GqlSSession } from '../graphql/generated';

// Persists the human's Approve/Decline decision in response to a
// `ChatMessageToolApprovalRequest`, then runs the next assistant turn via the
// shared detached helper.
//
// Tool execution itself is owned by the AI SDK: on the next turn,
// `toModelMessages` replays the stored response as a `tool-approval-response`
// part, the SDK's `collectToolApprovals` picks it up, runs the approved
// tool's `execute` (or emits a synthetic `execution-denied` result for
// declines), and feeds the outcome back into the LLM. This command's only
// job is to durably record the human's decision and kick the next turn off.

export async function chatToolApprovalRespond(
    adminUserId: string | null,
    { approvalId, approved, reason, assistantOptions }: GqlSMutationChatToolApprovalRespondArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
    dispatch: ChatMutationDispatch,
): Promise<GqlSChatMessageCreateResult | null> {
    try {
        // Phase 1 — Resolve the approval request and the chat it belongs to.
        // The join verifies the request row exists and is reachable from a
        // real chat; the cookie session keeps cross-user attempts out.
        const requestRow = await serverRuntime.db
            .select({
                requestMessageId: chatMessagesToolApprovalRequest.chatMessageId,
                approvalId: chatMessagesToolApprovalRequest.approvalId,
                chatId: chatMessages.chatId,
                scope: chats.scope,
            })
            .from(chatMessagesToolApprovalRequest)
            .innerJoin(chatMessages, eq(chatMessages.chatMessageId, chatMessagesToolApprovalRequest.chatMessageId))
            .innerJoin(chats, eq(chats.chatId, chatMessages.chatId))
            .where(eq(chatMessagesToolApprovalRequest.approvalId, approvalId))
            .limit(1)
            .then((rows) => rows[0] ?? null);

        if (!requestRow) {
            serverRuntime.log.error(new Error(`chatToolApprovalRespond: no request row for approvalId=${approvalId}`), requestingSession);
            return null;
        }
        // Reject an approvalId that lives in the other namespace's scope.
        if (requestRow.scope !== dispatch.scope) {
            serverRuntime.log.error(
                new Error(
                    `chatToolApprovalRespond: approvalId=${approvalId} has scope=${requestRow.scope} but mutation namespace requires scope=${dispatch.scope}`,
                ),
                requestingSession,
            );
            return null;
        }

        // Refuse if a response already exists. The unique constraint on
        // `chatMessagesToolApprovalResponse.approvalId` would also catch this,
        // but the pre-check returns a clean null instead of letting the
        // transaction explode on insert.
        const existingResponse = await serverRuntime.db
            .select({ chatMessageId: chatMessagesToolApprovalResponse.chatMessageId })
            .from(chatMessagesToolApprovalResponse)
            .where(eq(chatMessagesToolApprovalResponse.approvalId, approvalId))
            .limit(1)
            .then((rows) => rows[0] ?? null);

        if (existingResponse) {
            serverRuntime.log.error(
                new Error(`chatToolApprovalRespond: response already recorded for approvalId=${approvalId}`),
                requestingSession,
            );
            return null;
        }

        const { chatId } = requestRow;

        // Phase 2 — Persist the response row. `toModelMessages` replays this
        // on the next turn as the SDK's `tool-approval-response` part; the
        // SDK then runs `execute` (or injects an `execution-denied` result
        // for declines) before stepping the LLM.
        const responseMessageId = crypto.randomUUID();
        const responseSpine: ChatMessageRowCreate = {
            chatMessageId: responseMessageId,
            chatId,
            kind: 'toolApprovalResponse',
            authorUserId: null,
            parentChatMessageId: null,
            createdAt: new Date(),
        };
        const responseVariant: ChatMessageToolApprovalResponseCreate = {
            chatMessageId: responseMessageId,
            approvalId,
            approved,
            // Schema-symmetric: stored on approve too even though only the
            // Decline UI exposes the textarea today. `toModelMessages`
            // forwards it onto the SDK's `tool-approval-response` part so
            // the LLM sees the human's justification on the synthetic
            // denied tool-result.
            reason: reason ?? null,
        };
        await chatMessageAppend(serverRuntime.db, serverRuntime, assistantOptions.generationId, responseSpine, async (transaction) => {
            await transaction.insert(chatMessagesToolApprovalResponse).values(responseVariant);
        });

        // Admin sends fan out `userUpdates` after the response commits.
        // Visitor (public) scope stays quiet.
        if (adminUserId && dispatch.scope === 'admin') {
            await serverRuntime.publish.userUpdates({ userId: adminUserId });
        }

        // Phase 3 — Run the resumed assistant turn detached. The helper
        // re-loads the rows itself; the SDK then sees the approval-response
        // as the last tool message and resolves the gated call (executing
        // on approve, synthesizing a denied result on decline) before
        // stepping the LLM.
        chatAssistantTurnRunDetached({
            chatId,
            requestingSession,
            assistantOptions,
            serverRuntime,
            agentFactory: dispatch.agentFactory,
            // The approval-respond path doesn't carry a page path — the
            // Approve/Decline card was already mounted inside the chat
            // surface, and the agent has the prior turn's context to anchor
            // against.
            currentPagePath: null,
        });

        return {
            chatId,
            chatMessageId: responseMessageId,
        };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        return null;
    }
}
