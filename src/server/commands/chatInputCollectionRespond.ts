import { eq } from 'drizzle-orm';
import type { ChatMutationDispatch } from './chatMessageCreate';
import { chatAssistantTurnRunDetached } from './chatAssistantTurnRun';
import { chatMessageAppend } from './chatMessageAppend';
import type { ChatAssistantInputValue, ChatMessageUserInputAnswer as ChatMessageUserInputAnswerPayload } from '../db/chatPayloadTypes';
import type { ChatMessageCreate as ChatMessageRowCreate, ChatMessageUserInputCreate } from '../db/schema';
import { chats, chatMessages, chatMessagesAssistantInputCollection, chatMessagesUserInput } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSChatAssistantInputValueKind,
    GqlSChatMessageCreateResult,
    GqlSChatMessageUserInputAnswerCreate,
    GqlSMutationChatInputCollectionRespondArgs,
    GqlSSession,
} from '../graphql/generated';

// Persists a `ChatMessageUserInput` row in response to an assistant input
// collection, then runs the next assistant turn via the shared detached
// helper. The agent's transcript replay (`toModelMessages`) automatically
// pairs the new userInput row with its collection as a `promptUserForInput`
// tool-result, so the LLM sees the same turn shape it originally produced.

export async function chatInputCollectionRespond(
    adminUserId: string | null,
    { collectionMessageId, answers, assistantOptions }: GqlSMutationChatInputCollectionRespondArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
    dispatch: ChatMutationDispatch,
): Promise<GqlSChatMessageCreateResult | null> {
    try {
        // Phase 1 — Resolve the chat the collection belongs to. The join
        // double-checks both that the collection exists and that it lives in
        // a real chat; the cookie session keeps cross-user attempts out.
        const collectionRow = await serverRuntime.db
            .select({ chatId: chatMessages.chatId, scope: chats.scope })
            .from(chatMessagesAssistantInputCollection)
            .innerJoin(chatMessages, eq(chatMessages.chatMessageId, chatMessagesAssistantInputCollection.chatMessageId))
            .innerJoin(chats, eq(chats.chatId, chatMessages.chatId))
            .where(eq(chatMessagesAssistantInputCollection.chatMessageId, collectionMessageId))
            .limit(1)
            .then((rows) => rows[0] ?? null);

        if (!collectionRow) {
            serverRuntime.log.error(
                new Error(`chatInputCollectionRespond: no collection row found for ${collectionMessageId}`),
                requestingSession,
            );
            return null;
        }
        // Reject a collection that lives in the other namespace's scope —
        // a stolen collectionMessageId can't be used to flip namespaces.
        if (collectionRow.scope !== dispatch.scope) {
            serverRuntime.log.error(
                new Error(
                    `chatInputCollectionRespond: collection ${collectionMessageId} has scope=${collectionRow.scope} but mutation namespace requires scope=${dispatch.scope}`,
                ),
                requestingSession,
            );
            return null;
        }
        const { chatId } = collectionRow;
        const userId = requestingSession.userId ?? null;

        // Phase 1.5 — Refuse to write a second userInput for the same
        // collection. The UI rule is that an answered (or skipped) collection
        // is no longer interactive (see "Latest-collection-only is a UI rule"
        // in docs/architecture/chat.md), but the legitimate paths can still
        // race in edge cases — multi-tab, replays, or anyone reaching the
        // mutation by a non-UI path. One userInput per collection is the
        // server-side invariant; bail before persistence so duplicate work
        // (lift, append, detached turn) doesn't fire on top of the first.
        const existingUserInput = await serverRuntime.db
            .select({ chatMessageId: chatMessagesUserInput.chatMessageId })
            .from(chatMessagesUserInput)
            .where(eq(chatMessagesUserInput.collectionMessageId, collectionMessageId))
            .limit(1)
            .then((rows) => rows[0] ?? null);
        if (existingUserInput) {
            serverRuntime.log.error(
                new Error(`chatInputCollectionRespond: collection ${collectionMessageId} already has a userInput response`),
                requestingSession,
            );
            return null;
        }

        // Phase 2 — Lift each flat answer input into the discriminated
        // `ChatAssistantInputValue` payload shape persistence uses. Mismatched
        // shapes (kind says 'Date' but `date` is null, etc.) reject the whole
        // batch — we don't want to write a partial answer set.
        //
        // An empty `answers` list is the explicit Skip signal: the user
        // clicked Skip on the form (or the synthesizer in `chatMessageCreate`
        // wrote one to repair the protocol when they pivoted to a free-text
        // message). It persists as a `ChatMessageUserInput` with `answers: []`,
        // which `toModelMessages` replays to the LLM as
        // `{ status: 'skipped', answers: [] }`. Both paths are valid; do not
        // reject empty here.
        const liftedAnswers: ChatMessageUserInputAnswerPayload[] = [];
        for (const answer of answers) {
            const value = chatMessageUserInputAnswerLift(answer);
            if (!value) {
                serverRuntime.log.error(
                    new Error(`chatInputCollectionRespond: malformed answer for inputId=${answer.inputId} kind=${answer.kind}`),
                    requestingSession,
                );
                return null;
            }
            liftedAnswers.push({ inputId: answer.inputId, value });
        }

        const userInputMessageId = crypto.randomUUID();
        const now = new Date();

        const userInputSpine: ChatMessageRowCreate = {
            chatMessageId: userInputMessageId,
            chatId,
            kind: 'userInput',
            authorUserId: userId,
            parentChatMessageId: null,
            createdAt: now,
        };
        const userInputVariant: ChatMessageUserInputCreate = {
            chatMessageId: userInputMessageId,
            collectionMessageId,
            answers: liftedAnswers,
        };

        // Phase 3 — Append the userInput row in its own tx and publish
        // `MessageAppended` after commit so the sender's subscription
        // delivers the answers immediately.
        await chatMessageAppend(serverRuntime.db, serverRuntime, assistantOptions.generationId, userInputSpine, async (transaction) => {
            await transaction.insert(chatMessagesUserInput).values(userInputVariant);
        });

        // Admin sends fan out `userUpdates` after the userInput commits so a
        // subscribed `User` query re-resolves. Visitor (public) scope stays
        // quiet — no `User` row to refresh.
        if (adminUserId && dispatch.scope === 'admin') {
            await serverRuntime.publish.userUpdates({ userId: adminUserId });
        }

        // Phase 4 — Run the next assistant turn detached. The helper
        // re-loads the rows itself; `toModelMessages` then pairs the new
        // userInput row with its collection as a `promptUserForInput`
        // tool-result.
        chatAssistantTurnRunDetached({
            chatId,
            requestingSession,
            assistantOptions,
            serverRuntime,
            agentFactory: dispatch.agentFactory,
            // The input-collection respond path doesn't carry a page path —
            // the form was already mounted inside the chat surface, and the
            // agent has the prior turn's context to anchor against. If we
            // ever want it here, add it to `chatInputCollectionRespond`'s
            // mutation arguments and thread it through.
            currentPagePath: null,
        });

        return {
            chatId,
            chatMessageId: userInputMessageId,
        };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        return null;
    }
}

// Coerces the runtime value of a `Date` scalar field — which `graphql-scalars`
// parses into a JS `Date` despite our codegen declaring it as `string` — into
// the YYYY-MM-DD wire shape expected by both persistence and serialize.
// Falls back gracefully if a string somehow does arrive (defensive: the
// generated TS already promises `string`, but the lie above means we can't
// rely on the type alone).
function dateToIsoDate(value: string | Date): string {
    if (value instanceof Date) {
        // `toISOString()` is `YYYY-MM-DDTHH:MM:SS.sssZ`; the date portion is what
        // `DateResolver.serialize` expects to round-trip. Using ISO directly
        // avoids locale-dependent formatting and matches the format produced
        // by `format(d, 'yyyy-MM-dd')` on the client.
        return value.toISOString().slice(0, 10);
    }
    return value;
}

// Maps the flat-`kind` GraphQL input shape into the discriminated
// `ChatAssistantInputValue` persistence shape. Returns null if `kind` and the
// populated field don't agree (e.g. kind='Date' with a null `date`); the
// caller treats that as a hard reject for the whole submit.
//
// IMPORTANT: the `Date` and `DateTime` scalars (graphql-scalars' resolvers)
// parse incoming wire strings into JS `Date` objects regardless of what
// `codegen.ts` declares the TS input type as. The generated `string` typing
// for `Date` here is therefore a lie — at runtime `answer.date` etc. are
// `Date` instances. Persisting them as-is dumps `"2026-06-10T00:00:00.000Z"`
// into JSONB, which `DateResolver.serialize` later rejects with
// `Date cannot represent an invalid date-string ...`. We normalize back to
// the canonical wire shapes (YYYY-MM-DD for `Date`, ISO-8601 for `DateTime`)
// before persisting so reads round-trip cleanly.
function chatMessageUserInputAnswerLift(answer: GqlSChatMessageUserInputAnswerCreate): ChatAssistantInputValue | null {
    const kind: GqlSChatAssistantInputValueKind = answer.kind;
    switch (kind) {
        case 'Date':
            return answer.date ? { kind: 'Date', date: dateToIsoDate(answer.date) } : null;
        case 'DateRange':
            // Both endpoints required at submit time. The Date scalar parses
            // each into a `Date` instance at the resolver boundary; normalize
            // both ends through `dateToIsoDate` so the JSONB stays in the
            // canonical YYYY-MM-DD wire shape.
            if (!answer.dateRangeFrom || !answer.dateRangeTo) return null;
            return {
                kind: 'DateRange',
                from: dateToIsoDate(answer.dateRangeFrom),
                to: dateToIsoDate(answer.dateRangeTo),
            };
        case 'DateTime':
            // The DateTime scalar is mapped to `Date` server-side; persistence
            // stores the ISO string so the JSONB stays portable across drivers.
            return answer.dateTime ? { kind: 'DateTime', dateTime: answer.dateTime.toISOString() } : null;
        case 'Time':
            // The schema's `time` field is a plain string; keep the format
            // check shallow here and let the resolver-level validator (or a
            // future Zod refinement) tighten it.
            return answer.time ? { kind: 'Time', time: answer.time } : null;
        case 'String':
            return answer.string !== null && answer.string !== undefined ? { kind: 'String', value: answer.string } : null;
        case 'StringList':
            return answer.stringList ? { kind: 'StringList', values: answer.stringList } : null;
        case 'Boolean':
            return typeof answer.boolean === 'boolean' ? { kind: 'Boolean', value: answer.boolean } : null;
    }
}
