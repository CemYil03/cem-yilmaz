import { DateResolver, DateTimeResolver, JSONResolver } from 'graphql-scalars';
import { agentPersonalAssistant } from '../agents/agentPersonalAssistant';
import { agentVisitorAboutCem } from '../agents/agentVisitorAboutCem';
import { chatInputCollectionRespond } from '../commands/chatInputCollectionRespond';
import type { ChatMutationDispatch } from '../commands/chatMessageCreate';
import { chatMessageCreate } from '../commands/chatMessageCreate';
import { chatToolApprovalRespond } from '../commands/chatToolApprovalRespond';
import { cvEducationDelete } from '../commands/cvEducationDelete';
import { cvEducationReorder } from '../commands/cvEducationReorder';
import { cvEducationUpsert } from '../commands/cvEducationUpsert';
import { cvExperienceDelete } from '../commands/cvExperienceDelete';
import { cvExperienceReorder } from '../commands/cvExperienceReorder';
import { cvExperienceUpsert } from '../commands/cvExperienceUpsert';
import { cvHobbyDelete } from '../commands/cvHobbyDelete';
import { cvHobbyReorder } from '../commands/cvHobbyReorder';
import { cvHobbyUpsert } from '../commands/cvHobbyUpsert';
import { cvSkillDelete } from '../commands/cvSkillDelete';
import { cvSkillReorder } from '../commands/cvSkillReorder';
import { cvSkillUpsert } from '../commands/cvSkillUpsert';
import { userSessionTerminateMany } from '../commands/userSessionTerminateMany';
import { userUpdate } from '../commands/userUpdate';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { guardAdmin } from '../guards/guardAdmin';
import { guardAdminMutation } from '../guards/guardAdminMutation';
import { guardUserMutation } from '../guards/guardUserMutation';
import { guardUserSubscription } from '../guards/guardUserSubscription';
import { chatFindByScope } from '../queries/chatFindByScope';
import { chatListByScope } from '../queries/chatListByScope';
import { chatsFindBySession } from '../queries/chatsFindBySession';
import { cvEducationList } from '../queries/cvEducationList';
import { cvExperienceList } from '../queries/cvExperienceList';
import { cvHobbyList } from '../queries/cvHobbyList';
import { cvSkillList } from '../queries/cvSkillList';
import { sessionUserFindOne } from '../queries/sessionUserFindOne';
import { visitorChatQuotaFindOne } from '../queries/visitorChatQuotaFindOne';
import type {
    GqlSAdmin,
    GqlSAdminChatArgs,
    GqlSAdminMutation,
    GqlSAdminMutationChatInputCollectionRespondArgs,
    GqlSAdminMutationChatMessageCreateArgs,
    GqlSAdminMutationChatToolApprovalRespondArgs,
    GqlSAdminMutationCvEducationDeleteArgs,
    GqlSAdminMutationCvEducationReorderArgs,
    GqlSAdminMutationCvEducationUpsertArgs,
    GqlSAdminMutationCvExperienceDeleteArgs,
    GqlSAdminMutationCvExperienceReorderArgs,
    GqlSAdminMutationCvExperienceUpsertArgs,
    GqlSAdminMutationCvHobbyDeleteArgs,
    GqlSAdminMutationCvHobbyReorderArgs,
    GqlSAdminMutationCvHobbyUpsertArgs,
    GqlSAdminMutationCvSkillDeleteArgs,
    GqlSAdminMutationCvSkillReorderArgs,
    GqlSAdminMutationCvSkillUpsertArgs,
    GqlSAdminPublicChatArgs,
    GqlSChatAssistantInput,
    GqlSChatAssistantInputValue,
    GqlSChatMessage,
    GqlSChatUpdate,
    GqlSCvQuery,
    GqlSMutationChatInputCollectionRespondArgs,
    GqlSMutationChatMessageCreateArgs,
    GqlSMutationChatToolApprovalRespondArgs,
    GqlSQueryChatArgs,
    GqlSResolvers,
    GqlSSession,
    GqlSSubscriptionChatUpdatesArgs,
    GqlSUser,
    GqlSUserMutation,
    GqlSUserMutationTerminateSessionsArgs,
    GqlSUserMutationUserUpdateArgs,
} from './generated';

// Visitor / admin namespaces share the same chat command bodies — only the
// scope and the agent factory change. Pinning these once keeps the resolver
// wiring symmetric and makes the access-path → agent dispatch obvious.
// See `docs/architecture/multi-agent-chat.md`.
const PUBLIC_DISPATCH: ChatMutationDispatch = { scope: 'public', agentFactory: agentVisitorAboutCem };
const ADMIN_DISPATCH: ChatMutationDispatch = { scope: 'admin', agentFactory: agentPersonalAssistant };

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
            visitorChats(_session: GqlSSession, __: any, requestingSession: GqlSSession) {
                return chatsFindBySession(requestingSession, serverRuntime);
            },
            visitorChatQuota(_session: GqlSSession, __: any, requestingSession: GqlSSession) {
                return visitorChatQuotaFindOne(requestingSession, serverRuntime);
            },
        },
        UserMutation: {
            userUpdate({ userId }: GqlSUserMutation, args: GqlSUserMutationUserUpdateArgs, requestingSession: GqlSSession) {
                return userUpdate(userId, args, requestingSession, serverRuntime);
            },
            terminateSessions({ userId }: GqlSUserMutation, args: GqlSUserMutationTerminateSessionsArgs, requestingSession: GqlSSession) {
                return userSessionTerminateMany(userId, args, requestingSession, serverRuntime);
            },
        },
        Admin: {
            publicChats(_parent: GqlSAdmin, __: any, requestingSession: GqlSSession) {
                return chatListByScope('public', requestingSession, serverRuntime);
            },
            publicChat(_parent: GqlSAdmin, args: GqlSAdminPublicChatArgs, requestingSession: GqlSSession) {
                return chatFindByScope(args.chatId, 'public', requestingSession, serverRuntime);
            },
            chats(_parent: GqlSAdmin, __: any, requestingSession: GqlSSession) {
                return chatListByScope('admin', requestingSession, serverRuntime);
            },
            chat(_parent: GqlSAdmin, args: GqlSAdminChatArgs, requestingSession: GqlSSession) {
                return chatFindByScope(args.chatId, 'admin', requestingSession, serverRuntime);
            },
        },
        CvQuery: {
            experience(_parent: GqlSCvQuery, __: any, requestingSession: GqlSSession) {
                return cvExperienceList(requestingSession, serverRuntime);
            },
            education(_parent: GqlSCvQuery, __: any, requestingSession: GqlSSession) {
                return cvEducationList(requestingSession, serverRuntime);
            },
            skills(_parent: GqlSCvQuery, __: any, requestingSession: GqlSSession) {
                return cvSkillList(requestingSession, serverRuntime);
            },
            hobbies(_parent: GqlSCvQuery, __: any, requestingSession: GqlSSession) {
                return cvHobbyList(requestingSession, serverRuntime);
            },
        },
        AdminMutation: {
            chatMessageCreate(_parent: GqlSAdminMutation, args: GqlSAdminMutationChatMessageCreateArgs, requestingSession: GqlSSession) {
                return chatMessageCreate(args, requestingSession, serverRuntime, ADMIN_DISPATCH);
            },
            chatInputCollectionRespond(
                _parent: GqlSAdminMutation,
                args: GqlSAdminMutationChatInputCollectionRespondArgs,
                requestingSession: GqlSSession,
            ) {
                return chatInputCollectionRespond(args, requestingSession, serverRuntime, ADMIN_DISPATCH);
            },
            chatToolApprovalRespond(
                _parent: GqlSAdminMutation,
                args: GqlSAdminMutationChatToolApprovalRespondArgs,
                requestingSession: GqlSSession,
            ) {
                return chatToolApprovalRespond(args, requestingSession, serverRuntime, ADMIN_DISPATCH);
            },
            cvExperienceUpsert(_parent: GqlSAdminMutation, args: GqlSAdminMutationCvExperienceUpsertArgs, requestingSession: GqlSSession) {
                return cvExperienceUpsert(args, requestingSession, serverRuntime);
            },
            cvExperienceDelete(_parent: GqlSAdminMutation, args: GqlSAdminMutationCvExperienceDeleteArgs, requestingSession: GqlSSession) {
                return cvExperienceDelete(args, requestingSession, serverRuntime);
            },
            cvExperienceReorder(
                _parent: GqlSAdminMutation,
                args: GqlSAdminMutationCvExperienceReorderArgs,
                requestingSession: GqlSSession,
            ) {
                return cvExperienceReorder(args, requestingSession, serverRuntime);
            },
            cvEducationUpsert(_parent: GqlSAdminMutation, args: GqlSAdminMutationCvEducationUpsertArgs, requestingSession: GqlSSession) {
                return cvEducationUpsert(args, requestingSession, serverRuntime);
            },
            cvEducationDelete(_parent: GqlSAdminMutation, args: GqlSAdminMutationCvEducationDeleteArgs, requestingSession: GqlSSession) {
                return cvEducationDelete(args, requestingSession, serverRuntime);
            },
            cvEducationReorder(_parent: GqlSAdminMutation, args: GqlSAdminMutationCvEducationReorderArgs, requestingSession: GqlSSession) {
                return cvEducationReorder(args, requestingSession, serverRuntime);
            },
            cvSkillUpsert(_parent: GqlSAdminMutation, args: GqlSAdminMutationCvSkillUpsertArgs, requestingSession: GqlSSession) {
                return cvSkillUpsert(args, requestingSession, serverRuntime);
            },
            cvSkillDelete(_parent: GqlSAdminMutation, args: GqlSAdminMutationCvSkillDeleteArgs, requestingSession: GqlSSession) {
                return cvSkillDelete(args, requestingSession, serverRuntime);
            },
            cvSkillReorder(_parent: GqlSAdminMutation, args: GqlSAdminMutationCvSkillReorderArgs, requestingSession: GqlSSession) {
                return cvSkillReorder(args, requestingSession, serverRuntime);
            },
            cvHobbyUpsert(_parent: GqlSAdminMutation, args: GqlSAdminMutationCvHobbyUpsertArgs, requestingSession: GqlSSession) {
                return cvHobbyUpsert(args, requestingSession, serverRuntime);
            },
            cvHobbyDelete(_parent: GqlSAdminMutation, args: GqlSAdminMutationCvHobbyDeleteArgs, requestingSession: GqlSSession) {
                return cvHobbyDelete(args, requestingSession, serverRuntime);
            },
            cvHobbyReorder(_parent: GqlSAdminMutation, args: GqlSAdminMutationCvHobbyReorderArgs, requestingSession: GqlSSession) {
                return cvHobbyReorder(args, requestingSession, serverRuntime);
            },
        },
        Query: {
            currentSession(_: any, __: any, requestingSession: GqlSSession) {
                return requestingSession;
            },
            chat(_: any, args: GqlSQueryChatArgs, requestingSession: GqlSSession) {
                return chatFindByScope(args.chatId, 'public', requestingSession, serverRuntime);
            },
            // The CV namespace is public — every visitor can read the
            // timeline on `/cv` and the skill block on `/about`. Return an
            // empty parent shell; per-field resolvers do the actual reads.
            cv() {
                return {} as GqlSCvQuery;
            },
            admin(_: any, __: any, requestingSession: GqlSSession) {
                return guardAdmin(requestingSession);
            },
        },
        Mutation: {
            userCreate(_parent: unknown, __: any, _requestingSession: GqlSSession) {
                return { success: false, referenceId: null }; // todo
            },
            user(_parent: unknown, __: any, requestingSession: GqlSSession) {
                return guardUserMutation(requestingSession);
            },
            chatMessageCreate(_parent: unknown, args: GqlSMutationChatMessageCreateArgs, requestingSession: GqlSSession) {
                return chatMessageCreate(args, requestingSession, serverRuntime, PUBLIC_DISPATCH);
            },
            chatInputCollectionRespond(_parent: unknown, args: GqlSMutationChatInputCollectionRespondArgs, requestingSession: GqlSSession) {
                return chatInputCollectionRespond(args, requestingSession, serverRuntime, PUBLIC_DISPATCH);
            },
            chatToolApprovalRespond(_parent: unknown, args: GqlSMutationChatToolApprovalRespondArgs, requestingSession: GqlSSession) {
                return chatToolApprovalRespond(args, requestingSession, serverRuntime, PUBLIC_DISPATCH);
            },
            admin(_parent: unknown, __: any, requestingSession: GqlSSession) {
                return guardAdminMutation(requestingSession);
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
