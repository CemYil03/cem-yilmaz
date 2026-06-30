import { DateResolver, DateTimeResolver, JSONResolver } from 'graphql-scalars';
import { ADMIN_CHAT_MODELS } from '../agents/adminChatModels';
import { agentPersonalAssistant } from '../agents/agentPersonalAssistant';
import { agentVisitorAboutCem } from '../agents/agentVisitorAboutCem';
import { adminChatConfigDefaultModelSet } from '../commands/adminChatConfigDefaultModelSet';
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
import { compassObservationDismiss } from '../commands/compassObservationDismiss';
import { compassSynthesizeRequest } from '../commands/compassSynthesizeRequest';
import { compassInterviewStart } from '../commands/compassInterviewStart';
import { compassInterviewMessageSend } from '../commands/compassInterviewMessageSend';
import { compassInterviewEnd } from '../commands/compassInterviewEnd';
import { compassInterviewSkip } from '../commands/compassInterviewSkip';
import { projectActivityDelete } from '../commands/projectActivityDelete';
import { projectActivityUpsert } from '../commands/projectActivityUpsert';
import { projectDelete } from '../commands/projectDelete';
import { projectFileDelete } from '../commands/projectFileDelete';
import { projectFileTogglePin } from '../commands/projectFileTogglePin';
import { projectFileUpsert } from '../commands/projectFileUpsert';
import { projectLinkDelete } from '../commands/projectLinkDelete';
import { projectLinkTogglePin } from '../commands/projectLinkTogglePin';
import { projectLinkUpsert } from '../commands/projectLinkUpsert';
import { projectRequestArchive } from '../commands/projectRequestArchive';
import { projectRequestDelete } from '../commands/projectRequestDelete';
import { projectReorder } from '../commands/projectReorder';
import { projectTimerStart } from '../commands/projectTimerStart';
import { projectTimerStop } from '../commands/projectTimerStop';
import { projectUpsert } from '../commands/projectUpsert';
import { taskDelete } from '../commands/taskDelete';
import { taskReorder } from '../commands/taskReorder';
import { taskUpsert } from '../commands/taskUpsert';
import { userSessionTerminateMany } from '../commands/userSessionTerminateMany';
import { userUpdate } from '../commands/userUpdate';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { guardAdminMutation } from '../guards/guardAdminMutation';
import { guardUserMutation } from '../guards/guardUserMutation';
import { guardUserSubscription } from '../guards/guardUserSubscription';
import { toGqlCompass } from '../mappers/toGqlCompass';
import { toGqlCompassInterview } from '../mappers/toGqlCompassInterview';
import { toGqlChatMessage } from '../mappers/toGqlChatMessage';
import { chatFindByScope } from '../queries/chatFindByScope';
import { chatListByScope } from '../queries/chatListByScope';
import { chatMessageRowLoad } from '../queries/chatMessageRowLoad';
import { chatsFindBySession } from '../queries/chatsFindBySession';
import { visitorChatFindOne } from '../queries/visitorChatFindOne';
import { cvEducationList } from '../queries/cvEducationList';
import { cvExperienceList } from '../queries/cvExperienceList';
import { cvHobbyList } from '../queries/cvHobbyList';
import { cvSkillList } from '../queries/cvSkillList';
import { compassGet } from '../queries/compassGet';
import { compassInterviewActiveDueGet } from '../queries/compassInterviewActiveDueGet';
import { compassInterviewGet } from '../queries/compassInterviewGet';
import { compassInterviewList } from '../queries/compassInterviewList';
import { logsList } from '../queries/logsList';
import { compassObservationList } from '../queries/compassObservationList';
import { compassSynthesisInProgressGet } from '../queries/compassSynthesisInProgressGet';
import { projectRequestsList } from '../queries/projectRequestsList';
import { projectRequestsInboxCount } from '../queries/projectRequestsInboxCount';
import { projectsList } from '../queries/projectsList';
import { projectGet } from '../queries/projectGet';
import { activeTimerGet } from '../queries/activeTimerGet';
import { adminChatConfigGet } from '../queries/adminChatConfigGet';
import { sessionUserFindOne } from '../queries/sessionUserFindOne';
import { standaloneTasksList } from '../queries/standaloneTasksList';
import { visitorChatQuotaFindOne } from '../queries/visitorChatQuotaFindOne';
import type {
    GqlSAdmin,
    GqlSAdminChatArgs,
    GqlSAdminLogsArgs,
    GqlSAdminMutation,
    GqlSAdminMutationChatConfigDefaultModelSetArgs,
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
    GqlSAdminMutationCompassObservationDismissArgs,
    GqlSAdminMutationCompassInterviewStartArgs,
    GqlSAdminMutationCompassInterviewMessageSendArgs,
    GqlSAdminMutationCompassInterviewEndArgs,
    GqlSAdminMutationCompassInterviewSkipArgs,
    GqlSAdminCompassInterviewArgs,
    GqlSAdminMutationProjectActivityDeleteArgs,
    GqlSAdminMutationProjectActivityUpsertArgs,
    GqlSAdminMutationProjectDeleteArgs,
    GqlSAdminMutationProjectFileDeleteArgs,
    GqlSAdminMutationProjectFileTogglePinArgs,
    GqlSAdminMutationProjectFileUpsertArgs,
    GqlSAdminMutationProjectLinkDeleteArgs,
    GqlSAdminMutationProjectLinkTogglePinArgs,
    GqlSAdminMutationProjectLinkUpsertArgs,
    GqlSAdminMutationProjectReorderArgs,
    GqlSAdminMutationProjectRequestArchiveArgs,
    GqlSAdminMutationProjectRequestDeleteArgs,
    GqlSAdminMutationProjectTimerStartArgs,
    GqlSAdminMutationProjectTimerStopArgs,
    GqlSAdminMutationProjectUpsertArgs,
    GqlSAdminMutationTaskDeleteArgs,
    GqlSAdminMutationTaskReorderArgs,
    GqlSAdminMutationTaskUpsertArgs,
    GqlSAdminCompass,
    GqlSAdminCompassObservationsArgs,
    GqlSAdminProjectArgs,
    GqlSAdminProjectRequestsArgs,
    GqlSAdminProjectsArgs,
    GqlSAdminPublicChatArgs,
    GqlSChatAssistantInput,
    GqlSChatAssistantInputValue,
    GqlSChatMessage,
    GqlSChatUpdate,
    GqlSCvQuery,
    GqlSMutationChatInputCollectionRespondArgs,
    GqlSMutationChatMessageCreateArgs,
    GqlSMutationChatToolApprovalRespondArgs,
    GqlSResolvers,
    GqlSSession,
    GqlSSessionVisitorChatArgs,
    GqlSSubscriptionChatUpdatesArgs,
    GqlSUser,
    GqlSUserMutation,
    GqlSUserMutationTerminateSessionsArgs,
    GqlSUserMutationUserUpdateArgs,
} from './generated';
import type { ChatUpdateWirePayload } from './chatUpdateWirePayload';

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
            visitorChat(_session: GqlSSession, args: GqlSSessionVisitorChatArgs, requestingSession: GqlSSession) {
                return visitorChatFindOne(args.chatId, requestingSession, serverRuntime);
            },
            visitorChatQuota(_session: GqlSSession, __: any, requestingSession: GqlSSession) {
                return visitorChatQuotaFindOne(requestingSession, serverRuntime);
            },
        },
        User: {
            // Workspace read namespace, resolved only for the session's own
            // admin user. Null for visitors, non-admin logged-in users, and
            // cross-user lookups — that nullability is what lets the public
            // landing page ask "is the current visitor an admin?" with a
            // single field check instead of catching an exception. Mirrors
            // the policy `guardAdmin` used to enforce; the previous helper
            // threw because the schema field was non-nullable. See
            // `docs/architecture/workspace-access.md`.
            async admin(parentUser: GqlSUser, _: any, requestingSession: GqlSSession): Promise<GqlSAdmin | null> {
                if (!requestingSession.userId || requestingSession.userId !== parentUser.userId) {
                    return null;
                }
                const [row] = await serverRuntime.db
                    .select({ isAdmin: users.isAdmin })
                    .from(users)
                    .where(eq(users.userId, parentUser.userId))
                    .limit(1);
                return row?.isAdmin ? ({} as GqlSAdmin) : null;
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
            // Compass shell — the scalar fields come straight off the row;
            // `observations`, `interviews`, `interview`, and
            // `interviewPending` resolve separately so they can take
            // arguments and run their own queries, and `synthesisInProgress`
            // is resolved separately because it reads pg-boss, not the
            // `Compass` row. We pass placeholders here that the field
            // resolvers below overwrite.
            async compass(): Promise<GqlSAdminCompass> {
                const row = await compassGet(serverRuntime.db);
                return {
                    ...toGqlCompass(row),
                    observations: [],
                    synthesisInProgress: false,
                    interviews: [],
                    interview: null,
                    interviewPending: null,
                };
            },
            projectRequests(_parent: GqlSAdmin, args: GqlSAdminProjectRequestsArgs, requestingSession: GqlSSession) {
                return projectRequestsList(args.status ?? null, requestingSession, serverRuntime);
            },
            projectRequestsInboxCount(_parent: GqlSAdmin, __: any, requestingSession: GqlSSession) {
                return projectRequestsInboxCount(requestingSession, serverRuntime);
            },
            projects(_parent: GqlSAdmin, args: GqlSAdminProjectsArgs, requestingSession: GqlSSession) {
                return projectsList(args.status ?? null, requestingSession, serverRuntime);
            },
            project(_parent: GqlSAdmin, args: GqlSAdminProjectArgs, requestingSession: GqlSSession) {
                return projectGet(args.projectId, requestingSession, serverRuntime);
            },
            standaloneTasks(_parent: GqlSAdmin, __: any, requestingSession: GqlSSession) {
                return standaloneTasksList(requestingSession, serverRuntime);
            },
            activeTimer(_parent: GqlSAdmin, __: any, requestingSession: GqlSSession) {
                return activeTimerGet(requestingSession, serverRuntime);
            },
            // CV editor reads the same `CvQuery` the public surfaces use. The
            // resolver chain on `User.admin` already gated this with
            // `guardAdmin`, and `CvQuery` field resolvers run on every
            // request regardless of parent — the empty object is just a
            // shell, identical to `Query.cv()` below.
            cv(): GqlSCvQuery {
                return {} as GqlSCvQuery;
            },
            async chatConfig(_parent: GqlSAdmin) {
                // Catalog is server-static — same array on every read. The
                // saved default is the only DB-bound part; we resolve it here
                // (and bootstrap the singleton row if it doesn't exist yet)
                // so the composer always gets a concrete `defaultModelId`.
                const row = await adminChatConfigGet(serverRuntime.db);
                return {
                    availableModels: ADMIN_CHAT_MODELS.map((model) => ({
                        modelId: model.modelId,
                        label: model.label,
                        supportedMediaTypes: [...model.supportedMediaTypes],
                    })),
                    defaultModelId: row.defaultModelId,
                };
            },
            logs(_parent: GqlSAdmin, args: GqlSAdminLogsArgs, requestingSession: GqlSSession) {
                return logsList(args, requestingSession, serverRuntime);
            },
        },
        AdminCompass: {
            observations(_parent: GqlSAdminCompass, args: GqlSAdminCompassObservationsArgs, requestingSession: GqlSSession) {
                return compassObservationList(
                    {
                        category: args.category ?? null,
                        includeDismissed: args.includeDismissed ?? false,
                    },
                    requestingSession,
                    serverRuntime,
                );
            },
            // Derived from pg-boss — see `compassSynthesisInProgressGet`.
            synthesisInProgress() {
                return compassSynthesisInProgressGet(serverRuntime);
            },
            // Psychological-interview rails. Each resolver returns one shape
            // of `CompassInterview`; the `messages` field is populated only
            // by the `interview(interviewId)` lookup (the list/pending forms
            // hand `[]`, and the `CompassInterview.messages` field resolver
            // below lazily loads them on demand).
            async interviews() {
                const rows = await compassInterviewList(serverRuntime);
                return rows.map((row) => toGqlCompassInterview(row));
            },
            async interview(_parent: GqlSAdminCompass, args: GqlSAdminCompassInterviewArgs) {
                const loaded = await compassInterviewGet(args.interviewId, serverRuntime);
                if (!loaded) return null;
                return toGqlCompassInterview(loaded.interview, loaded.messages);
            },
            async interviewPending() {
                const row = await compassInterviewActiveDueGet(serverRuntime);
                if (!row) return null;
                // Caller almost always wants the messages to render the
                // in-progress card's transcript inline; load them here so the
                // page query doesn't need a second round-trip. For a freshly
                // `pending` row this returns `[]`, which is correct.
                const loaded = await compassInterviewGet(row.interviewId, serverRuntime);
                if (!loaded) return toGqlCompassInterview(row);
                return toGqlCompassInterview(loaded.interview, loaded.messages);
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
            chatMessageCreate({ userId }: GqlSAdminMutation, args: GqlSAdminMutationChatMessageCreateArgs, requestingSession: GqlSSession) {
                return chatMessageCreate(userId, args, requestingSession, serverRuntime, ADMIN_DISPATCH);
            },
            chatInputCollectionRespond(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationChatInputCollectionRespondArgs,
                requestingSession: GqlSSession,
            ) {
                return chatInputCollectionRespond(userId, args, requestingSession, serverRuntime, ADMIN_DISPATCH);
            },
            chatToolApprovalRespond(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationChatToolApprovalRespondArgs,
                requestingSession: GqlSSession,
            ) {
                return chatToolApprovalRespond(userId, args, requestingSession, serverRuntime, ADMIN_DISPATCH);
            },
            cvExperienceUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationCvExperienceUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return cvExperienceUpsert(userId, args, requestingSession, serverRuntime);
            },
            cvExperienceDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationCvExperienceDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return cvExperienceDelete(userId, args, requestingSession, serverRuntime);
            },
            cvExperienceReorder(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationCvExperienceReorderArgs,
                requestingSession: GqlSSession,
            ) {
                return cvExperienceReorder(userId, args, requestingSession, serverRuntime);
            },
            cvEducationUpsert({ userId }: GqlSAdminMutation, args: GqlSAdminMutationCvEducationUpsertArgs, requestingSession: GqlSSession) {
                return cvEducationUpsert(userId, args, requestingSession, serverRuntime);
            },
            cvEducationDelete({ userId }: GqlSAdminMutation, args: GqlSAdminMutationCvEducationDeleteArgs, requestingSession: GqlSSession) {
                return cvEducationDelete(userId, args, requestingSession, serverRuntime);
            },
            cvEducationReorder(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationCvEducationReorderArgs,
                requestingSession: GqlSSession,
            ) {
                return cvEducationReorder(userId, args, requestingSession, serverRuntime);
            },
            cvSkillUpsert({ userId }: GqlSAdminMutation, args: GqlSAdminMutationCvSkillUpsertArgs, requestingSession: GqlSSession) {
                return cvSkillUpsert(userId, args, requestingSession, serverRuntime);
            },
            cvSkillDelete({ userId }: GqlSAdminMutation, args: GqlSAdminMutationCvSkillDeleteArgs, requestingSession: GqlSSession) {
                return cvSkillDelete(userId, args, requestingSession, serverRuntime);
            },
            cvSkillReorder({ userId }: GqlSAdminMutation, args: GqlSAdminMutationCvSkillReorderArgs, requestingSession: GqlSSession) {
                return cvSkillReorder(userId, args, requestingSession, serverRuntime);
            },
            cvHobbyUpsert({ userId }: GqlSAdminMutation, args: GqlSAdminMutationCvHobbyUpsertArgs, requestingSession: GqlSSession) {
                return cvHobbyUpsert(userId, args, requestingSession, serverRuntime);
            },
            cvHobbyDelete({ userId }: GqlSAdminMutation, args: GqlSAdminMutationCvHobbyDeleteArgs, requestingSession: GqlSSession) {
                return cvHobbyDelete(userId, args, requestingSession, serverRuntime);
            },
            cvHobbyReorder({ userId }: GqlSAdminMutation, args: GqlSAdminMutationCvHobbyReorderArgs, requestingSession: GqlSSession) {
                return cvHobbyReorder(userId, args, requestingSession, serverRuntime);
            },
            compassObservationDismiss(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationCompassObservationDismissArgs,
                requestingSession: GqlSSession,
            ) {
                return compassObservationDismiss(userId, args, requestingSession, serverRuntime);
            },
            compassSynthesizeRequest({ userId }: GqlSAdminMutation, __: any, requestingSession: GqlSSession) {
                return compassSynthesizeRequest(userId, requestingSession, serverRuntime);
            },
            compassInterviewStart(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationCompassInterviewStartArgs,
                requestingSession: GqlSSession,
            ) {
                return compassInterviewStart(userId, args, requestingSession, serverRuntime);
            },
            compassInterviewMessageSend(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationCompassInterviewMessageSendArgs,
                requestingSession: GqlSSession,
            ) {
                return compassInterviewMessageSend(userId, args, requestingSession, serverRuntime);
            },
            compassInterviewEnd(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationCompassInterviewEndArgs,
                requestingSession: GqlSSession,
            ) {
                return compassInterviewEnd(userId, args, requestingSession, serverRuntime);
            },
            compassInterviewSkip(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationCompassInterviewSkipArgs,
                requestingSession: GqlSSession,
            ) {
                return compassInterviewSkip(userId, args, requestingSession, serverRuntime);
            },
            projectRequestArchive(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationProjectRequestArchiveArgs,
                requestingSession: GqlSSession,
            ) {
                return projectRequestArchive(userId, args, requestingSession, serverRuntime);
            },
            projectRequestDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationProjectRequestDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return projectRequestDelete(userId, args, requestingSession, serverRuntime);
            },
            projectUpsert({ userId }: GqlSAdminMutation, args: GqlSAdminMutationProjectUpsertArgs, requestingSession: GqlSSession) {
                return projectUpsert(userId, args, requestingSession, serverRuntime);
            },
            projectDelete({ userId }: GqlSAdminMutation, args: GqlSAdminMutationProjectDeleteArgs, requestingSession: GqlSSession) {
                return projectDelete(userId, args, requestingSession, serverRuntime);
            },
            projectReorder({ userId }: GqlSAdminMutation, args: GqlSAdminMutationProjectReorderArgs, requestingSession: GqlSSession) {
                return projectReorder(userId, args, requestingSession, serverRuntime);
            },
            taskUpsert({ userId }: GqlSAdminMutation, args: GqlSAdminMutationTaskUpsertArgs, requestingSession: GqlSSession) {
                return taskUpsert(userId, args, requestingSession, serverRuntime);
            },
            taskDelete({ userId }: GqlSAdminMutation, args: GqlSAdminMutationTaskDeleteArgs, requestingSession: GqlSSession) {
                return taskDelete(userId, args, requestingSession, serverRuntime);
            },
            taskReorder({ userId }: GqlSAdminMutation, args: GqlSAdminMutationTaskReorderArgs, requestingSession: GqlSSession) {
                return taskReorder(userId, args, requestingSession, serverRuntime);
            },
            projectActivityUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationProjectActivityUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return projectActivityUpsert(userId, args, requestingSession, serverRuntime);
            },
            projectActivityDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationProjectActivityDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return projectActivityDelete(userId, args, requestingSession, serverRuntime);
            },
            projectTimerStart({ userId }: GqlSAdminMutation, args: GqlSAdminMutationProjectTimerStartArgs, requestingSession: GqlSSession) {
                return projectTimerStart(userId, args, requestingSession, serverRuntime);
            },
            projectTimerStop({ userId }: GqlSAdminMutation, args: GqlSAdminMutationProjectTimerStopArgs, requestingSession: GqlSSession) {
                return projectTimerStop(userId, args, requestingSession, serverRuntime);
            },
            projectLinkUpsert({ userId }: GqlSAdminMutation, args: GqlSAdminMutationProjectLinkUpsertArgs, requestingSession: GqlSSession) {
                return projectLinkUpsert(userId, args, requestingSession, serverRuntime);
            },
            projectLinkDelete({ userId }: GqlSAdminMutation, args: GqlSAdminMutationProjectLinkDeleteArgs, requestingSession: GqlSSession) {
                return projectLinkDelete(userId, args, requestingSession, serverRuntime);
            },
            projectLinkTogglePin(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationProjectLinkTogglePinArgs,
                requestingSession: GqlSSession,
            ) {
                return projectLinkTogglePin(userId, args, requestingSession, serverRuntime);
            },
            projectFileUpsert({ userId }: GqlSAdminMutation, args: GqlSAdminMutationProjectFileUpsertArgs, requestingSession: GqlSSession) {
                return projectFileUpsert(userId, args, requestingSession, serverRuntime);
            },
            projectFileDelete({ userId }: GqlSAdminMutation, args: GqlSAdminMutationProjectFileDeleteArgs, requestingSession: GqlSSession) {
                return projectFileDelete(userId, args, requestingSession, serverRuntime);
            },
            projectFileTogglePin(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationProjectFileTogglePinArgs,
                requestingSession: GqlSSession,
            ) {
                return projectFileTogglePin(userId, args, requestingSession, serverRuntime);
            },
            chatConfigDefaultModelSet(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationChatConfigDefaultModelSetArgs,
                requestingSession: GqlSSession,
            ) {
                return adminChatConfigDefaultModelSet(userId, args, requestingSession, serverRuntime);
            },
        },
        Query: {
            currentSession(_: any, __: any, requestingSession: GqlSSession) {
                return requestingSession;
            },
            // The CV namespace is public — every visitor can read the
            // timeline on `/cv` and the skill block on `/about`. Return an
            // empty parent shell; per-field resolvers do the actual reads.
            cv() {
                return {} as GqlSCvQuery;
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
                return chatMessageCreate(null, args, requestingSession, serverRuntime, PUBLIC_DISPATCH);
            },
            chatInputCollectionRespond(_parent: unknown, args: GqlSMutationChatInputCollectionRespondArgs, requestingSession: GqlSSession) {
                return chatInputCollectionRespond(null, args, requestingSession, serverRuntime, PUBLIC_DISPATCH);
            },
            chatToolApprovalRespond(_parent: unknown, args: GqlSMutationChatToolApprovalRespondArgs, requestingSession: GqlSSession) {
                return chatToolApprovalRespond(null, args, requestingSession, serverRuntime, PUBLIC_DISPATCH);
            },
            admin(_parent: unknown, __: any, requestingSession: GqlSSession) {
                return guardAdminMutation(requestingSession, serverRuntime);
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
                // Wire payload carries ids/small primitives only — pg_notify
                // caps NOTIFY at 8000 bytes. We re-load the row here and map
                // it to the full `GqlSChatMessage` so the shape that reaches
                // the client matches what `chatFindOne` would return. See
                // `src/server/graphql/chatUpdateWirePayload.ts`.
                async resolve(payload: ChatUpdateWirePayload): Promise<GqlSChatUpdate> {
                    switch (payload.kind) {
                        case 'messageAppended': {
                            const joined = await chatMessageRowLoad(serverRuntime.db, payload.chatMessageId);
                            // Publish runs after commit, so the row should
                            // always be found. A miss here would be data
                            // corruption (row deleted between publish and
                            // delivery) — throw so the subscriber sees a
                            // GraphQL error rather than a silently-dropped
                            // update.
                            if (!joined) throw new Error(`chatUpdates: row ${payload.chatMessageId} not found on re-load`);
                            return { gqlTypeName: 'ChatUpdateMessageAppended', message: toGqlChatMessage(joined) };
                        }
                        case 'assistantTextChunk':
                            return {
                                gqlTypeName: 'ChatUpdateAssistantTextChunk',
                                chatMessageId: payload.chatMessageId,
                                delta: payload.delta,
                            };
                        case 'turnEnded':
                            return { gqlTypeName: 'ChatUpdateTurnEnded', generationId: payload.generationId };
                    }
                },
            },
        },
    };
}
