import { DateResolver, DateTimeResolver, JSONResolver } from 'graphql-scalars';
import { chatInputCollectionRespond } from '../commands/chatInputCollectionRespond';
import { chatMessageCreate } from '../commands/chatMessageCreate';
import { chatToolApprovalRespond } from '../commands/chatToolApprovalRespond';
import { userSessionTerminateMany } from '../commands/userSessionTerminateMany';
import { userUpdate } from '../commands/userUpdate';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { guardUserMutation } from '../guards/guardUserMutation';
import { guardUserSubscription } from '../guards/guardUserSubscription';
import { chatFindOne } from '../queries/chatFindOne';
import { sessionUserFindOne } from '../queries/sessionUserFindOne';
import type {
    GqlSChatAssistantInput,
    GqlSChatAssistantInputValue,
    GqlSChatMessage,
    GqlSChatUpdate,
    GqlSResolvers,
    GqlSSession,
    GqlSSessionChatArgs,
    GqlSSubscriptionChatUpdatesArgs,
    GqlSUser,
    GqlSUserMutation,
    GqlSUserMutationChatInputCollectionRespondArgs,
    GqlSUserMutationChatMessageCreateArgs,
    GqlSUserMutationChatToolApprovalRespondArgs,
    GqlSUserMutationTerminateSessionsArgs,
    GqlSUserMutationUserUpdateArgs,
} from './generated';

export function resolversCreate(serverRuntime: ServerRuntime): GqlSResolvers {
    return {
        DateTime: DateTimeResolver,
        Date: DateResolver,
        JSON: JSONResolver,
        ChatMessage: {
            __resolveType(obj: GqlSChatMessage) {
                return obj.gqlTypeName;
            },
        },
        ChatAssistantInput: {
            __resolveType(obj: GqlSChatAssistantInput) {
                return obj.gqlTypeName;
            },
        },
        ChatAssistantInputValue: {
            __resolveType(obj: GqlSChatAssistantInputValue) {
                return obj.gqlTypeName;
            },
        },
        ChatUpdate: {
            __resolveType(obj: GqlSChatUpdate) {
                return obj.gqlTypeName;
            },
        },
        Session: {
            user(_session: GqlSSession, __: any, requestingSession: GqlSSession) {
                return sessionUserFindOne(requestingSession, serverRuntime);
            },
            chat(_session: GqlSSession, args: GqlSSessionChatArgs, requestingSession: GqlSSession) {
                return chatFindOne(args, requestingSession, serverRuntime);
            },
        },
        UserMutation: {
            userUpdate({ userId }: GqlSUserMutation, args: GqlSUserMutationUserUpdateArgs, requestingSession: GqlSSession) {
                return userUpdate(userId, args, requestingSession, serverRuntime);
            },
            terminateSessions({ userId }: GqlSUserMutation, args: GqlSUserMutationTerminateSessionsArgs, requestingSession: GqlSSession) {
                return userSessionTerminateMany(userId, args, requestingSession, serverRuntime);
            },
            chatMessageCreate(parent: GqlSUserMutation, args: GqlSUserMutationChatMessageCreateArgs, requestingSession: GqlSSession) {
                return chatMessageCreate(parent, args, requestingSession, serverRuntime);
            },
            chatInputCollectionRespond(
                parent: GqlSUserMutation,
                args: GqlSUserMutationChatInputCollectionRespondArgs,
                requestingSession: GqlSSession,
            ) {
                return chatInputCollectionRespond(parent, args, requestingSession, serverRuntime);
            },
            chatToolApprovalRespond(
                parent: GqlSUserMutation,
                args: GqlSUserMutationChatToolApprovalRespondArgs,
                requestingSession: GqlSSession,
            ) {
                return chatToolApprovalRespond(parent, args, requestingSession, serverRuntime);
            },
        },
        Query: {
            currentSession(_: any, __: any, requestingSession: GqlSSession) {
                return requestingSession;
            },
        },
        Mutation: {
            userCreate(_parent: unknown, __: any, _requestingSession: GqlSSession) {
                return { success: false, referenceId: null }; // todo
            },
            user(_parent: unknown, __: any, requestingSession: GqlSSession) {
                return guardUserMutation(requestingSession);
            },
        },
        Subscription: {
            userUpdates: {
                subscribe(_: any, __: any, requestingSession: GqlSSession) {
                    return guardUserSubscription(requestingSession, serverRuntime);
                },
                resolve(_: any, __: any, requestingSession: GqlSSession) {
                    return sessionUserFindOne(requestingSession, serverRuntime) as Promise<GqlSUser>; // todo
                },
            },
            chatUpdates: {
                // Auth is the unguessable `generationId`: only the sender (who
                // generated the UUID locally) can subscribe meaningfully. Real
                // chat-level authorization will layer on once chats grow user
                // ownership — at which point this resolver will guard against
                // foreign chat access too.
                subscribe(_: any, { generationId }: GqlSSubscriptionChatUpdatesArgs) {
                    return serverRuntime.subscribe.to(`chat-updates:${generationId}`);
                },
                resolve(payload: GqlSChatUpdate) {
                    return payload;
                },
            },
        },
    };
}
