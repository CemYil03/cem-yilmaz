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
import { cvExperienceUpsert } from '../commands/cvExperienceUpsert';
import { cvHobbyDelete } from '../commands/cvHobbyDelete';
import { cvHobbyReorder } from '../commands/cvHobbyReorder';
import { cvHobbyUpsert } from '../commands/cvHobbyUpsert';
import { cvSkillDelete } from '../commands/cvSkillDelete';
import { cvSkillReorder } from '../commands/cvSkillReorder';
import { cvSkillUpsert } from '../commands/cvSkillUpsert';
import { itemDelete } from '../commands/itemDelete';
import { itemDispose } from '../commands/itemDispose';
import { itemFileAttach } from '../commands/itemFileAttach';
import { itemFileDelete } from '../commands/itemFileDelete';
import { itemFileTogglePin } from '../commands/itemFileTogglePin';
import { itemReprice } from '../commands/itemReprice';
import { itemServiceEntryDelete } from '../commands/itemServiceEntryDelete';
import { itemServiceEntryUpsert } from '../commands/itemServiceEntryUpsert';
import { itemUpsert } from '../commands/itemUpsert';
import { mediaChannelDelete } from '../commands/mediaChannelDelete';
import { mediaChannelReorder } from '../commands/mediaChannelReorder';
import { mediaChannelUpsert } from '../commands/mediaChannelUpsert';
import { medicalAppointmentComplete } from '../commands/medicalAppointmentComplete';
import { medicalAppointmentDelete } from '../commands/medicalAppointmentDelete';
import { medicalAppointmentUpsert } from '../commands/medicalAppointmentUpsert';
import { medicalRecordDelete } from '../commands/medicalRecordDelete';
import { medicalRecordFileAttach } from '../commands/medicalRecordFileAttach';
import { medicalRecordFileDelete } from '../commands/medicalRecordFileDelete';
import { medicalRecordUpsert } from '../commands/medicalRecordUpsert';
import { tripActivitiesDelete } from '../commands/tripActivitiesDelete';
import { tripActivitiesUpsert } from '../commands/tripActivitiesUpsert';
import { tripDaysDelete } from '../commands/tripDaysDelete';
import { tripDaysUpsert } from '../commands/tripDaysUpsert';
import { tripPackingItemsDelete } from '../commands/tripPackingItemsDelete';
import { tripPackingItemsUpsert } from '../commands/tripPackingItemsUpsert';
import { tripsDelete } from '../commands/tripsDelete';
import { tripsUpsert } from '../commands/tripsUpsert';
import { movieAddFromTmdb } from '../commands/movieAddFromTmdb';
import { movieDelete } from '../commands/movieDelete';
import { movieMarkWatched } from '../commands/movieMarkWatched';
import { movieUpsert } from '../commands/movieUpsert';
import { showAddFromTmdb } from '../commands/showAddFromTmdb';
import { showDelete } from '../commands/showDelete';
import { showUpsert } from '../commands/showUpsert';
import { compassObservationDismiss } from '../commands/compassObservationDismiss';
import { compassSynthesizeRequest } from '../commands/compassSynthesizeRequest';
import { compassInterviewStart } from '../commands/compassInterviewStart';
import { compassInterviewMessageSend } from '../commands/compassInterviewMessageSend';
import { compassInterviewEnd } from '../commands/compassInterviewEnd';
import { compassInterviewSkip } from '../commands/compassInterviewSkip';
import { compassInterviewStartNow } from '../commands/compassInterviewStartNow';
import { compassScheduledInterviewDismiss } from '../commands/compassScheduledInterviewDismiss';
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
import { toGqlCompassInterviewMessage } from '../mappers/toGqlCompassInterviewMessage';
import { chatFindOne } from '../queries/chatFindOne';
import { chatFindMany } from '../queries/chatFindMany';
import { adminChatFindMany } from '../queries/adminChatFindMany';
import { adminChatCount } from '../queries/adminChatCount';
import { chatMessageFindOne } from '../queries/chatMessageFindOne';
import { compassInterviewMessageFindOne } from '../queries/compassInterviewMessageFindOne';
import { visitorChatFindMany } from '../queries/visitorChatFindMany';
import { visitorChatFindOne } from '../queries/visitorChatFindOne';
import { publicCvEducationFindMany } from '../queries/publicCvEducationFindMany';
import { publicCvExperienceFindMany } from '../queries/publicCvExperienceFindMany';
import { publicCvHobbyFindMany } from '../queries/publicCvHobbyFindMany';
import { publicCvSkillFindMany } from '../queries/publicCvSkillFindMany';
import { adminMediaChannelFindMany } from '../queries/adminMediaChannelFindMany';
import { adminMedicalAppointmentFindMany } from '../queries/adminMedicalAppointmentFindMany';
import { adminMedicalCategoryOverviewFindMany } from '../queries/adminMedicalCategoryOverviewFindMany';
import { adminMedicalRecordFindMany } from '../queries/adminMedicalRecordFindMany';
import { adminTravelTripFindOne } from '../queries/adminTravelTripFindOne';
import { adminTravelTripFindMany } from '../queries/adminTravelTripFindMany';
import { adminInventoryItemFindOne } from '../queries/adminInventoryItemFindOne';
import { adminInventoryItemFindMany } from '../queries/adminInventoryItemFindMany';
import { adminInventoryMaterialNetWorthCentsFindOne } from '../queries/adminInventoryMaterialNetWorthCentsFindOne';
import { adminInventoryItemUpcomingWarrantyFindMany } from '../queries/adminInventoryItemUpcomingWarrantyFindMany';
import { adminMediaMovieFindMany } from '../queries/adminMediaMovieFindMany';
import { adminMediaShowFindMany } from '../queries/adminMediaShowFindMany';
import { adminCompassFindOne } from '../queries/adminCompassFindOne';
import { adminCompassInterviewPendingFindOne } from '../queries/adminCompassInterviewPendingFindOne';
import { adminCompassInterviewFindOne } from '../queries/adminCompassInterviewFindOne';
import { adminCompassInterviewFindMany } from '../queries/adminCompassInterviewFindMany';
import { adminLogFindMany } from '../queries/adminLogFindMany';
import { adminCompassObservationFindMany } from '../queries/adminCompassObservationFindMany';
import { adminCompassSynthesisInProgressFindOne } from '../queries/adminCompassSynthesisInProgressFindOne';
import { adminProjectRequestFindMany } from '../queries/adminProjectRequestFindMany';
import { adminProjectRequestInboxCount } from '../queries/adminProjectRequestInboxCount';
import { adminProjectFindMany } from '../queries/adminProjectFindMany';
import { adminProjectFindOne } from '../queries/adminProjectFindOne';
import { adminProjectActiveTimerFindOne } from '../queries/adminProjectActiveTimerFindOne';
import { adminChatConfigFindOne } from '../queries/adminChatConfigFindOne';
import { sessionUserFindOne } from '../queries/sessionUserFindOne';
import { adminStandaloneTaskFindMany } from '../queries/adminStandaloneTaskFindMany';
import { adminStandaloneTaskOpenCount } from '../queries/adminStandaloneTaskOpenCount';
import { visitorChatQuotaFindOne } from '../queries/visitorChatQuotaFindOne';
import type {
    GqlSAdmin,
    GqlSAdminAdminChatCountArgs,
    GqlSAdminAdminChatFindManyArgs,
    GqlSAdminAdminChatFindOneArgs,
    GqlSAdminAdminLogFindManyArgs,
    GqlSAdminMutation,
    GqlSAdminMutationChatConfigDefaultModelSetArgs,
    GqlSAdminMutationChatInputCollectionRespondArgs,
    GqlSAdminMutationChatMessageCreateArgs,
    GqlSAdminMutationChatToolApprovalRespondArgs,
    GqlSAdminMutationCvEducationDeleteArgs,
    GqlSAdminMutationCvEducationReorderArgs,
    GqlSAdminMutationCvEducationUpsertArgs,
    GqlSAdminMutationCvExperienceDeleteArgs,
    GqlSAdminMutationCvExperienceUpsertArgs,
    GqlSAdminMutationCvHobbyDeleteArgs,
    GqlSAdminMutationCvHobbyReorderArgs,
    GqlSAdminMutationCvHobbyUpsertArgs,
    GqlSAdminMutationCvSkillDeleteArgs,
    GqlSAdminMutationCvSkillReorderArgs,
    GqlSAdminMutationCvSkillUpsertArgs,
    GqlSAdminMutationItemDeleteArgs,
    GqlSAdminMutationItemDisposeArgs,
    GqlSAdminMutationItemFileAttachArgs,
    GqlSAdminMutationItemFileDeleteArgs,
    GqlSAdminMutationItemFileTogglePinArgs,
    GqlSAdminMutationItemRepriceArgs,
    GqlSAdminMutationItemServiceEntryDeleteArgs,
    GqlSAdminMutationItemServiceEntryUpsertArgs,
    GqlSAdminMutationItemUpsertArgs,
    GqlSAdminMutationMediaChannelDeleteArgs,
    GqlSAdminMutationMediaChannelReorderArgs,
    GqlSAdminMutationMediaChannelUpsertArgs,
    GqlSAdminMutationMedicalAppointmentCompleteArgs,
    GqlSAdminMutationMedicalAppointmentDeleteArgs,
    GqlSAdminMutationMedicalAppointmentUpsertArgs,
    GqlSAdminMutationMedicalRecordDeleteArgs,
    GqlSAdminMutationMedicalRecordFileAttachArgs,
    GqlSAdminMutationMedicalRecordFileDeleteArgs,
    GqlSAdminMutationMedicalRecordUpsertArgs,
    GqlSAdminMutationTripActivitiesDeleteArgs,
    GqlSAdminMutationTripActivitiesUpsertArgs,
    GqlSAdminMutationTripDaysDeleteArgs,
    GqlSAdminMutationTripDaysUpsertArgs,
    GqlSAdminMutationTripPackingItemsDeleteArgs,
    GqlSAdminMutationTripPackingItemsUpsertArgs,
    GqlSAdminMutationTripsDeleteArgs,
    GqlSAdminMutationTripsUpsertArgs,
    GqlSAdminMutationMovieAddFromTmdbArgs,
    GqlSAdminMutationMovieDeleteArgs,
    GqlSAdminMutationMovieMarkWatchedArgs,
    GqlSAdminMutationMovieUpsertArgs,
    GqlSAdminMutationShowAddFromTmdbArgs,
    GqlSAdminMutationShowDeleteArgs,
    GqlSAdminMutationShowUpsertArgs,
    GqlSAdminInventoryQuery,
    GqlSAdminInventoryQueryAdminInventoryItemFindManyArgs,
    GqlSAdminInventoryQueryAdminInventoryItemFindOneArgs,
    GqlSAdminInventoryQueryAdminInventoryItemUpcomingWarrantyFindManyArgs,
    GqlSAdminMediaQuery,
    GqlSAdminMediaQueryAdminMediaChannelFindManyArgs,
    GqlSAdminMediaQueryAdminMediaTmdbFindManyArgs,
    GqlSAdminMediaQueryAdminMediaTmdbTvFindManyArgs,
    GqlSAdminMediaQueryAdminMediaYoutubeFindManyArgs,
    GqlSAdminMedicalQuery,
    GqlSAdminTravelQuery,
    GqlSAdminTravelQueryAdminTravelTripFindOneArgs,
    GqlSAdminMutationCompassObservationDismissArgs,
    GqlSAdminMutationCompassInterviewStartArgs,
    GqlSAdminMutationCompassInterviewMessageSendArgs,
    GqlSAdminMutationCompassInterviewEndArgs,
    GqlSAdminMutationCompassInterviewSkipArgs,
    GqlSAdminMutationCompassInterviewStartNowArgs,
    GqlSAdminCompassAdminCompassInterviewFindOneArgs,
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
    GqlSAdminCompassAdminCompassObservationFindManyArgs,
    GqlSAdminAdminProjectFindOneArgs,
    GqlSAdminAdminProjectRequestFindManyArgs,
    GqlSAdminAdminProjectFindManyArgs,
    GqlSAdminAdminPublicChatFindOneArgs,
    GqlSChatAssistantInput,
    GqlSChatAssistantInputValue,
    GqlSChatMessage,
    GqlSChatUpdate,
    GqlSCompassInterviewUpdate,
    GqlSCvQuery,
    GqlSMutationChatInputCollectionRespondArgs,
    GqlSMutationChatMessageCreateArgs,
    GqlSMutationChatToolApprovalRespondArgs,
    GqlSResolvers,
    GqlSSession,
    GqlSSessionVisitorChatFindOneArgs,
    GqlSSubscriptionChatUpdatesArgs,
    GqlSSubscriptionCompassInterviewUpdatesArgs,
    GqlSUser,
    GqlSUserMutation,
    GqlSUserMutationUserSessionTerminateManyArgs,
    GqlSUserMutationUserUpdateArgs,
} from './generated';
import type { ChatUpdateWirePayload } from './chatUpdateWirePayload';
import type { CompassInterviewUpdateWirePayload } from './compassInterviewUpdateWirePayload';

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
        CompassInterviewUpdate: {
            __resolveType(obj: GqlSCompassInterviewUpdate) {
                return obj.gqlTypeName;
            },
        },
        Session: {
            user(_session: GqlSSession, __: any, requestingSession: GqlSSession) {
                return sessionUserFindOne(requestingSession, serverRuntime);
            },
            visitorChatFindMany(_session: GqlSSession, __: any, requestingSession: GqlSSession) {
                return visitorChatFindMany(requestingSession, serverRuntime);
            },
            visitorChatFindOne(_session: GqlSSession, args: GqlSSessionVisitorChatFindOneArgs, requestingSession: GqlSSession) {
                return visitorChatFindOne(args.chatId, requestingSession, serverRuntime);
            },
            visitorChatQuotaFindOne(_session: GqlSSession, __: any, requestingSession: GqlSSession) {
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
            userSessionTerminateMany(
                { userId }: GqlSUserMutation,
                args: GqlSUserMutationUserSessionTerminateManyArgs,
                requestingSession: GqlSSession,
            ) {
                return userSessionTerminateMany(userId, args, requestingSession, serverRuntime);
            },
        },
        Admin: {
            adminPublicChatFindMany(_parent: GqlSAdmin, __: any, requestingSession: GqlSSession) {
                return chatFindMany('public', requestingSession, serverRuntime);
            },
            adminPublicChatFindOne(_parent: GqlSAdmin, args: GqlSAdminAdminPublicChatFindOneArgs, requestingSession: GqlSSession) {
                return chatFindOne(args.chatId, 'public', requestingSession, serverRuntime);
            },
            adminChatFindMany(_parent: GqlSAdmin, args: GqlSAdminAdminChatFindManyArgs, requestingSession: GqlSSession) {
                return adminChatFindMany(args, requestingSession, serverRuntime);
            },
            adminChatCount(_parent: GqlSAdmin, args: GqlSAdminAdminChatCountArgs, requestingSession: GqlSSession) {
                return adminChatCount(args, requestingSession, serverRuntime);
            },
            adminChatFindOne(_parent: GqlSAdmin, args: GqlSAdminAdminChatFindOneArgs, requestingSession: GqlSSession) {
                return chatFindOne(args.chatId, 'admin', requestingSession, serverRuntime);
            },
            // Compass shell — the scalar fields come straight off the row;
            // `adminCompassObservationFindMany`, `adminCompassInterviewFindMany`,
            // `adminCompassInterviewFindOne`, and `adminCompassInterviewPendingFindOne`
            // resolve separately so they can take arguments and run their own
            // queries, and `synthesisInProgress` is resolved separately because
            // it reads pg-boss, not the `Compass` row. We pass placeholders
            // here that the field resolvers below overwrite.
            async adminCompassFindOne(): Promise<GqlSAdminCompass> {
                const row = await adminCompassFindOne(serverRuntime.db);
                return {
                    ...toGqlCompass(row),
                    adminCompassObservationFindMany: [],
                    synthesisInProgress: false,
                    adminCompassInterviewFindMany: [],
                    adminCompassInterviewFindOne: null,
                    adminCompassInterviewPendingFindOne: null,
                };
            },
            adminProjectRequestFindMany(
                _parent: GqlSAdmin,
                args: GqlSAdminAdminProjectRequestFindManyArgs,
                requestingSession: GqlSSession,
            ) {
                return adminProjectRequestFindMany(args.status ?? null, requestingSession, serverRuntime);
            },
            adminProjectRequestInboxCount(_parent: GqlSAdmin, __: any, requestingSession: GqlSSession) {
                return adminProjectRequestInboxCount(requestingSession, serverRuntime);
            },
            adminProjectFindMany(_parent: GqlSAdmin, args: GqlSAdminAdminProjectFindManyArgs, requestingSession: GqlSSession) {
                return adminProjectFindMany(args.status ?? null, requestingSession, serverRuntime);
            },
            adminProjectFindOne(_parent: GqlSAdmin, args: GqlSAdminAdminProjectFindOneArgs, requestingSession: GqlSSession) {
                return adminProjectFindOne(args.projectId, requestingSession, serverRuntime);
            },
            adminStandaloneTaskFindMany(_parent: GqlSAdmin, __: any, requestingSession: GqlSSession) {
                return adminStandaloneTaskFindMany(requestingSession, serverRuntime);
            },
            adminStandaloneTaskOpenCount(_parent: GqlSAdmin, __: any, requestingSession: GqlSSession) {
                return adminStandaloneTaskOpenCount(requestingSession, serverRuntime);
            },
            adminProjectActiveTimerFindOne(_parent: GqlSAdmin, __: any, requestingSession: GqlSSession) {
                return adminProjectActiveTimerFindOne(requestingSession, serverRuntime);
            },
            // CV editor reads the same `CvQuery` the public surfaces use. The
            // resolver chain on `User.admin` already gated this with
            // `guardAdmin`, and `CvQuery` field resolvers run on every
            // request regardless of parent — the empty object is just a
            // shell, identical to `Query.publicCvFindOne()` below.
            adminCvFindOne(): GqlSCvQuery {
                return {} as GqlSCvQuery;
            },
            // Media editor namespace — same shell pattern as `adminCvFindOne`
            // above. The per-field resolvers on `AdminMediaQuery` fan out to
            // the list queries. See `docs/features/workspace-media.md`.
            adminMediaFindOne(): GqlSAdminMediaQuery {
                return {} as GqlSAdminMediaQuery;
            },
            // Inventory namespace — same shell pattern. Per-field resolvers
            // on `AdminInventoryQuery` fan out to the item / valuation /
            // net-worth queries. See `docs/features/workspace-inventory.md`.
            adminInventoryFindOne(): GqlSAdminInventoryQuery {
                return {} as GqlSAdminInventoryQuery;
            },
            // Medical namespace — same shell pattern. Per-field resolvers on
            // `AdminMedicalQuery` fan out to the appointment / record /
            // overview queries. See `docs/features/workspace-medical.md`.
            adminMedicalFindOne(): GqlSAdminMedicalQuery {
                return {} as GqlSAdminMedicalQuery;
            },
            // Travel namespace — same shell pattern. Per-field resolvers on
            // `AdminTravelQuery` fan out to `adminTravelTripFindMany` /
            // `adminTravelTripFindOne`. See `docs/features/workspace-travel.md`.
            adminTravelFindOne(): GqlSAdminTravelQuery {
                return {} as GqlSAdminTravelQuery;
            },
            async adminChatConfigFindOne(_parent: GqlSAdmin) {
                // Catalog is server-static — same array on every read. The
                // saved default is the only DB-bound part; we resolve it here
                // (and bootstrap the singleton row if it doesn't exist yet)
                // so the composer always gets a concrete `defaultModelId`.
                const row = await adminChatConfigFindOne(serverRuntime.db);
                return {
                    availableModels: ADMIN_CHAT_MODELS.map((model) => ({
                        modelId: model.modelId,
                        label: model.label,
                        supportedMediaTypes: [...model.supportedMediaTypes],
                    })),
                    defaultModelId: row.defaultModelId,
                };
            },
            adminLogFindMany(_parent: GqlSAdmin, args: GqlSAdminAdminLogFindManyArgs, requestingSession: GqlSSession) {
                return adminLogFindMany(args, requestingSession, serverRuntime);
            },
        },
        AdminCompass: {
            adminCompassObservationFindMany(
                _parent: GqlSAdminCompass,
                args: GqlSAdminCompassAdminCompassObservationFindManyArgs,
                requestingSession: GqlSSession,
            ) {
                return adminCompassObservationFindMany(
                    {
                        category: args.category ?? null,
                        includeDismissed: args.includeDismissed ?? false,
                    },
                    requestingSession,
                    serverRuntime,
                );
            },
            // Derived from pg-boss — see `adminCompassSynthesisInProgressFindOne`.
            synthesisInProgress() {
                return adminCompassSynthesisInProgressFindOne(serverRuntime);
            },
            // Psychological-interview rails. Each resolver returns one shape
            // of `CompassInterview`; the `messages` field is populated only
            // by the `adminCompassInterviewFindOne(interviewId)` lookup (the
            // list/pending forms hand `[]`, and the `CompassInterview.messages`
            // field resolver below lazily loads them on demand).
            async adminCompassInterviewFindMany() {
                const rows = await adminCompassInterviewFindMany(serverRuntime);
                return rows.map((row) => toGqlCompassInterview(row));
            },
            async adminCompassInterviewFindOne(_parent: GqlSAdminCompass, args: GqlSAdminCompassAdminCompassInterviewFindOneArgs) {
                const loaded = await adminCompassInterviewFindOne(args.interviewId, serverRuntime);
                if (!loaded) return null;
                return toGqlCompassInterview(loaded.interview, loaded.messages);
            },
            async adminCompassInterviewPendingFindOne() {
                const row = await adminCompassInterviewPendingFindOne(serverRuntime);
                if (!row) return null;
                // Caller almost always wants the messages to render the
                // in-progress card's transcript inline; load them here so the
                // page query doesn't need a second round-trip. For a freshly
                // `pending` row this returns `[]`, which is correct.
                const loaded = await adminCompassInterviewFindOne(row.interviewId, serverRuntime);
                if (!loaded) return toGqlCompassInterview(row);
                return toGqlCompassInterview(loaded.interview, loaded.messages);
            },
        },
        CvQuery: {
            publicCvExperienceFindMany(_parent: GqlSCvQuery, __: any, requestingSession: GqlSSession) {
                return publicCvExperienceFindMany(requestingSession, serverRuntime);
            },
            publicCvEducationFindMany(_parent: GqlSCvQuery, __: any, requestingSession: GqlSSession) {
                return publicCvEducationFindMany(requestingSession, serverRuntime);
            },
            publicCvSkillFindMany(_parent: GqlSCvQuery, __: any, requestingSession: GqlSSession) {
                return publicCvSkillFindMany(requestingSession, serverRuntime);
            },
            publicCvHobbyFindMany(_parent: GqlSCvQuery, __: any, requestingSession: GqlSSession) {
                return publicCvHobbyFindMany(requestingSession, serverRuntime);
            },
        },
        AdminMediaQuery: {
            adminMediaMovieFindMany(_parent: GqlSAdminMediaQuery, __: any, requestingSession: GqlSSession) {
                return adminMediaMovieFindMany(requestingSession, serverRuntime);
            },
            adminMediaShowFindMany(_parent: GqlSAdminMediaQuery, __: any, requestingSession: GqlSSession) {
                return adminMediaShowFindMany(requestingSession, serverRuntime);
            },
            adminMediaChannelFindMany(
                _parent: GqlSAdminMediaQuery,
                args: GqlSAdminMediaQueryAdminMediaChannelFindManyArgs,
                requestingSession: GqlSSession,
            ) {
                return adminMediaChannelFindMany(args.topic ?? null, requestingSession, serverRuntime);
            },
            // TMDB search sits on the read namespace even though it's a
            // live third-party fetch — the media page reaches for it every
            // keystroke through the same URQL client that reads the movie
            // list, so co-locating them keeps the wiring simple. Empty on
            // missing API key, on TMDB error, or on empty query.
            adminMediaTmdbFindMany(_parent: GqlSAdminMediaQuery, args: GqlSAdminMediaQueryAdminMediaTmdbFindManyArgs) {
                return serverRuntime.tmdb.searchMovies(args.query);
            },
            adminMediaTmdbTvFindMany(_parent: GqlSAdminMediaQuery, args: GqlSAdminMediaQueryAdminMediaTmdbTvFindManyArgs) {
                return serverRuntime.tmdb.searchTv(args.query);
            },
            // Same shape as `adminMediaTmdbFindMany` above — third-party read
            // used only by the channels-tab typeahead. Empty on missing API
            // key, on YouTube error, or on empty query.
            adminMediaYoutubeFindMany(_parent: GqlSAdminMediaQuery, args: GqlSAdminMediaQueryAdminMediaYoutubeFindManyArgs) {
                return serverRuntime.youtube.searchChannels(args.query);
            },
        },
        AdminInventoryQuery: {
            adminInventoryItemFindMany(
                _parent: GqlSAdminInventoryQuery,
                args: GqlSAdminInventoryQueryAdminInventoryItemFindManyArgs,
                requestingSession: GqlSSession,
            ) {
                return adminInventoryItemFindMany(args.includeDisposed ?? false, requestingSession, serverRuntime);
            },
            adminInventoryItemFindOne(
                _parent: GqlSAdminInventoryQuery,
                args: GqlSAdminInventoryQueryAdminInventoryItemFindOneArgs,
                requestingSession: GqlSSession,
            ) {
                return adminInventoryItemFindOne(args.itemId, requestingSession, serverRuntime);
            },
            adminInventoryMaterialNetWorthCentsFindOne(_parent: GqlSAdminInventoryQuery, __: any, requestingSession: GqlSSession) {
                return adminInventoryMaterialNetWorthCentsFindOne(requestingSession, serverRuntime);
            },
            adminInventoryItemUpcomingWarrantyFindMany(
                _parent: GqlSAdminInventoryQuery,
                args: GqlSAdminInventoryQueryAdminInventoryItemUpcomingWarrantyFindManyArgs,
                requestingSession: GqlSSession,
            ) {
                return adminInventoryItemUpcomingWarrantyFindMany(args.withinDays ?? 90, requestingSession, serverRuntime);
            },
        },
        AdminMedicalQuery: {
            adminMedicalAppointmentFindMany(_parent: GqlSAdminMedicalQuery, __: any, requestingSession: GqlSSession) {
                return adminMedicalAppointmentFindMany(requestingSession, serverRuntime);
            },
            adminMedicalRecordFindMany(_parent: GqlSAdminMedicalQuery, __: any, requestingSession: GqlSSession) {
                return adminMedicalRecordFindMany(requestingSession, serverRuntime);
            },
            adminMedicalCategoryOverviewFindMany(_parent: GqlSAdminMedicalQuery, __: any, requestingSession: GqlSSession) {
                return adminMedicalCategoryOverviewFindMany(requestingSession, serverRuntime);
            },
        },
        AdminTravelQuery: {
            adminTravelTripFindMany(_parent: GqlSAdminTravelQuery, __: any, requestingSession: GqlSSession) {
                return adminTravelTripFindMany(requestingSession, serverRuntime);
            },
            adminTravelTripFindOne(
                _parent: GqlSAdminTravelQuery,
                args: GqlSAdminTravelQueryAdminTravelTripFindOneArgs,
                requestingSession: GqlSSession,
            ) {
                return adminTravelTripFindOne(args.tripId, requestingSession, serverRuntime);
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
            compassInterviewStartNow(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationCompassInterviewStartNowArgs,
                requestingSession: GqlSSession,
            ) {
                return compassInterviewStartNow(userId, args, requestingSession, serverRuntime);
            },
            compassScheduledInterviewDismiss({ userId }: GqlSAdminMutation, __: any, requestingSession: GqlSSession) {
                return compassScheduledInterviewDismiss(userId, requestingSession, serverRuntime);
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
            movieUpsert({ userId }: GqlSAdminMutation, args: GqlSAdminMutationMovieUpsertArgs, requestingSession: GqlSSession) {
                return movieUpsert(userId, args, requestingSession, serverRuntime);
            },
            movieDelete({ userId }: GqlSAdminMutation, args: GqlSAdminMutationMovieDeleteArgs, requestingSession: GqlSSession) {
                return movieDelete(userId, args, requestingSession, serverRuntime);
            },
            movieMarkWatched({ userId }: GqlSAdminMutation, args: GqlSAdminMutationMovieMarkWatchedArgs, requestingSession: GqlSSession) {
                return movieMarkWatched(userId, args, requestingSession, serverRuntime);
            },
            movieAddFromTmdb({ userId }: GqlSAdminMutation, args: GqlSAdminMutationMovieAddFromTmdbArgs, requestingSession: GqlSSession) {
                return movieAddFromTmdb(userId, args, requestingSession, serverRuntime);
            },
            showUpsert({ userId }: GqlSAdminMutation, args: GqlSAdminMutationShowUpsertArgs, requestingSession: GqlSSession) {
                return showUpsert(userId, args, requestingSession, serverRuntime);
            },
            showDelete({ userId }: GqlSAdminMutation, args: GqlSAdminMutationShowDeleteArgs, requestingSession: GqlSSession) {
                return showDelete(userId, args, requestingSession, serverRuntime);
            },
            showAddFromTmdb({ userId }: GqlSAdminMutation, args: GqlSAdminMutationShowAddFromTmdbArgs, requestingSession: GqlSSession) {
                return showAddFromTmdb(userId, args, requestingSession, serverRuntime);
            },
            mediaChannelUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationMediaChannelUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return mediaChannelUpsert(userId, args, requestingSession, serverRuntime);
            },
            mediaChannelDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationMediaChannelDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return mediaChannelDelete(userId, args, requestingSession, serverRuntime);
            },
            mediaChannelReorder(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationMediaChannelReorderArgs,
                requestingSession: GqlSSession,
            ) {
                return mediaChannelReorder(userId, args, requestingSession, serverRuntime);
            },
            medicalAppointmentUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationMedicalAppointmentUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return medicalAppointmentUpsert(userId, args, requestingSession, serverRuntime);
            },
            medicalAppointmentDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationMedicalAppointmentDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return medicalAppointmentDelete(userId, args, requestingSession, serverRuntime);
            },
            medicalAppointmentComplete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationMedicalAppointmentCompleteArgs,
                requestingSession: GqlSSession,
            ) {
                return medicalAppointmentComplete(userId, args, requestingSession, serverRuntime);
            },
            medicalRecordUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationMedicalRecordUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return medicalRecordUpsert(userId, args, requestingSession, serverRuntime);
            },
            medicalRecordDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationMedicalRecordDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return medicalRecordDelete(userId, args, requestingSession, serverRuntime);
            },
            medicalRecordFileAttach(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationMedicalRecordFileAttachArgs,
                requestingSession: GqlSSession,
            ) {
                return medicalRecordFileAttach(userId, args, requestingSession, serverRuntime);
            },
            medicalRecordFileDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationMedicalRecordFileDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return medicalRecordFileDelete(userId, args, requestingSession, serverRuntime);
            },
            itemUpsert({ userId }: GqlSAdminMutation, args: GqlSAdminMutationItemUpsertArgs, requestingSession: GqlSSession) {
                return itemUpsert(userId, args, requestingSession, serverRuntime);
            },
            itemDelete({ userId }: GqlSAdminMutation, args: GqlSAdminMutationItemDeleteArgs, requestingSession: GqlSSession) {
                return itemDelete(userId, args, requestingSession, serverRuntime);
            },
            itemDispose({ userId }: GqlSAdminMutation, args: GqlSAdminMutationItemDisposeArgs, requestingSession: GqlSSession) {
                return itemDispose(userId, args, requestingSession, serverRuntime);
            },
            itemReprice({ userId }: GqlSAdminMutation, args: GqlSAdminMutationItemRepriceArgs, requestingSession: GqlSSession) {
                return itemReprice(userId, args, requestingSession, serverRuntime);
            },
            itemServiceEntryUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationItemServiceEntryUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return itemServiceEntryUpsert(userId, args, requestingSession, serverRuntime);
            },
            itemServiceEntryDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationItemServiceEntryDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return itemServiceEntryDelete(userId, args, requestingSession, serverRuntime);
            },
            itemFileAttach({ userId }: GqlSAdminMutation, args: GqlSAdminMutationItemFileAttachArgs, requestingSession: GqlSSession) {
                return itemFileAttach(userId, args, requestingSession, serverRuntime);
            },
            itemFileDelete({ userId }: GqlSAdminMutation, args: GqlSAdminMutationItemFileDeleteArgs, requestingSession: GqlSSession) {
                return itemFileDelete(userId, args, requestingSession, serverRuntime);
            },
            itemFileTogglePin({ userId }: GqlSAdminMutation, args: GqlSAdminMutationItemFileTogglePinArgs, requestingSession: GqlSSession) {
                return itemFileTogglePin(userId, args, requestingSession, serverRuntime);
            },
            tripsUpsert({ userId }: GqlSAdminMutation, args: GqlSAdminMutationTripsUpsertArgs, requestingSession: GqlSSession) {
                return tripsUpsert(userId, args.trips, requestingSession, serverRuntime);
            },
            tripsDelete({ userId }: GqlSAdminMutation, args: GqlSAdminMutationTripsDeleteArgs, requestingSession: GqlSSession) {
                return tripsDelete(userId, args.tripIds, requestingSession, serverRuntime);
            },
            tripDaysUpsert({ userId }: GqlSAdminMutation, args: GqlSAdminMutationTripDaysUpsertArgs, requestingSession: GqlSSession) {
                return tripDaysUpsert(userId, args.tripDays, requestingSession, serverRuntime);
            },
            tripDaysDelete({ userId }: GqlSAdminMutation, args: GqlSAdminMutationTripDaysDeleteArgs, requestingSession: GqlSSession) {
                return tripDaysDelete(userId, args.tripDayIds, requestingSession, serverRuntime);
            },
            tripActivitiesUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationTripActivitiesUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return tripActivitiesUpsert(userId, args.tripActivities, requestingSession, serverRuntime);
            },
            tripActivitiesDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationTripActivitiesDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return tripActivitiesDelete(userId, args.tripActivityIds, requestingSession, serverRuntime);
            },
            tripPackingItemsUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationTripPackingItemsUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return tripPackingItemsUpsert(userId, args.tripPackingItems, requestingSession, serverRuntime);
            },
            tripPackingItemsDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationTripPackingItemsDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return tripPackingItemsDelete(userId, args.tripPackingItemIds, requestingSession, serverRuntime);
            },
        },
        Query: {
            sessionFindOne(_: any, __: any, requestingSession: GqlSSession) {
                return requestingSession;
            },
            // The CV namespace is public — every visitor can read the
            // timeline on `/cv` and the skill block on `/about`. Return an
            // empty parent shell; per-field resolvers do the actual reads.
            publicCvFindOne() {
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
                            const joined = await chatMessageFindOne(serverRuntime.db, payload.chatMessageId);
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
            compassInterviewUpdates: {
                // Same "generationId is the capability" model as `chatUpdates`.
                // The interview lifecycle is admin-only, but the resolver
                // itself doesn't need to re-check that — the mutation that
                // allocated the id is what verified admin scope. Whoever holds
                // the (client-minted, unguessable) UUID has already sent it
                // through the mutation layer.
                subscribe(_: any, { generationId }: GqlSSubscriptionCompassInterviewUpdatesArgs) {
                    return serverRuntime.subscribe.to(`compass-interview-updates:${generationId}`);
                },
                async resolve(payload: CompassInterviewUpdateWirePayload): Promise<GqlSCompassInterviewUpdate> {
                    switch (payload.kind) {
                        case 'messageAppended': {
                            const row = await compassInterviewMessageFindOne(serverRuntime.db, payload.interviewMessageId);
                            if (!row) throw new Error(`compassInterviewUpdates: row ${payload.interviewMessageId} not found on re-load`);
                            return {
                                gqlTypeName: 'CompassInterviewUpdateMessageAppended',
                                message: toGqlCompassInterviewMessage(row),
                            };
                        }
                        case 'assistantTextChunk':
                            return {
                                gqlTypeName: 'CompassInterviewUpdateAssistantTextChunk',
                                interviewMessageId: payload.interviewMessageId,
                                delta: payload.delta,
                            };
                        case 'turnEnded':
                            return {
                                gqlTypeName: 'CompassInterviewUpdateTurnEnded',
                                generationId: payload.generationId,
                                concluded: payload.concluded,
                            };
                    }
                },
            },
        },
    };
}
