import { DateResolver, DateTimeResolver, JSONResolver } from 'graphql-scalars';
import { ADMIN_CHAT_MODELS } from '../agents/adminChatModels';
import { agentPersonalAssistant } from '../agents/agentPersonalAssistant';
import { agentVisitorAboutCem } from '../agents/agentVisitorAboutCem';
import { adminChatConfigDefaultModelSet } from '../commands/adminChatConfigDefaultModelSet';
import { chatInputCollectionRespond } from '../commands/chatInputCollectionRespond';
import type { ChatMutationDispatch } from '../commands/chatMessageCreate';
import { chatMessageCreate } from '../commands/chatMessageCreate';
import { chatToolApprovalRespond } from '../commands/chatToolApprovalRespond';
import { cvEducationReorder } from '../commands/cvEducationReorder';
import { cvEducationsDelete } from '../commands/cvEducationsDelete';
import { cvEducationsUpsert } from '../commands/cvEducationsUpsert';
import { cvExperiencesDelete } from '../commands/cvExperiencesDelete';
import { cvExperiencesUpsert } from '../commands/cvExperiencesUpsert';
import { cvHobbiesDelete } from '../commands/cvHobbiesDelete';
import { cvHobbiesUpsert } from '../commands/cvHobbiesUpsert';
import { cvHobbyReorder } from '../commands/cvHobbyReorder';
import { cvSkillReorder } from '../commands/cvSkillReorder';
import { cvSkillsDelete } from '../commands/cvSkillsDelete';
import { cvSkillsUpsert } from '../commands/cvSkillsUpsert';
import { itemsDelete } from '../commands/itemsDelete';
import { itemFilesAttach } from '../commands/itemFilesAttach';
import { itemFilesDelete } from '../commands/itemFilesDelete';
import { itemFilesUpsert } from '../commands/itemFilesUpsert';
import { itemsReprice } from '../commands/itemsReprice';
import { itemServiceEntriesDelete } from '../commands/itemServiceEntriesDelete';
import { itemServiceEntriesUpsert } from '../commands/itemServiceEntriesUpsert';
import { itemsUpsert } from '../commands/itemsUpsert';
import { financeMonthlyNetIncomeSet } from '../commands/financeMonthlyNetIncomeSet';
import { financeRecurringCostsDelete } from '../commands/financeRecurringCostsDelete';
import { financeRecurringCostsUpsert } from '../commands/financeRecurringCostsUpsert';
import { mediaChannelsDelete } from '../commands/mediaChannelsDelete';
import { mediaChannelReorder } from '../commands/mediaChannelReorder';
import { mediaChannelsUpsert } from '../commands/mediaChannelsUpsert';
import { medicalAppointmentsDelete } from '../commands/medicalAppointmentsDelete';
import { medicalAppointmentsUpsert } from '../commands/medicalAppointmentsUpsert';
import { medicalRecordFilesAttach } from '../commands/medicalRecordFilesAttach';
import { medicalRecordFilesDelete } from '../commands/medicalRecordFilesDelete';
import { medicalRecordsDelete } from '../commands/medicalRecordsDelete';
import { medicalRecordsUpsert } from '../commands/medicalRecordsUpsert';
import { tripActivitiesDelete } from '../commands/tripActivitiesDelete';
import { tripActivitiesUpsert } from '../commands/tripActivitiesUpsert';
import { tripDaysDelete } from '../commands/tripDaysDelete';
import { tripDaysUpsert } from '../commands/tripDaysUpsert';
import { tripPackingItemsDelete } from '../commands/tripPackingItemsDelete';
import { tripPackingItemsUpsert } from '../commands/tripPackingItemsUpsert';
import { tripsDelete } from '../commands/tripsDelete';
import { tripsUpsert } from '../commands/tripsUpsert';
import { recipesUpsert } from '../commands/recipesUpsert';
import { recipesDelete } from '../commands/recipesDelete';
import { mealPlanEntriesUpsert } from '../commands/mealPlanEntriesUpsert';
import { mealPlanEntriesDelete } from '../commands/mealPlanEntriesDelete';
import { foodLogEntriesUpsert } from '../commands/foodLogEntriesUpsert';
import { foodLogEntriesDelete } from '../commands/foodLogEntriesDelete';
import { supplementsUpsert } from '../commands/supplementsUpsert';
import { supplementsDelete } from '../commands/supplementsDelete';
import { supplementNutrientsReplace } from '../commands/supplementNutrientsReplace';
import { supplementCompositionResearch } from '../agents/supplementCompositionResearch';
import { exercisesUpsert } from '../commands/exercisesUpsert';
import { exercisesDelete } from '../commands/exercisesDelete';
import { workoutRoutinesUpsert } from '../commands/workoutRoutinesUpsert';
import { workoutRoutinesDelete } from '../commands/workoutRoutinesDelete';
import { workoutRoutineItemsUpsert } from '../commands/workoutRoutineItemsUpsert';
import { workoutRoutineItemsDelete } from '../commands/workoutRoutineItemsDelete';
import { workoutSessionsUpsert } from '../commands/workoutSessionsUpsert';
import { workoutSessionsDelete } from '../commands/workoutSessionsDelete';
import { workoutSetsUpsert } from '../commands/workoutSetsUpsert';
import { workoutSetsDelete } from '../commands/workoutSetsDelete';
import { moviesAddFromTmdb } from '../commands/moviesAddFromTmdb';
import { moviesDelete } from '../commands/moviesDelete';
import { moviesUpsert } from '../commands/moviesUpsert';
import { showsAddFromTmdb } from '../commands/showsAddFromTmdb';
import { showsDelete } from '../commands/showsDelete';
import { showsUpsert } from '../commands/showsUpsert';
import { compassObservationDismiss } from '../commands/compassObservationDismiss';
import { compassSynthesizeRequest } from '../commands/compassSynthesizeRequest';
import { compassInterviewStart } from '../commands/compassInterviewStart';
import { compassInterviewMessageSend } from '../commands/compassInterviewMessageSend';
import { compassInterviewEnd } from '../commands/compassInterviewEnd';
import { compassInterviewSkip } from '../commands/compassInterviewSkip';
import { compassInterviewStartNow } from '../commands/compassInterviewStartNow';
import { compassScheduledInterviewDismiss } from '../commands/compassScheduledInterviewDismiss';
import { projectActivitiesDelete } from '../commands/projectActivitiesDelete';
import { projectActivitiesUpsert } from '../commands/projectActivitiesUpsert';
import { projectFilesDelete } from '../commands/projectFilesDelete';
import { projectFilesUpsert } from '../commands/projectFilesUpsert';
import { projectLinksDelete } from '../commands/projectLinksDelete';
import { projectLinksUpsert } from '../commands/projectLinksUpsert';
import { projectRequestArchive } from '../commands/projectRequestArchive';
import { projectRequestDelete } from '../commands/projectRequestDelete';
import { projectReorder } from '../commands/projectReorder';
import { projectTimersStart } from '../commands/projectTimersStart';
import { projectTimersStop } from '../commands/projectTimersStop';
import { projectsDelete } from '../commands/projectsDelete';
import { projectsUpsert } from '../commands/projectsUpsert';
import { tasksDelete } from '../commands/tasksDelete';
import { taskReorder } from '../commands/taskReorder';
import { tasksUpsert } from '../commands/tasksUpsert';
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
import { adminNutritionRecipeFindMany } from '../queries/adminNutritionRecipeFindMany';
import { adminNutritionMealPlanFindMany } from '../queries/adminNutritionMealPlanFindMany';
import { adminNutritionFoodLogFindMany } from '../queries/adminNutritionFoodLogFindMany';
import { adminNutritionSupplementFindMany } from '../queries/adminNutritionSupplementFindMany';
import { adminFitnessExerciseFindMany } from '../queries/adminFitnessExerciseFindMany';
import { adminFitnessRoutineFindMany } from '../queries/adminFitnessRoutineFindMany';
import { adminFitnessSessionFindMany } from '../queries/adminFitnessSessionFindMany';
import { adminInventoryItemFindOne } from '../queries/adminInventoryItemFindOne';
import { adminInventoryItemFindMany } from '../queries/adminInventoryItemFindMany';
import { adminInventoryMaterialNetWorthCentsFindOne } from '../queries/adminInventoryMaterialNetWorthCentsFindOne';
import { adminInventoryItemUpcomingWarrantyFindMany } from '../queries/adminInventoryItemUpcomingWarrantyFindMany';
import { adminFinancesExpensesCentsFindOne } from '../queries/adminFinancesExpensesCentsFindOne';
import { adminFinancesMonthlyNetIncomeCentsFindOne } from '../queries/adminFinancesMonthlyNetIncomeCentsFindOne';
import { adminFinancesRecurringCostFindMany } from '../queries/adminFinancesRecurringCostFindMany';
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
    GqlSAdminMutationCvEducationReorderArgs,
    GqlSAdminMutationCvEducationsDeleteArgs,
    GqlSAdminMutationCvEducationsUpsertArgs,
    GqlSAdminMutationCvExperiencesDeleteArgs,
    GqlSAdminMutationCvExperiencesUpsertArgs,
    GqlSAdminMutationCvHobbiesDeleteArgs,
    GqlSAdminMutationCvHobbiesUpsertArgs,
    GqlSAdminMutationCvHobbyReorderArgs,
    GqlSAdminMutationCvSkillReorderArgs,
    GqlSAdminMutationCvSkillsDeleteArgs,
    GqlSAdminMutationCvSkillsUpsertArgs,
    GqlSAdminMutationItemsDeleteArgs,
    GqlSAdminMutationItemFilesAttachArgs,
    GqlSAdminMutationItemFilesDeleteArgs,
    GqlSAdminMutationItemFilesUpsertArgs,
    GqlSAdminMutationItemsRepriceArgs,
    GqlSAdminMutationItemServiceEntriesDeleteArgs,
    GqlSAdminMutationItemServiceEntriesUpsertArgs,
    GqlSAdminMutationItemsUpsertArgs,
    GqlSAdminMutationMediaChannelsDeleteArgs,
    GqlSAdminMutationMediaChannelReorderArgs,
    GqlSAdminMutationMediaChannelsUpsertArgs,
    GqlSAdminMutationMedicalAppointmentsDeleteArgs,
    GqlSAdminMutationMedicalAppointmentsUpsertArgs,
    GqlSAdminMutationMedicalRecordFilesAttachArgs,
    GqlSAdminMutationMedicalRecordFilesDeleteArgs,
    GqlSAdminMutationMedicalRecordsDeleteArgs,
    GqlSAdminMutationMedicalRecordsUpsertArgs,
    GqlSAdminMutationTripActivitiesDeleteArgs,
    GqlSAdminMutationTripActivitiesUpsertArgs,
    GqlSAdminMutationTripDaysDeleteArgs,
    GqlSAdminMutationTripDaysUpsertArgs,
    GqlSAdminMutationTripPackingItemsDeleteArgs,
    GqlSAdminMutationTripPackingItemsUpsertArgs,
    GqlSAdminMutationTripsDeleteArgs,
    GqlSAdminMutationTripsUpsertArgs,
    GqlSAdminMutationMoviesAddFromTmdbArgs,
    GqlSAdminMutationMoviesDeleteArgs,
    GqlSAdminMutationMoviesUpsertArgs,
    GqlSAdminMutationShowsAddFromTmdbArgs,
    GqlSAdminMutationShowsDeleteArgs,
    GqlSAdminMutationShowsUpsertArgs,
    GqlSAdminInventoryQuery,
    GqlSAdminInventoryQueryAdminInventoryItemFindManyArgs,
    GqlSAdminInventoryQueryAdminInventoryItemFindOneArgs,
    GqlSAdminInventoryQueryAdminInventoryItemUpcomingWarrantyFindManyArgs,
    GqlSAdminFinancesQuery,
    GqlSAdminMutationFinanceMonthlyNetIncomeSetArgs,
    GqlSAdminMutationFinanceRecurringCostsDeleteArgs,
    GqlSAdminMutationFinanceRecurringCostsUpsertArgs,
    GqlSAdminMediaQuery,
    GqlSAdminMediaQueryAdminMediaChannelFindManyArgs,
    GqlSAdminMediaQueryAdminMediaTmdbFindManyArgs,
    GqlSAdminMediaQueryAdminMediaTmdbTvFindManyArgs,
    GqlSAdminMediaQueryAdminMediaYoutubeFindManyArgs,
    GqlSAdminMedicalQuery,
    GqlSAdminTravelQuery,
    GqlSAdminTravelQueryAdminTravelTripFindOneArgs,
    GqlSAdminNutritionQuery,
    GqlSAdminNutritionQueryAdminNutritionRecipeFindManyArgs,
    GqlSAdminFitnessQuery,
    GqlSAdminMutationRecipesUpsertArgs,
    GqlSAdminMutationRecipesDeleteArgs,
    GqlSAdminMutationMealPlanEntriesUpsertArgs,
    GqlSAdminMutationMealPlanEntriesDeleteArgs,
    GqlSAdminMutationFoodLogEntriesUpsertArgs,
    GqlSAdminMutationFoodLogEntriesDeleteArgs,
    GqlSAdminMutationSupplementsUpsertArgs,
    GqlSAdminMutationSupplementsDeleteArgs,
    GqlSAdminMutationSupplementNutrientsReplaceArgs,
    GqlSAdminMutationSupplementResearchArgs,
    GqlSAdminMutationExercisesUpsertArgs,
    GqlSAdminMutationExercisesDeleteArgs,
    GqlSAdminMutationWorkoutRoutinesUpsertArgs,
    GqlSAdminMutationWorkoutRoutinesDeleteArgs,
    GqlSAdminMutationWorkoutRoutineItemsUpsertArgs,
    GqlSAdminMutationWorkoutRoutineItemsDeleteArgs,
    GqlSAdminMutationWorkoutSessionsUpsertArgs,
    GqlSAdminMutationWorkoutSessionsDeleteArgs,
    GqlSAdminMutationWorkoutSetsUpsertArgs,
    GqlSAdminMutationWorkoutSetsDeleteArgs,
    GqlSAdminMutationCompassObservationDismissArgs,
    GqlSAdminMutationCompassInterviewStartArgs,
    GqlSAdminMutationCompassInterviewMessageSendArgs,
    GqlSAdminMutationCompassInterviewEndArgs,
    GqlSAdminMutationCompassInterviewSkipArgs,
    GqlSAdminMutationCompassInterviewStartNowArgs,
    GqlSAdminCompassAdminCompassInterviewFindOneArgs,
    GqlSAdminMutationProjectActivitiesDeleteArgs,
    GqlSAdminMutationProjectActivitiesUpsertArgs,
    GqlSAdminMutationProjectFilesDeleteArgs,
    GqlSAdminMutationProjectFilesUpsertArgs,
    GqlSAdminMutationProjectLinksDeleteArgs,
    GqlSAdminMutationProjectLinksUpsertArgs,
    GqlSAdminMutationProjectReorderArgs,
    GqlSAdminMutationProjectRequestArchiveArgs,
    GqlSAdminMutationProjectRequestDeleteArgs,
    GqlSAdminMutationProjectTimersStartArgs,
    GqlSAdminMutationProjectTimersStopArgs,
    GqlSAdminMutationProjectsDeleteArgs,
    GqlSAdminMutationProjectsUpsertArgs,
    GqlSAdminMutationTasksDeleteArgs,
    GqlSAdminMutationTaskReorderArgs,
    GqlSAdminMutationTasksUpsertArgs,
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
            // Finances namespace — same shell pattern. Per-field resolvers on
            // `AdminFinancesQuery` fan out to the recurring-cost list and the
            // computed monthly / yearly totals. See
            // `docs/features/workspace-finances.md`.
            adminFinancesFindOne(): GqlSAdminFinancesQuery {
                return {} as GqlSAdminFinancesQuery;
            },
            // Nutrition namespace — same shell pattern. Per-field resolvers on
            // `AdminNutritionQuery` fan out to the cookbook / meal-plan / diary
            // lists. See `docs/features/workspace-nutrition.md`.
            adminNutritionFindOne(): GqlSAdminNutritionQuery {
                return {} as GqlSAdminNutritionQuery;
            },
            // Fitness namespace — same shell pattern. Per-field resolvers on
            // `AdminFitnessQuery` fan out to the exercise catalog, routines,
            // and gym sessions. See `docs/features/workspace-fitness.md`.
            adminFitnessFindOne(): GqlSAdminFitnessQuery {
                return {} as GqlSAdminFitnessQuery;
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
        AdminNutritionQuery: {
            adminNutritionRecipeFindMany(
                _parent: GqlSAdminNutritionQuery,
                args: GqlSAdminNutritionQueryAdminNutritionRecipeFindManyArgs,
                requestingSession: GqlSSession,
            ) {
                return adminNutritionRecipeFindMany(
                    { mealType: args.mealType ?? null, favorite: args.favorite ?? null },
                    requestingSession,
                    serverRuntime,
                );
            },
            adminNutritionMealPlanFindMany(_parent: GqlSAdminNutritionQuery, __: any, requestingSession: GqlSSession) {
                return adminNutritionMealPlanFindMany(requestingSession, serverRuntime);
            },
            adminNutritionFoodLogFindMany(_parent: GqlSAdminNutritionQuery, __: any, requestingSession: GqlSSession) {
                return adminNutritionFoodLogFindMany(requestingSession, serverRuntime);
            },
            adminNutritionSupplementFindMany(_parent: GqlSAdminNutritionQuery, __: any, requestingSession: GqlSSession) {
                return adminNutritionSupplementFindMany(requestingSession, serverRuntime);
            },
        },
        AdminFitnessQuery: {
            adminFitnessExerciseFindMany(_parent: GqlSAdminFitnessQuery, __: any, requestingSession: GqlSSession) {
                return adminFitnessExerciseFindMany(requestingSession, serverRuntime);
            },
            adminFitnessRoutineFindMany(_parent: GqlSAdminFitnessQuery, __: any, requestingSession: GqlSSession) {
                return adminFitnessRoutineFindMany(requestingSession, serverRuntime);
            },
            adminFitnessSessionFindMany(_parent: GqlSAdminFitnessQuery, __: any, requestingSession: GqlSSession) {
                return adminFitnessSessionFindMany(requestingSession, serverRuntime);
            },
        },
        AdminFinancesQuery: {
            adminFinancesRecurringCostFindMany(_parent: GqlSAdminFinancesQuery, __: any, requestingSession: GqlSSession) {
                return adminFinancesRecurringCostFindMany(requestingSession, serverRuntime);
            },
            adminFinancesMonthlyNetIncomeCentsFindOne(_parent: GqlSAdminFinancesQuery, __: any, requestingSession: GqlSSession) {
                return adminFinancesMonthlyNetIncomeCentsFindOne(requestingSession, serverRuntime);
            },
            async adminFinancesMonthlyExpensesCentsFindOne(_parent: GqlSAdminFinancesQuery, __: any, requestingSession: GqlSSession) {
                const totals = await adminFinancesExpensesCentsFindOne(requestingSession, serverRuntime);
                return totals.monthlyCents;
            },
            async adminFinancesYearlyExpensesCentsFindOne(_parent: GqlSAdminFinancesQuery, __: any, requestingSession: GqlSSession) {
                const totals = await adminFinancesExpensesCentsFindOne(requestingSession, serverRuntime);
                return totals.yearlyCents;
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
            cvExperiencesUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationCvExperiencesUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return cvExperiencesUpsert(userId, args.cvExperiences, requestingSession, serverRuntime);
            },
            cvExperiencesDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationCvExperiencesDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return cvExperiencesDelete(userId, args.cvExperienceIds, requestingSession, serverRuntime);
            },
            cvEducationsUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationCvEducationsUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return cvEducationsUpsert(userId, args.cvEducations, requestingSession, serverRuntime);
            },
            cvEducationsDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationCvEducationsDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return cvEducationsDelete(userId, args.cvEducationIds, requestingSession, serverRuntime);
            },
            cvEducationReorder(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationCvEducationReorderArgs,
                requestingSession: GqlSSession,
            ) {
                return cvEducationReorder(userId, args, requestingSession, serverRuntime);
            },
            cvSkillsUpsert({ userId }: GqlSAdminMutation, args: GqlSAdminMutationCvSkillsUpsertArgs, requestingSession: GqlSSession) {
                return cvSkillsUpsert(userId, args.cvSkills, requestingSession, serverRuntime);
            },
            cvSkillsDelete({ userId }: GqlSAdminMutation, args: GqlSAdminMutationCvSkillsDeleteArgs, requestingSession: GqlSSession) {
                return cvSkillsDelete(userId, args.cvSkillIds, requestingSession, serverRuntime);
            },
            cvSkillReorder({ userId }: GqlSAdminMutation, args: GqlSAdminMutationCvSkillReorderArgs, requestingSession: GqlSSession) {
                return cvSkillReorder(userId, args, requestingSession, serverRuntime);
            },
            cvHobbiesUpsert({ userId }: GqlSAdminMutation, args: GqlSAdminMutationCvHobbiesUpsertArgs, requestingSession: GqlSSession) {
                return cvHobbiesUpsert(userId, args.cvHobbies, requestingSession, serverRuntime);
            },
            cvHobbiesDelete({ userId }: GqlSAdminMutation, args: GqlSAdminMutationCvHobbiesDeleteArgs, requestingSession: GqlSSession) {
                return cvHobbiesDelete(userId, args.cvHobbyIds, requestingSession, serverRuntime);
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
            projectsUpsert({ userId }: GqlSAdminMutation, args: GqlSAdminMutationProjectsUpsertArgs, requestingSession: GqlSSession) {
                return projectsUpsert(userId, args.projects, requestingSession, serverRuntime);
            },
            projectsDelete({ userId }: GqlSAdminMutation, args: GqlSAdminMutationProjectsDeleteArgs, requestingSession: GqlSSession) {
                return projectsDelete(userId, args.projectIds, requestingSession, serverRuntime);
            },
            projectReorder({ userId }: GqlSAdminMutation, args: GqlSAdminMutationProjectReorderArgs, requestingSession: GqlSSession) {
                return projectReorder(userId, args, requestingSession, serverRuntime);
            },
            tasksUpsert({ userId }: GqlSAdminMutation, args: GqlSAdminMutationTasksUpsertArgs, requestingSession: GqlSSession) {
                return tasksUpsert(userId, args.tasks, requestingSession, serverRuntime);
            },
            tasksDelete({ userId }: GqlSAdminMutation, args: GqlSAdminMutationTasksDeleteArgs, requestingSession: GqlSSession) {
                return tasksDelete(userId, args.taskIds, requestingSession, serverRuntime);
            },
            taskReorder({ userId }: GqlSAdminMutation, args: GqlSAdminMutationTaskReorderArgs, requestingSession: GqlSSession) {
                return taskReorder(userId, args, requestingSession, serverRuntime);
            },
            projectActivitiesUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationProjectActivitiesUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return projectActivitiesUpsert(userId, args.projectActivities, requestingSession, serverRuntime);
            },
            projectActivitiesDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationProjectActivitiesDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return projectActivitiesDelete(userId, args.activityIds, requestingSession, serverRuntime);
            },
            projectTimersStart(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationProjectTimersStartArgs,
                requestingSession: GqlSSession,
            ) {
                return projectTimersStart(userId, args.inputs, requestingSession, serverRuntime);
            },
            projectTimersStop({ userId }: GqlSAdminMutation, args: GqlSAdminMutationProjectTimersStopArgs, requestingSession: GqlSSession) {
                return projectTimersStop(userId, args.activityIds, requestingSession, serverRuntime);
            },
            projectLinksUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationProjectLinksUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return projectLinksUpsert(userId, args.projectLinks, requestingSession, serverRuntime);
            },
            projectLinksDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationProjectLinksDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return projectLinksDelete(userId, args.projectLinkIds, requestingSession, serverRuntime);
            },
            projectFilesUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationProjectFilesUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return projectFilesUpsert(userId, args.projectFiles, requestingSession, serverRuntime);
            },
            projectFilesDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationProjectFilesDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return projectFilesDelete(userId, args.projectFileIds, requestingSession, serverRuntime);
            },
            chatConfigDefaultModelSet(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationChatConfigDefaultModelSetArgs,
                requestingSession: GqlSSession,
            ) {
                return adminChatConfigDefaultModelSet(userId, args, requestingSession, serverRuntime);
            },
            moviesUpsert({ userId }: GqlSAdminMutation, args: GqlSAdminMutationMoviesUpsertArgs, requestingSession: GqlSSession) {
                return moviesUpsert(userId, args.movies, requestingSession, serverRuntime);
            },
            moviesDelete({ userId }: GqlSAdminMutation, args: GqlSAdminMutationMoviesDeleteArgs, requestingSession: GqlSSession) {
                return moviesDelete(userId, args.movieIds, requestingSession, serverRuntime);
            },
            moviesAddFromTmdb({ userId }: GqlSAdminMutation, args: GqlSAdminMutationMoviesAddFromTmdbArgs, requestingSession: GqlSSession) {
                return moviesAddFromTmdb(userId, args.inputs, requestingSession, serverRuntime);
            },
            showsUpsert({ userId }: GqlSAdminMutation, args: GqlSAdminMutationShowsUpsertArgs, requestingSession: GqlSSession) {
                return showsUpsert(userId, args.shows, requestingSession, serverRuntime);
            },
            showsDelete({ userId }: GqlSAdminMutation, args: GqlSAdminMutationShowsDeleteArgs, requestingSession: GqlSSession) {
                return showsDelete(userId, args.showIds, requestingSession, serverRuntime);
            },
            showsAddFromTmdb({ userId }: GqlSAdminMutation, args: GqlSAdminMutationShowsAddFromTmdbArgs, requestingSession: GqlSSession) {
                return showsAddFromTmdb(userId, args.inputs, requestingSession, serverRuntime);
            },
            mediaChannelsUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationMediaChannelsUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return mediaChannelsUpsert(userId, args.mediaChannels, requestingSession, serverRuntime);
            },
            mediaChannelsDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationMediaChannelsDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return mediaChannelsDelete(userId, args.channelIds, requestingSession, serverRuntime);
            },
            mediaChannelReorder(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationMediaChannelReorderArgs,
                requestingSession: GqlSSession,
            ) {
                return mediaChannelReorder(userId, args, requestingSession, serverRuntime);
            },
            medicalAppointmentsUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationMedicalAppointmentsUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return medicalAppointmentsUpsert(userId, args.medicalAppointments, requestingSession, serverRuntime);
            },
            medicalAppointmentsDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationMedicalAppointmentsDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return medicalAppointmentsDelete(userId, args.appointmentIds, requestingSession, serverRuntime);
            },
            medicalRecordsUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationMedicalRecordsUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return medicalRecordsUpsert(userId, args.medicalRecords, requestingSession, serverRuntime);
            },
            medicalRecordsDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationMedicalRecordsDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return medicalRecordsDelete(userId, args.recordIds, requestingSession, serverRuntime);
            },
            medicalRecordFilesAttach(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationMedicalRecordFilesAttachArgs,
                requestingSession: GqlSSession,
            ) {
                return medicalRecordFilesAttach(userId, args.inputs, requestingSession, serverRuntime);
            },
            medicalRecordFilesDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationMedicalRecordFilesDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return medicalRecordFilesDelete(userId, args.recordFileIds, requestingSession, serverRuntime);
            },
            itemsUpsert({ userId }: GqlSAdminMutation, args: GqlSAdminMutationItemsUpsertArgs, requestingSession: GqlSSession) {
                return itemsUpsert(userId, args.items, requestingSession, serverRuntime);
            },
            itemsDelete({ userId }: GqlSAdminMutation, args: GqlSAdminMutationItemsDeleteArgs, requestingSession: GqlSSession) {
                return itemsDelete(userId, args.itemIds, requestingSession, serverRuntime);
            },
            itemsReprice({ userId }: GqlSAdminMutation, args: GqlSAdminMutationItemsRepriceArgs, requestingSession: GqlSSession) {
                return itemsReprice(userId, args.inputs, requestingSession, serverRuntime);
            },
            itemServiceEntriesUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationItemServiceEntriesUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return itemServiceEntriesUpsert(userId, args.itemServiceEntries, requestingSession, serverRuntime);
            },
            itemServiceEntriesDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationItemServiceEntriesDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return itemServiceEntriesDelete(userId, args.serviceEntryIds, requestingSession, serverRuntime);
            },
            itemFilesAttach({ userId }: GqlSAdminMutation, args: GqlSAdminMutationItemFilesAttachArgs, requestingSession: GqlSSession) {
                return itemFilesAttach(userId, args.inputs, requestingSession, serverRuntime);
            },
            itemFilesDelete({ userId }: GqlSAdminMutation, args: GqlSAdminMutationItemFilesDeleteArgs, requestingSession: GqlSSession) {
                return itemFilesDelete(userId, args.itemFileIds, requestingSession, serverRuntime);
            },
            itemFilesUpsert({ userId }: GqlSAdminMutation, args: GqlSAdminMutationItemFilesUpsertArgs, requestingSession: GqlSSession) {
                return itemFilesUpsert(userId, args.itemFiles, requestingSession, serverRuntime);
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
            recipesUpsert({ userId }: GqlSAdminMutation, args: GqlSAdminMutationRecipesUpsertArgs, requestingSession: GqlSSession) {
                return recipesUpsert(userId, args.recipes, requestingSession, serverRuntime);
            },
            recipesDelete({ userId }: GqlSAdminMutation, args: GqlSAdminMutationRecipesDeleteArgs, requestingSession: GqlSSession) {
                return recipesDelete(userId, args.recipeIds, requestingSession, serverRuntime);
            },
            mealPlanEntriesUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationMealPlanEntriesUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return mealPlanEntriesUpsert(userId, args.mealPlanEntries, requestingSession, serverRuntime);
            },
            mealPlanEntriesDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationMealPlanEntriesDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return mealPlanEntriesDelete(userId, args.entryIds, requestingSession, serverRuntime);
            },
            foodLogEntriesUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationFoodLogEntriesUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return foodLogEntriesUpsert(userId, args.foodLogEntries, requestingSession, serverRuntime);
            },
            foodLogEntriesDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationFoodLogEntriesDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return foodLogEntriesDelete(userId, args.logIds, requestingSession, serverRuntime);
            },
            supplementsUpsert({ userId }: GqlSAdminMutation, args: GqlSAdminMutationSupplementsUpsertArgs, requestingSession: GqlSSession) {
                return supplementsUpsert(userId, args.supplements, requestingSession, serverRuntime);
            },
            supplementsDelete({ userId }: GqlSAdminMutation, args: GqlSAdminMutationSupplementsDeleteArgs, requestingSession: GqlSSession) {
                return supplementsDelete(userId, args.supplementIds, requestingSession, serverRuntime);
            },
            supplementNutrientsReplace(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationSupplementNutrientsReplaceArgs,
                requestingSession: GqlSSession,
            ) {
                return supplementNutrientsReplace(userId, args.supplementId, args.nutrients, requestingSession, serverRuntime);
            },
            supplementResearch(_parent: GqlSAdminMutation, args: GqlSAdminMutationSupplementResearchArgs) {
                return supplementCompositionResearch({ name: args.input.name, brand: args.input.brand ?? null }, serverRuntime);
            },
            exercisesUpsert({ userId }: GqlSAdminMutation, args: GqlSAdminMutationExercisesUpsertArgs, requestingSession: GqlSSession) {
                return exercisesUpsert(userId, args.exercises, requestingSession, serverRuntime);
            },
            exercisesDelete({ userId }: GqlSAdminMutation, args: GqlSAdminMutationExercisesDeleteArgs, requestingSession: GqlSSession) {
                return exercisesDelete(userId, args.exerciseIds, requestingSession, serverRuntime);
            },
            workoutRoutinesUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationWorkoutRoutinesUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return workoutRoutinesUpsert(userId, args.workoutRoutines, requestingSession, serverRuntime);
            },
            workoutRoutinesDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationWorkoutRoutinesDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return workoutRoutinesDelete(userId, args.routineIds, requestingSession, serverRuntime);
            },
            workoutRoutineItemsUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationWorkoutRoutineItemsUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return workoutRoutineItemsUpsert(userId, args.workoutRoutineItems, requestingSession, serverRuntime);
            },
            workoutRoutineItemsDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationWorkoutRoutineItemsDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return workoutRoutineItemsDelete(userId, args.routineItemIds, requestingSession, serverRuntime);
            },
            workoutSessionsUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationWorkoutSessionsUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return workoutSessionsUpsert(userId, args.workoutSessions, requestingSession, serverRuntime);
            },
            workoutSessionsDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationWorkoutSessionsDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return workoutSessionsDelete(userId, args.sessionIds, requestingSession, serverRuntime);
            },
            workoutSetsUpsert({ userId }: GqlSAdminMutation, args: GqlSAdminMutationWorkoutSetsUpsertArgs, requestingSession: GqlSSession) {
                return workoutSetsUpsert(userId, args.workoutSets, requestingSession, serverRuntime);
            },
            workoutSetsDelete({ userId }: GqlSAdminMutation, args: GqlSAdminMutationWorkoutSetsDeleteArgs, requestingSession: GqlSSession) {
                return workoutSetsDelete(userId, args.setIds, requestingSession, serverRuntime);
            },
            financeRecurringCostsUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationFinanceRecurringCostsUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return financeRecurringCostsUpsert(userId, args.financeRecurringCosts, requestingSession, serverRuntime);
            },
            financeRecurringCostsDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationFinanceRecurringCostsDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return financeRecurringCostsDelete(userId, args.costIds, requestingSession, serverRuntime);
            },
            financeMonthlyNetIncomeSet(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationFinanceMonthlyNetIncomeSetArgs,
                requestingSession: GqlSSession,
            ) {
                return financeMonthlyNetIncomeSet(userId, args, requestingSession, serverRuntime);
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
