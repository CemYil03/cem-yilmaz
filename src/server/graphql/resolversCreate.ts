import { DateResolver, DateTimeResolver, JSONResolver } from 'graphql-scalars';
import { ADMIN_CHAT_MODELS } from '../agents/adminChatModels';
import { agentPersonalAssistant } from '../agents/agentPersonalAssistant';
import { agentVisitor } from '../agents/agentVisitor';
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
import { adminInventoryItemsDelete } from '../commands/adminInventoryItemsDelete';
import { adminInventoryItemFilesAttach } from '../commands/adminInventoryItemFilesAttach';
import { adminInventoryItemFilesDelete } from '../commands/adminInventoryItemFilesDelete';
import { adminInventoryItemFilesUpsert } from '../commands/adminInventoryItemFilesUpsert';
import { adminInventoryItemsReprice } from '../commands/adminInventoryItemsReprice';
import { adminInventoryItemServiceEntriesDelete } from '../commands/adminInventoryItemServiceEntriesDelete';
import { adminInventoryItemServiceEntriesUpsert } from '../commands/adminInventoryItemServiceEntriesUpsert';
import { adminInventoryItemsUpsert } from '../commands/adminInventoryItemsUpsert';
import { adminFinancesMonthlyNetIncomeSet } from '../commands/adminFinancesMonthlyNetIncomeSet';
import { adminFinancesRecurringCostsDelete } from '../commands/adminFinancesRecurringCostsDelete';
import { adminFinancesRecurringCostsUpsert } from '../commands/adminFinancesRecurringCostsUpsert';
import { adminTaxYearsUpsert } from '../commands/adminTaxYearsUpsert';
import { adminTaxYearsDelete } from '../commands/adminTaxYearsDelete';
import { adminTaxIncomeSourcesUpsert } from '../commands/adminTaxIncomeSourcesUpsert';
import { adminTaxIncomeSourcesDelete } from '../commands/adminTaxIncomeSourcesDelete';
import { adminTaxExpensesUpsert } from '../commands/adminTaxExpensesUpsert';
import { adminTaxExpensesDelete } from '../commands/adminTaxExpensesDelete';
import { adminTaxDocumentsUpsert } from '../commands/adminTaxDocumentsUpsert';
import { adminTaxDocumentsDelete } from '../commands/adminTaxDocumentsDelete';
import { adminTaxFilesAttach } from '../commands/adminTaxFilesAttach';
import { adminTaxFilesUpsert } from '../commands/adminTaxFilesUpsert';
import { adminTaxFilesDelete } from '../commands/adminTaxFilesDelete';
import { adminMediaChannelsDelete } from '../commands/adminMediaChannelsDelete';
import { adminMediaChannelReorder } from '../commands/adminMediaChannelReorder';
import { adminMediaChannelsUpsert } from '../commands/adminMediaChannelsUpsert';
import { adminMedicalAppointmentsDelete } from '../commands/adminMedicalAppointmentsDelete';
import { adminMedicalAppointmentsUpsert } from '../commands/adminMedicalAppointmentsUpsert';
import { adminMedicalRecordFilesAttach } from '../commands/adminMedicalRecordFilesAttach';
import { adminMedicalRecordFilesDelete } from '../commands/adminMedicalRecordFilesDelete';
import { adminMedicalRecordsDelete } from '../commands/adminMedicalRecordsDelete';
import { adminMedicalRecordsUpsert } from '../commands/adminMedicalRecordsUpsert';
import { adminTravelTripActivitiesDelete } from '../commands/adminTravelTripActivitiesDelete';
import { adminTravelTripActivitiesUpsert } from '../commands/adminTravelTripActivitiesUpsert';
import { adminTravelTripDaysDelete } from '../commands/adminTravelTripDaysDelete';
import { adminTravelTripDaysUpsert } from '../commands/adminTravelTripDaysUpsert';
import { adminTravelTripPackingItemsDelete } from '../commands/adminTravelTripPackingItemsDelete';
import { adminTravelTripPackingItemsUpsert } from '../commands/adminTravelTripPackingItemsUpsert';
import { adminTravelTripsDelete } from '../commands/adminTravelTripsDelete';
import { adminTravelTripsUpsert } from '../commands/adminTravelTripsUpsert';
import { adminNutritionRecipesUpsert } from '../commands/adminNutritionRecipesUpsert';
import { adminNutritionRecipesDelete } from '../commands/adminNutritionRecipesDelete';
import { adminNutritionMealPlanEntriesUpsert } from '../commands/adminNutritionMealPlanEntriesUpsert';
import { adminNutritionMealPlanEntriesDelete } from '../commands/adminNutritionMealPlanEntriesDelete';
import { adminNutritionFoodLogEntriesUpsert } from '../commands/adminNutritionFoodLogEntriesUpsert';
import { adminNutritionFoodLogEntriesDelete } from '../commands/adminNutritionFoodLogEntriesDelete';
import { adminNutritionSupplementsUpsert } from '../commands/adminNutritionSupplementsUpsert';
import { adminNutritionSupplementsDelete } from '../commands/adminNutritionSupplementsDelete';
import { adminNutritionSupplementNutrientsReplace } from '../commands/adminNutritionSupplementNutrientsReplace';
import { supplementCompositionResearch } from '../agents/supplementCompositionResearch';
import { adminFitnessExercisesUpsert } from '../commands/adminFitnessExercisesUpsert';
import { adminFitnessExercisesDelete } from '../commands/adminFitnessExercisesDelete';
import { adminFitnessWorkoutRoutinesUpsert } from '../commands/adminFitnessWorkoutRoutinesUpsert';
import { adminFitnessWorkoutRoutinesDelete } from '../commands/adminFitnessWorkoutRoutinesDelete';
import { adminFitnessWorkoutRoutineItemsUpsert } from '../commands/adminFitnessWorkoutRoutineItemsUpsert';
import { adminFitnessWorkoutRoutineItemsDelete } from '../commands/adminFitnessWorkoutRoutineItemsDelete';
import { adminFitnessWorkoutSessionsUpsert } from '../commands/adminFitnessWorkoutSessionsUpsert';
import { adminFitnessWorkoutSessionsDelete } from '../commands/adminFitnessWorkoutSessionsDelete';
import { adminFitnessWorkoutSetsUpsert } from '../commands/adminFitnessWorkoutSetsUpsert';
import { adminFitnessWorkoutSetsDelete } from '../commands/adminFitnessWorkoutSetsDelete';
import { adminMediaMoviesAddFromTmdb } from '../commands/adminMediaMoviesAddFromTmdb';
import { adminMediaMoviesDelete } from '../commands/adminMediaMoviesDelete';
import { adminMediaMoviesUpsert } from '../commands/adminMediaMoviesUpsert';
import { adminMediaShowsAddFromTmdb } from '../commands/adminMediaShowsAddFromTmdb';
import { adminMediaShowsDelete } from '../commands/adminMediaShowsDelete';
import { adminMediaShowsUpsert } from '../commands/adminMediaShowsUpsert';
import { compassObservationDismiss } from '../commands/compassObservationDismiss';
import { compassSynthesizeRequest } from '../commands/compassSynthesizeRequest';
import { compassInterviewStart } from '../commands/compassInterviewStart';
import { compassInterviewMessageSend } from '../commands/compassInterviewMessageSend';
import { compassInterviewEnd } from '../commands/compassInterviewEnd';
import { compassInterviewSkip } from '../commands/compassInterviewSkip';
import { compassInterviewStartNow } from '../commands/compassInterviewStartNow';
import { compassScheduledInterviewDismiss } from '../commands/compassScheduledInterviewDismiss';
import { adminProjectActivitiesDelete } from '../commands/adminProjectActivitiesDelete';
import { adminProjectActivitiesUpsert } from '../commands/adminProjectActivitiesUpsert';
import { adminProjectFilesDelete } from '../commands/adminProjectFilesDelete';
import { adminProjectFilesUpsert } from '../commands/adminProjectFilesUpsert';
import { adminWorkspaceFileUpdate } from '../commands/adminWorkspaceFileUpdate';
import { adminProjectLinksDelete } from '../commands/adminProjectLinksDelete';
import { adminProjectLinksUpsert } from '../commands/adminProjectLinksUpsert';
import { adminProjectRequestArchive } from '../commands/adminProjectRequestArchive';
import { adminProjectRequestDelete } from '../commands/adminProjectRequestDelete';
import { adminProjectReorder } from '../commands/adminProjectReorder';
import { adminProjectTimersStart } from '../commands/adminProjectTimersStart';
import { adminProjectTimersStop } from '../commands/adminProjectTimersStop';
import { adminProjectsDelete } from '../commands/adminProjectsDelete';
import { adminProjectsUpsert } from '../commands/adminProjectsUpsert';
import { adminProjectTasksDelete } from '../commands/adminProjectTasksDelete';
import { adminProjectTaskReorder } from '../commands/adminProjectTaskReorder';
import { adminProjectTasksUpsert } from '../commands/adminProjectTasksUpsert';
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
import { adminTaxYearFindMany } from '../queries/adminTaxYearFindMany';
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
import { adminWorkspaceFileFindOne } from '../queries/adminWorkspaceFileFindOne';
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
    GqlSAdminMutationAdminInventoryItemsDeleteArgs,
    GqlSAdminMutationAdminInventoryItemFilesAttachArgs,
    GqlSAdminMutationAdminInventoryItemFilesDeleteArgs,
    GqlSAdminMutationAdminInventoryItemFilesUpsertArgs,
    GqlSAdminMutationAdminInventoryItemsRepriceArgs,
    GqlSAdminMutationAdminInventoryItemServiceEntriesDeleteArgs,
    GqlSAdminMutationAdminInventoryItemServiceEntriesUpsertArgs,
    GqlSAdminMutationAdminInventoryItemsUpsertArgs,
    GqlSAdminMutationAdminMediaChannelsDeleteArgs,
    GqlSAdminMutationAdminMediaChannelReorderArgs,
    GqlSAdminMutationAdminMediaChannelsUpsertArgs,
    GqlSAdminMutationAdminMedicalAppointmentsDeleteArgs,
    GqlSAdminMutationAdminMedicalAppointmentsUpsertArgs,
    GqlSAdminMutationAdminMedicalRecordFilesAttachArgs,
    GqlSAdminMutationAdminMedicalRecordFilesDeleteArgs,
    GqlSAdminMutationAdminMedicalRecordsDeleteArgs,
    GqlSAdminMutationAdminMedicalRecordsUpsertArgs,
    GqlSAdminMutationAdminTravelTripActivitiesDeleteArgs,
    GqlSAdminMutationAdminTravelTripActivitiesUpsertArgs,
    GqlSAdminMutationAdminTravelTripDaysDeleteArgs,
    GqlSAdminMutationAdminTravelTripDaysUpsertArgs,
    GqlSAdminMutationAdminTravelTripPackingItemsDeleteArgs,
    GqlSAdminMutationAdminTravelTripPackingItemsUpsertArgs,
    GqlSAdminMutationAdminTravelTripsDeleteArgs,
    GqlSAdminMutationAdminTravelTripsUpsertArgs,
    GqlSAdminMutationAdminMediaMoviesAddFromTmdbArgs,
    GqlSAdminMutationAdminMediaMoviesDeleteArgs,
    GqlSAdminMutationAdminMediaMoviesUpsertArgs,
    GqlSAdminMutationAdminMediaShowsAddFromTmdbArgs,
    GqlSAdminMutationAdminMediaShowsDeleteArgs,
    GqlSAdminMutationAdminMediaShowsUpsertArgs,
    GqlSAdminInventoryQuery,
    GqlSAdminInventoryQueryAdminInventoryItemFindManyArgs,
    GqlSAdminInventoryQueryAdminInventoryItemFindOneArgs,
    GqlSAdminInventoryQueryAdminInventoryItemUpcomingWarrantyFindManyArgs,
    GqlSAdminFinancesQuery,
    GqlSAdminMutationAdminFinancesMonthlyNetIncomeSetArgs,
    GqlSAdminMutationAdminFinancesRecurringCostsDeleteArgs,
    GqlSAdminMutationAdminFinancesRecurringCostsUpsertArgs,
    GqlSAdminTaxQuery,
    GqlSAdminMutationAdminTaxYearsUpsertArgs,
    GqlSAdminMutationAdminTaxYearsDeleteArgs,
    GqlSAdminMutationAdminTaxIncomeSourcesUpsertArgs,
    GqlSAdminMutationAdminTaxIncomeSourcesDeleteArgs,
    GqlSAdminMutationAdminTaxExpensesUpsertArgs,
    GqlSAdminMutationAdminTaxExpensesDeleteArgs,
    GqlSAdminMutationAdminTaxDocumentsUpsertArgs,
    GqlSAdminMutationAdminTaxDocumentsDeleteArgs,
    GqlSAdminMutationAdminTaxFilesAttachArgs,
    GqlSAdminMutationAdminTaxFilesUpsertArgs,
    GqlSAdminMutationAdminTaxFilesDeleteArgs,
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
    GqlSAdminMutationAdminNutritionRecipesUpsertArgs,
    GqlSAdminMutationAdminNutritionRecipesDeleteArgs,
    GqlSAdminMutationAdminNutritionMealPlanEntriesUpsertArgs,
    GqlSAdminMutationAdminNutritionMealPlanEntriesDeleteArgs,
    GqlSAdminMutationAdminNutritionFoodLogEntriesUpsertArgs,
    GqlSAdminMutationAdminNutritionFoodLogEntriesDeleteArgs,
    GqlSAdminMutationAdminNutritionSupplementsUpsertArgs,
    GqlSAdminMutationAdminNutritionSupplementsDeleteArgs,
    GqlSAdminMutationAdminNutritionSupplementNutrientsReplaceArgs,
    GqlSAdminMutationAdminNutritionSupplementResearchArgs,
    GqlSAdminMutationAdminFitnessExercisesUpsertArgs,
    GqlSAdminMutationAdminFitnessExercisesDeleteArgs,
    GqlSAdminMutationAdminFitnessWorkoutRoutinesUpsertArgs,
    GqlSAdminMutationAdminFitnessWorkoutRoutinesDeleteArgs,
    GqlSAdminMutationAdminFitnessWorkoutRoutineItemsUpsertArgs,
    GqlSAdminMutationAdminFitnessWorkoutRoutineItemsDeleteArgs,
    GqlSAdminMutationAdminFitnessWorkoutSessionsUpsertArgs,
    GqlSAdminMutationAdminFitnessWorkoutSessionsDeleteArgs,
    GqlSAdminMutationAdminFitnessWorkoutSetsUpsertArgs,
    GqlSAdminMutationAdminFitnessWorkoutSetsDeleteArgs,
    GqlSAdminMutationCompassObservationDismissArgs,
    GqlSAdminMutationCompassInterviewStartArgs,
    GqlSAdminMutationCompassInterviewMessageSendArgs,
    GqlSAdminMutationCompassInterviewEndArgs,
    GqlSAdminMutationCompassInterviewSkipArgs,
    GqlSAdminMutationCompassInterviewStartNowArgs,
    GqlSAdminCompassAdminCompassInterviewFindOneArgs,
    GqlSAdminMutationAdminProjectActivitiesDeleteArgs,
    GqlSAdminMutationAdminProjectActivitiesUpsertArgs,
    GqlSAdminMutationAdminProjectFilesDeleteArgs,
    GqlSAdminMutationAdminProjectFilesUpsertArgs,
    GqlSAdminMutationAdminWorkspaceFileUpdateArgs,
    GqlSAdminMutationAdminProjectLinksDeleteArgs,
    GqlSAdminMutationAdminProjectLinksUpsertArgs,
    GqlSAdminMutationAdminProjectReorderArgs,
    GqlSAdminMutationAdminProjectRequestArchiveArgs,
    GqlSAdminMutationAdminProjectRequestDeleteArgs,
    GqlSAdminMutationAdminProjectTimersStartArgs,
    GqlSAdminMutationAdminProjectTimersStopArgs,
    GqlSAdminMutationAdminProjectsDeleteArgs,
    GqlSAdminMutationAdminProjectsUpsertArgs,
    GqlSAdminMutationAdminProjectTasksDeleteArgs,
    GqlSAdminMutationAdminProjectTaskReorderArgs,
    GqlSAdminMutationAdminProjectTasksUpsertArgs,
    GqlSAdminCompass,
    GqlSAdminCompassAdminCompassObservationFindManyArgs,
    GqlSAdminAdminProjectFindOneArgs,
    GqlSAdminAdminWorkspaceFileFindOneArgs,
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
const PUBLIC_DISPATCH: ChatMutationDispatch = { scope: 'public', agentFactory: agentVisitor };
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
            adminWorkspaceFileFindOne(_parent: GqlSAdmin, args: GqlSAdminAdminWorkspaceFileFindOneArgs, requestingSession: GqlSSession) {
                return adminWorkspaceFileFindOne(args.workspaceFileId, requestingSession, serverRuntime);
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
            // Tax namespace — same shell pattern. The single per-field resolver
            // on `AdminTaxQuery` returns fully-hydrated tax years (children +
            // computed totals). See `docs/features/workspace-tax.md`.
            adminTaxFindOne(): GqlSAdminTaxQuery {
                return {} as GqlSAdminTaxQuery;
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
        AdminTaxQuery: {
            adminTaxYearFindMany(_parent: GqlSAdminTaxQuery, __: any, requestingSession: GqlSSession) {
                return adminTaxYearFindMany(requestingSession, serverRuntime);
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
            adminProjectRequestArchive(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminProjectRequestArchiveArgs,
                requestingSession: GqlSSession,
            ) {
                return adminProjectRequestArchive(userId, args, requestingSession, serverRuntime);
            },
            adminProjectRequestDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminProjectRequestDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return adminProjectRequestDelete(userId, args, requestingSession, serverRuntime);
            },
            adminProjectsUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminProjectsUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return adminProjectsUpsert(userId, args.projects, requestingSession, serverRuntime);
            },
            adminProjectsDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminProjectsDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return adminProjectsDelete(userId, args.projectIds, requestingSession, serverRuntime);
            },
            adminProjectReorder(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminProjectReorderArgs,
                requestingSession: GqlSSession,
            ) {
                return adminProjectReorder(userId, args, requestingSession, serverRuntime);
            },
            adminProjectTasksUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminProjectTasksUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return adminProjectTasksUpsert(userId, args.tasks, requestingSession, serverRuntime);
            },
            adminProjectTasksDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminProjectTasksDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return adminProjectTasksDelete(userId, args.taskIds, requestingSession, serverRuntime);
            },
            adminProjectTaskReorder(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminProjectTaskReorderArgs,
                requestingSession: GqlSSession,
            ) {
                return adminProjectTaskReorder(userId, args, requestingSession, serverRuntime);
            },
            adminProjectActivitiesUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminProjectActivitiesUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return adminProjectActivitiesUpsert(userId, args.projectActivities, requestingSession, serverRuntime);
            },
            adminProjectActivitiesDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminProjectActivitiesDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return adminProjectActivitiesDelete(userId, args.activityIds, requestingSession, serverRuntime);
            },
            adminProjectTimersStart(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminProjectTimersStartArgs,
                requestingSession: GqlSSession,
            ) {
                return adminProjectTimersStart(userId, args.inputs, requestingSession, serverRuntime);
            },
            adminProjectTimersStop(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminProjectTimersStopArgs,
                requestingSession: GqlSSession,
            ) {
                return adminProjectTimersStop(userId, args.activityIds, requestingSession, serverRuntime);
            },
            adminProjectLinksUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminProjectLinksUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return adminProjectLinksUpsert(userId, args.projectLinks, requestingSession, serverRuntime);
            },
            adminProjectLinksDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminProjectLinksDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return adminProjectLinksDelete(userId, args.projectLinkIds, requestingSession, serverRuntime);
            },
            adminProjectFilesUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminProjectFilesUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return adminProjectFilesUpsert(userId, args.projectFiles, requestingSession, serverRuntime);
            },
            adminProjectFilesDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminProjectFilesDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return adminProjectFilesDelete(userId, args.projectFileIds, requestingSession, serverRuntime);
            },
            adminWorkspaceFileUpdate(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminWorkspaceFileUpdateArgs,
                requestingSession: GqlSSession,
            ) {
                return adminWorkspaceFileUpdate(
                    userId,
                    args.workspaceFileId,
                    args.content,
                    args.label ?? null,
                    requestingSession,
                    serverRuntime,
                );
            },
            chatConfigDefaultModelSet(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationChatConfigDefaultModelSetArgs,
                requestingSession: GqlSSession,
            ) {
                return adminChatConfigDefaultModelSet(userId, args, requestingSession, serverRuntime);
            },
            adminMediaMoviesUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminMediaMoviesUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return adminMediaMoviesUpsert(userId, args.movies, requestingSession, serverRuntime);
            },
            adminMediaMoviesDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminMediaMoviesDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return adminMediaMoviesDelete(userId, args.movieIds, requestingSession, serverRuntime);
            },
            adminMediaMoviesAddFromTmdb(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminMediaMoviesAddFromTmdbArgs,
                requestingSession: GqlSSession,
            ) {
                return adminMediaMoviesAddFromTmdb(userId, args.inputs, requestingSession, serverRuntime);
            },
            adminMediaShowsUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminMediaShowsUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return adminMediaShowsUpsert(userId, args.shows, requestingSession, serverRuntime);
            },
            adminMediaShowsDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminMediaShowsDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return adminMediaShowsDelete(userId, args.showIds, requestingSession, serverRuntime);
            },
            adminMediaShowsAddFromTmdb(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminMediaShowsAddFromTmdbArgs,
                requestingSession: GqlSSession,
            ) {
                return adminMediaShowsAddFromTmdb(userId, args.inputs, requestingSession, serverRuntime);
            },
            adminMediaChannelsUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminMediaChannelsUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return adminMediaChannelsUpsert(userId, args.mediaChannels, requestingSession, serverRuntime);
            },
            adminMediaChannelsDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminMediaChannelsDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return adminMediaChannelsDelete(userId, args.channelIds, requestingSession, serverRuntime);
            },
            adminMediaChannelReorder(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminMediaChannelReorderArgs,
                requestingSession: GqlSSession,
            ) {
                return adminMediaChannelReorder(userId, args, requestingSession, serverRuntime);
            },
            adminMedicalAppointmentsUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminMedicalAppointmentsUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return adminMedicalAppointmentsUpsert(userId, args.medicalAppointments, requestingSession, serverRuntime);
            },
            adminMedicalAppointmentsDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminMedicalAppointmentsDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return adminMedicalAppointmentsDelete(userId, args.appointmentIds, requestingSession, serverRuntime);
            },
            adminMedicalRecordsUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminMedicalRecordsUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return adminMedicalRecordsUpsert(userId, args.medicalRecords, requestingSession, serverRuntime);
            },
            adminMedicalRecordsDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminMedicalRecordsDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return adminMedicalRecordsDelete(userId, args.recordIds, requestingSession, serverRuntime);
            },
            adminMedicalRecordFilesAttach(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminMedicalRecordFilesAttachArgs,
                requestingSession: GqlSSession,
            ) {
                return adminMedicalRecordFilesAttach(userId, args.inputs, requestingSession, serverRuntime);
            },
            adminMedicalRecordFilesDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminMedicalRecordFilesDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return adminMedicalRecordFilesDelete(userId, args.recordFileIds, requestingSession, serverRuntime);
            },
            adminInventoryItemsUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminInventoryItemsUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return adminInventoryItemsUpsert(userId, args.items, requestingSession, serverRuntime);
            },
            adminInventoryItemsDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminInventoryItemsDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return adminInventoryItemsDelete(userId, args.itemIds, requestingSession, serverRuntime);
            },
            adminInventoryItemsReprice(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminInventoryItemsRepriceArgs,
                requestingSession: GqlSSession,
            ) {
                return adminInventoryItemsReprice(userId, args.inputs, requestingSession, serverRuntime);
            },
            adminInventoryItemServiceEntriesUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminInventoryItemServiceEntriesUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return adminInventoryItemServiceEntriesUpsert(userId, args.itemServiceEntries, requestingSession, serverRuntime);
            },
            adminInventoryItemServiceEntriesDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminInventoryItemServiceEntriesDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return adminInventoryItemServiceEntriesDelete(userId, args.serviceEntryIds, requestingSession, serverRuntime);
            },
            adminInventoryItemFilesAttach(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminInventoryItemFilesAttachArgs,
                requestingSession: GqlSSession,
            ) {
                return adminInventoryItemFilesAttach(userId, args.inputs, requestingSession, serverRuntime);
            },
            adminInventoryItemFilesDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminInventoryItemFilesDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return adminInventoryItemFilesDelete(userId, args.itemFileIds, requestingSession, serverRuntime);
            },
            adminInventoryItemFilesUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminInventoryItemFilesUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return adminInventoryItemFilesUpsert(userId, args.itemFiles, requestingSession, serverRuntime);
            },
            adminTravelTripsUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminTravelTripsUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return adminTravelTripsUpsert(userId, args.trips, requestingSession, serverRuntime);
            },
            adminTravelTripsDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminTravelTripsDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return adminTravelTripsDelete(userId, args.tripIds, requestingSession, serverRuntime);
            },
            adminTravelTripDaysUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminTravelTripDaysUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return adminTravelTripDaysUpsert(userId, args.tripDays, requestingSession, serverRuntime);
            },
            adminTravelTripDaysDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminTravelTripDaysDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return adminTravelTripDaysDelete(userId, args.tripDayIds, requestingSession, serverRuntime);
            },
            adminTravelTripActivitiesUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminTravelTripActivitiesUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return adminTravelTripActivitiesUpsert(userId, args.tripActivities, requestingSession, serverRuntime);
            },
            adminTravelTripActivitiesDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminTravelTripActivitiesDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return adminTravelTripActivitiesDelete(userId, args.tripActivityIds, requestingSession, serverRuntime);
            },
            adminTravelTripPackingItemsUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminTravelTripPackingItemsUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return adminTravelTripPackingItemsUpsert(userId, args.tripPackingItems, requestingSession, serverRuntime);
            },
            adminTravelTripPackingItemsDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminTravelTripPackingItemsDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return adminTravelTripPackingItemsDelete(userId, args.tripPackingItemIds, requestingSession, serverRuntime);
            },
            adminNutritionRecipesUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminNutritionRecipesUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return adminNutritionRecipesUpsert(userId, args.recipes, requestingSession, serverRuntime);
            },
            adminNutritionRecipesDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminNutritionRecipesDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return adminNutritionRecipesDelete(userId, args.recipeIds, requestingSession, serverRuntime);
            },
            adminNutritionMealPlanEntriesUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminNutritionMealPlanEntriesUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return adminNutritionMealPlanEntriesUpsert(userId, args.mealPlanEntries, requestingSession, serverRuntime);
            },
            adminNutritionMealPlanEntriesDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminNutritionMealPlanEntriesDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return adminNutritionMealPlanEntriesDelete(userId, args.entryIds, requestingSession, serverRuntime);
            },
            adminNutritionFoodLogEntriesUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminNutritionFoodLogEntriesUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return adminNutritionFoodLogEntriesUpsert(userId, args.foodLogEntries, requestingSession, serverRuntime);
            },
            adminNutritionFoodLogEntriesDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminNutritionFoodLogEntriesDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return adminNutritionFoodLogEntriesDelete(userId, args.logIds, requestingSession, serverRuntime);
            },
            adminNutritionSupplementsUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminNutritionSupplementsUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return adminNutritionSupplementsUpsert(userId, args.supplements, requestingSession, serverRuntime);
            },
            adminNutritionSupplementsDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminNutritionSupplementsDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return adminNutritionSupplementsDelete(userId, args.supplementIds, requestingSession, serverRuntime);
            },
            adminNutritionSupplementNutrientsReplace(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminNutritionSupplementNutrientsReplaceArgs,
                requestingSession: GqlSSession,
            ) {
                return adminNutritionSupplementNutrientsReplace(
                    userId,
                    args.supplementId,
                    args.nutrients,
                    requestingSession,
                    serverRuntime,
                );
            },
            adminNutritionSupplementResearch(_parent: GqlSAdminMutation, args: GqlSAdminMutationAdminNutritionSupplementResearchArgs) {
                return supplementCompositionResearch({ name: args.input.name, brand: args.input.brand ?? null }, serverRuntime);
            },
            adminFitnessExercisesUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminFitnessExercisesUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return adminFitnessExercisesUpsert(userId, args.exercises, requestingSession, serverRuntime);
            },
            adminFitnessExercisesDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminFitnessExercisesDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return adminFitnessExercisesDelete(userId, args.exerciseIds, requestingSession, serverRuntime);
            },
            adminFitnessWorkoutRoutinesUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminFitnessWorkoutRoutinesUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return adminFitnessWorkoutRoutinesUpsert(userId, args.workoutRoutines, requestingSession, serverRuntime);
            },
            adminFitnessWorkoutRoutinesDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminFitnessWorkoutRoutinesDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return adminFitnessWorkoutRoutinesDelete(userId, args.routineIds, requestingSession, serverRuntime);
            },
            adminFitnessWorkoutRoutineItemsUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminFitnessWorkoutRoutineItemsUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return adminFitnessWorkoutRoutineItemsUpsert(userId, args.workoutRoutineItems, requestingSession, serverRuntime);
            },
            adminFitnessWorkoutRoutineItemsDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminFitnessWorkoutRoutineItemsDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return adminFitnessWorkoutRoutineItemsDelete(userId, args.routineItemIds, requestingSession, serverRuntime);
            },
            adminFitnessWorkoutSessionsUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminFitnessWorkoutSessionsUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return adminFitnessWorkoutSessionsUpsert(userId, args.workoutSessions, requestingSession, serverRuntime);
            },
            adminFitnessWorkoutSessionsDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminFitnessWorkoutSessionsDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return adminFitnessWorkoutSessionsDelete(userId, args.sessionIds, requestingSession, serverRuntime);
            },
            adminFitnessWorkoutSetsUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminFitnessWorkoutSetsUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return adminFitnessWorkoutSetsUpsert(userId, args.workoutSets, requestingSession, serverRuntime);
            },
            adminFitnessWorkoutSetsDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminFitnessWorkoutSetsDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return adminFitnessWorkoutSetsDelete(userId, args.setIds, requestingSession, serverRuntime);
            },
            adminFinancesRecurringCostsUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminFinancesRecurringCostsUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return adminFinancesRecurringCostsUpsert(userId, args.financeRecurringCosts, requestingSession, serverRuntime);
            },
            adminFinancesRecurringCostsDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminFinancesRecurringCostsDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return adminFinancesRecurringCostsDelete(userId, args.costIds, requestingSession, serverRuntime);
            },
            adminFinancesMonthlyNetIncomeSet(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminFinancesMonthlyNetIncomeSetArgs,
                requestingSession: GqlSSession,
            ) {
                return adminFinancesMonthlyNetIncomeSet(userId, args, requestingSession, serverRuntime);
            },
            adminTaxYearsUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminTaxYearsUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return adminTaxYearsUpsert(userId, args.taxYears, requestingSession, serverRuntime);
            },
            adminTaxYearsDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminTaxYearsDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return adminTaxYearsDelete(userId, args.taxYearIds, requestingSession, serverRuntime);
            },
            adminTaxIncomeSourcesUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminTaxIncomeSourcesUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return adminTaxIncomeSourcesUpsert(userId, args.taxIncomeSources, requestingSession, serverRuntime);
            },
            adminTaxIncomeSourcesDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminTaxIncomeSourcesDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return adminTaxIncomeSourcesDelete(userId, args.incomeSourceIds, requestingSession, serverRuntime);
            },
            adminTaxExpensesUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminTaxExpensesUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return adminTaxExpensesUpsert(userId, args.taxExpenses, requestingSession, serverRuntime);
            },
            adminTaxExpensesDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminTaxExpensesDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return adminTaxExpensesDelete(userId, args.expenseIds, requestingSession, serverRuntime);
            },
            adminTaxDocumentsUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminTaxDocumentsUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return adminTaxDocumentsUpsert(userId, args.taxDocuments, requestingSession, serverRuntime);
            },
            adminTaxDocumentsDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminTaxDocumentsDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return adminTaxDocumentsDelete(userId, args.documentIds, requestingSession, serverRuntime);
            },
            adminTaxFilesAttach(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminTaxFilesAttachArgs,
                requestingSession: GqlSSession,
            ) {
                return adminTaxFilesAttach(userId, args.inputs, requestingSession, serverRuntime);
            },
            adminTaxFilesUpsert(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminTaxFilesUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return adminTaxFilesUpsert(userId, args.inputs, requestingSession, serverRuntime);
            },
            adminTaxFilesDelete(
                { userId }: GqlSAdminMutation,
                args: GqlSAdminMutationAdminTaxFilesDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return adminTaxFilesDelete(userId, args.taxFileIds, requestingSession, serverRuntime);
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
