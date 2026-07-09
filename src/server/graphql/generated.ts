import type { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import * as z from 'zod';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
    ID: { input: string; output: string };
    String: { input: string; output: string };
    Boolean: { input: boolean; output: boolean };
    Int: { input: number; output: number };
    Float: { input: number; output: number };
    Date: { input: string; output: string };
    DateTime: { input: Date; output: Date };
    JSON: { input: unknown; output: unknown };
};

export interface GqlSAdmin {
    __typename?: 'Admin';
    adminChatConfigFindOne: GqlSAdminChatConfig;
    adminChatCount: Scalars['Int']['output'];
    adminChatFindMany: Array<GqlSChat>;
    adminChatFindOne: GqlSChat;
    adminCompassFindOne: GqlSAdminCompass;
    adminCvFindOne: GqlSCvQuery;
    adminFinancesFindOne: GqlSAdminFinancesQuery;
    adminInventoryFindOne: GqlSAdminInventoryQuery;
    adminLogFindMany: Array<GqlSLog>;
    adminMediaFindOne: GqlSAdminMediaQuery;
    adminMedicalFindOne: GqlSAdminMedicalQuery;
    adminProjectActiveTimerFindOne?: Maybe<GqlSProjectActivity>;
    adminProjectFindMany: Array<GqlSProject>;
    adminProjectFindOne: GqlSProject;
    adminProjectRequestFindMany: Array<GqlSProjectRequest>;
    adminProjectRequestInboxCount: Scalars['Int']['output'];
    adminPublicChatFindMany: Array<GqlSChat>;
    adminPublicChatFindOne: GqlSChat;
    adminStandaloneTaskFindMany: Array<GqlSTask>;
    adminStandaloneTaskOpenCount: Scalars['Int']['output'];
    adminTravelFindOne: GqlSAdminTravelQuery;
}

export type GqlSAdminAdminChatCountArgs = {
    query?: InputMaybe<Scalars['String']['input']>;
};

export type GqlSAdminAdminChatFindManyArgs = {
    limit?: InputMaybe<Scalars['Int']['input']>;
    offset?: InputMaybe<Scalars['Int']['input']>;
    query?: InputMaybe<Scalars['String']['input']>;
};

export type GqlSAdminAdminChatFindOneArgs = {
    chatId: Scalars['ID']['input'];
};

export type GqlSAdminAdminLogFindManyArgs = {
    level?: InputMaybe<GqlSLogLevel>;
    limit?: InputMaybe<Scalars['Int']['input']>;
    search?: InputMaybe<Scalars['String']['input']>;
};

export type GqlSAdminAdminProjectFindManyArgs = {
    status?: InputMaybe<GqlSProjectStatus>;
};

export type GqlSAdminAdminProjectFindOneArgs = {
    projectId: Scalars['ID']['input'];
};

export type GqlSAdminAdminProjectRequestFindManyArgs = {
    status?: InputMaybe<GqlSProjectRequestStatus>;
};

export type GqlSAdminAdminPublicChatFindOneArgs = {
    chatId: Scalars['ID']['input'];
};

export interface GqlSAdminChatConfig {
    __typename?: 'AdminChatConfig';
    availableModels: Array<GqlSAdminChatModel>;
    defaultModelId: Scalars['String']['output'];
}

export interface GqlSAdminChatModel {
    __typename?: 'AdminChatModel';
    label: Scalars['String']['output'];
    modelId: Scalars['String']['output'];
    supportedMediaTypes: Array<Scalars['String']['output']>;
}

export interface GqlSAdminCompass {
    __typename?: 'AdminCompass';
    adminCompassInterviewFindMany: Array<GqlSCompassInterview>;
    adminCompassInterviewFindOne?: Maybe<GqlSCompassInterview>;
    adminCompassInterviewPendingFindOne?: Maybe<GqlSCompassInterview>;
    adminCompassObservationFindMany: Array<GqlSCompassObservation>;
    observationsSinceSynthesis: Scalars['Int']['output'];
    prose: Scalars['String']['output'];
    psychology: Scalars['String']['output'];
    scheduledInterviewAt?: Maybe<Scalars['DateTime']['output']>;
    scheduledInterviewReason?: Maybe<Scalars['String']['output']>;
    scheduledInterviewTopic?: Maybe<GqlSCompassInterviewTopic>;
    summary: Scalars['String']['output'];
    synthesisInProgress: Scalars['Boolean']['output'];
    synthesisModelId?: Maybe<Scalars['String']['output']>;
    synthesizedAt?: Maybe<Scalars['DateTime']['output']>;
}

export type GqlSAdminCompassAdminCompassInterviewFindOneArgs = {
    interviewId: Scalars['ID']['input'];
};

export type GqlSAdminCompassAdminCompassObservationFindManyArgs = {
    category?: InputMaybe<GqlSCompassObservationCategory>;
    includeDismissed?: InputMaybe<Scalars['Boolean']['input']>;
};

export interface GqlSAdminFinancesQuery {
    __typename?: 'AdminFinancesQuery';
    adminFinancesMonthlyExpensesCentsFindOne: Scalars['Int']['output'];
    adminFinancesMonthlyNetIncomeCentsFindOne?: Maybe<Scalars['Int']['output']>;
    adminFinancesRecurringCostFindMany: Array<GqlSFinanceRecurringCost>;
    adminFinancesYearlyExpensesCentsFindOne: Scalars['Int']['output'];
}

export interface GqlSAdminInventoryQuery {
    __typename?: 'AdminInventoryQuery';
    adminInventoryItemFindMany: Array<GqlSItem>;
    adminInventoryItemFindOne?: Maybe<GqlSItem>;
    adminInventoryItemUpcomingWarrantyFindMany: Array<GqlSItem>;
    adminInventoryMaterialNetWorthCentsFindOne: Scalars['Int']['output'];
}

export type GqlSAdminInventoryQueryAdminInventoryItemFindManyArgs = {
    includeDisposed?: InputMaybe<Scalars['Boolean']['input']>;
};

export type GqlSAdminInventoryQueryAdminInventoryItemFindOneArgs = {
    itemId: Scalars['ID']['input'];
};

export type GqlSAdminInventoryQueryAdminInventoryItemUpcomingWarrantyFindManyArgs = {
    withinDays?: InputMaybe<Scalars['Int']['input']>;
};

export interface GqlSAdminMediaQuery {
    __typename?: 'AdminMediaQuery';
    adminMediaChannelFindMany: Array<GqlSMediaChannel>;
    adminMediaMovieFindMany: Array<GqlSMovie>;
    adminMediaShowFindMany: Array<GqlSShow>;
    adminMediaTmdbFindMany: Array<GqlSTmdbMovieResult>;
    adminMediaTmdbTvFindMany: Array<GqlSTmdbTvResult>;
    adminMediaYoutubeFindMany: Array<GqlSYoutubeChannelResult>;
}

export type GqlSAdminMediaQueryAdminMediaChannelFindManyArgs = {
    topic?: InputMaybe<Scalars['String']['input']>;
};

export type GqlSAdminMediaQueryAdminMediaTmdbFindManyArgs = {
    query: Scalars['String']['input'];
};

export type GqlSAdminMediaQueryAdminMediaTmdbTvFindManyArgs = {
    query: Scalars['String']['input'];
};

export type GqlSAdminMediaQueryAdminMediaYoutubeFindManyArgs = {
    query: Scalars['String']['input'];
};

export interface GqlSAdminMedicalQuery {
    __typename?: 'AdminMedicalQuery';
    adminMedicalAppointmentFindMany: Array<GqlSMedicalAppointment>;
    adminMedicalCategoryOverviewFindMany: Array<GqlSMedicalCategoryOverview>;
    adminMedicalRecordFindMany: Array<GqlSMedicalRecord>;
}

export interface GqlSAdminMutation {
    __typename?: 'AdminMutation';
    chatConfigDefaultModelSet: GqlSMutationResult;
    chatInputCollectionRespond?: Maybe<GqlSChatMessageCreateResult>;
    chatMessageCreate?: Maybe<GqlSChatMessageCreateResult>;
    chatToolApprovalRespond?: Maybe<GqlSChatMessageCreateResult>;
    compassInterviewEnd: GqlSMutationResult;
    compassInterviewMessageSend: GqlSMutationResult;
    compassInterviewSkip: GqlSMutationResult;
    compassInterviewStart: GqlSMutationResult;
    compassInterviewStartNow: GqlSMutationResult;
    compassObservationDismiss: GqlSMutationResult;
    compassScheduledInterviewDismiss: GqlSMutationResult;
    compassSynthesizeRequest: GqlSMutationResult;
    cvEducationReorder: GqlSMutationResult;
    cvEducationsDelete: GqlSMutationResult;
    cvEducationsUpsert: GqlSMutationResult;
    cvExperiencesDelete: GqlSMutationResult;
    cvExperiencesUpsert: GqlSMutationResult;
    cvHobbiesDelete: GqlSMutationResult;
    cvHobbiesUpsert: GqlSMutationResult;
    cvHobbyReorder: GqlSMutationResult;
    cvSkillReorder: GqlSMutationResult;
    cvSkillsDelete: GqlSMutationResult;
    cvSkillsUpsert: GqlSMutationResult;
    financeMonthlyNetIncomeSet: GqlSAdminFinancesQuery;
    financeRecurringCostDelete: GqlSMutationResult;
    financeRecurringCostUpsert: GqlSFinanceRecurringCost;
    itemFilesAttach: GqlSMutationResult;
    itemFilesDelete: GqlSMutationResult;
    itemFilesUpsert: GqlSMutationResult;
    itemServiceEntriesDelete: GqlSMutationResult;
    itemServiceEntriesUpsert: GqlSMutationResult;
    itemsDelete: GqlSMutationResult;
    itemsReprice: GqlSMutationResult;
    itemsUpsert: GqlSMutationResult;
    mediaChannelReorder: GqlSMutationResult;
    mediaChannelsDelete: GqlSMutationResult;
    mediaChannelsUpsert: GqlSMutationResult;
    medicalAppointmentsDelete: GqlSMutationResult;
    medicalAppointmentsUpsert: GqlSMutationResult;
    medicalRecordFilesAttach: GqlSMutationResult;
    medicalRecordFilesDelete: GqlSMutationResult;
    medicalRecordsDelete: GqlSMutationResult;
    medicalRecordsUpsert: GqlSMutationResult;
    moviesAddFromTmdb: GqlSMutationResult;
    moviesDelete: GqlSMutationResult;
    moviesUpsert: GqlSMutationResult;
    projectActivitiesDelete: GqlSMutationResult;
    projectActivitiesUpsert: GqlSMutationResult;
    projectFilesDelete: GqlSMutationResult;
    projectFilesUpsert: GqlSMutationResult;
    projectLinksDelete: GqlSMutationResult;
    projectLinksUpsert: GqlSMutationResult;
    projectReorder: GqlSMutationResult;
    projectRequestArchive: GqlSMutationResult;
    projectRequestDelete: GqlSMutationResult;
    projectTimersStart: GqlSMutationResult;
    projectTimersStop: GqlSMutationResult;
    projectsDelete: GqlSMutationResult;
    projectsUpsert: GqlSMutationResult;
    showsAddFromTmdb: GqlSMutationResult;
    showsDelete: GqlSMutationResult;
    showsUpsert: GqlSMutationResult;
    taskReorder: GqlSMutationResult;
    tasksDelete: GqlSMutationResult;
    tasksUpsert: GqlSMutationResult;
    tripActivitiesDelete: GqlSMutationResult;
    tripActivitiesUpsert: GqlSMutationResult;
    tripDaysDelete: GqlSMutationResult;
    tripDaysUpsert: GqlSMutationResult;
    tripPackingItemsDelete: GqlSMutationResult;
    tripPackingItemsUpsert: GqlSMutationResult;
    tripsDelete: GqlSMutationResult;
    tripsUpsert: GqlSMutationResult;
}

export type GqlSAdminMutationChatConfigDefaultModelSetArgs = {
    modelId: Scalars['String']['input'];
};

export type GqlSAdminMutationChatInputCollectionRespondArgs = {
    answers: Array<GqlSChatMessageUserInputAnswerCreate>;
    assistantOptions: GqlSChatAssistantOptions;
    collectionMessageId: Scalars['ID']['input'];
};

export type GqlSAdminMutationChatMessageCreateArgs = {
    assistantOptions: GqlSChatAssistantOptions;
    chatId?: InputMaybe<Scalars['ID']['input']>;
    currentPagePath?: InputMaybe<Scalars['String']['input']>;
    fileUploadIds?: InputMaybe<Array<Scalars['ID']['input']>>;
    message: Scalars['String']['input'];
};

export type GqlSAdminMutationChatToolApprovalRespondArgs = {
    approvalId: Scalars['String']['input'];
    approved: Scalars['Boolean']['input'];
    assistantOptions: GqlSChatAssistantOptions;
    reason?: InputMaybe<Scalars['String']['input']>;
};

export type GqlSAdminMutationCompassInterviewEndArgs = {
    interviewId: Scalars['ID']['input'];
};

export type GqlSAdminMutationCompassInterviewMessageSendArgs = {
    content: Scalars['String']['input'];
    generationId?: InputMaybe<Scalars['ID']['input']>;
    interviewId: Scalars['ID']['input'];
};

export type GqlSAdminMutationCompassInterviewSkipArgs = {
    interviewId: Scalars['ID']['input'];
};

export type GqlSAdminMutationCompassInterviewStartArgs = {
    generationId?: InputMaybe<Scalars['ID']['input']>;
    interviewId: Scalars['ID']['input'];
};

export type GqlSAdminMutationCompassInterviewStartNowArgs = {
    topic?: InputMaybe<GqlSCompassInterviewTopic>;
};

export type GqlSAdminMutationCompassObservationDismissArgs = {
    observationId: Scalars['ID']['input'];
};

export type GqlSAdminMutationCvEducationReorderArgs = {
    orderedIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationCvEducationsDeleteArgs = {
    cvEducationIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationCvEducationsUpsertArgs = {
    cvEducations: Array<GqlSCvEducationInput>;
};

export type GqlSAdminMutationCvExperiencesDeleteArgs = {
    cvExperienceIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationCvExperiencesUpsertArgs = {
    cvExperiences: Array<GqlSCvExperienceInput>;
};

export type GqlSAdminMutationCvHobbiesDeleteArgs = {
    cvHobbyIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationCvHobbiesUpsertArgs = {
    cvHobbies: Array<GqlSCvHobbyInput>;
};

export type GqlSAdminMutationCvHobbyReorderArgs = {
    orderedIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationCvSkillReorderArgs = {
    orderedIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationCvSkillsDeleteArgs = {
    cvSkillIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationCvSkillsUpsertArgs = {
    cvSkills: Array<GqlSCvSkillInput>;
};

export type GqlSAdminMutationFinanceMonthlyNetIncomeSetArgs = {
    amountCents?: InputMaybe<Scalars['Int']['input']>;
};

export type GqlSAdminMutationFinanceRecurringCostDeleteArgs = {
    costId: Scalars['ID']['input'];
};

export type GqlSAdminMutationFinanceRecurringCostUpsertArgs = {
    input: GqlSFinanceRecurringCostInput;
};

export type GqlSAdminMutationItemFilesAttachArgs = {
    inputs: Array<GqlSItemFileAttachInput>;
};

export type GqlSAdminMutationItemFilesDeleteArgs = {
    itemFileIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationItemFilesUpsertArgs = {
    itemFiles: Array<GqlSItemFileUpsert>;
};

export type GqlSAdminMutationItemServiceEntriesDeleteArgs = {
    serviceEntryIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationItemServiceEntriesUpsertArgs = {
    itemServiceEntries: Array<GqlSItemServiceEntryInput>;
};

export type GqlSAdminMutationItemsDeleteArgs = {
    itemIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationItemsRepriceArgs = {
    inputs: Array<GqlSItemRepriceInput>;
};

export type GqlSAdminMutationItemsUpsertArgs = {
    items: Array<GqlSItemInput>;
};

export type GqlSAdminMutationMediaChannelReorderArgs = {
    orderedIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationMediaChannelsDeleteArgs = {
    channelIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationMediaChannelsUpsertArgs = {
    mediaChannels: Array<GqlSMediaChannelInput>;
};

export type GqlSAdminMutationMedicalAppointmentsDeleteArgs = {
    appointmentIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationMedicalAppointmentsUpsertArgs = {
    medicalAppointments: Array<GqlSMedicalAppointmentInput>;
};

export type GqlSAdminMutationMedicalRecordFilesAttachArgs = {
    inputs: Array<GqlSMedicalRecordFileAttachInput>;
};

export type GqlSAdminMutationMedicalRecordFilesDeleteArgs = {
    recordFileIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationMedicalRecordsDeleteArgs = {
    recordIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationMedicalRecordsUpsertArgs = {
    medicalRecords: Array<GqlSMedicalRecordInput>;
};

export type GqlSAdminMutationMoviesAddFromTmdbArgs = {
    inputs: Array<GqlSMovieAddFromTmdbInput>;
};

export type GqlSAdminMutationMoviesDeleteArgs = {
    movieIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationMoviesUpsertArgs = {
    movies: Array<GqlSMovieInput>;
};

export type GqlSAdminMutationProjectActivitiesDeleteArgs = {
    activityIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationProjectActivitiesUpsertArgs = {
    projectActivities: Array<GqlSProjectActivityCreate>;
};

export type GqlSAdminMutationProjectFilesDeleteArgs = {
    projectFileIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationProjectFilesUpsertArgs = {
    projectFiles: Array<GqlSProjectFileUpsert>;
};

export type GqlSAdminMutationProjectLinksDeleteArgs = {
    projectLinkIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationProjectLinksUpsertArgs = {
    projectLinks: Array<GqlSProjectLinkUpsert>;
};

export type GqlSAdminMutationProjectReorderArgs = {
    orderedIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationProjectRequestArchiveArgs = {
    projectRequestId: Scalars['ID']['input'];
};

export type GqlSAdminMutationProjectRequestDeleteArgs = {
    projectRequestId: Scalars['ID']['input'];
};

export type GqlSAdminMutationProjectTimersStartArgs = {
    inputs: Array<GqlSProjectTimerStartInput>;
};

export type GqlSAdminMutationProjectTimersStopArgs = {
    activityIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationProjectsDeleteArgs = {
    projectIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationProjectsUpsertArgs = {
    projects: Array<GqlSProjectCreate>;
};

export type GqlSAdminMutationShowsAddFromTmdbArgs = {
    inputs: Array<GqlSShowAddFromTmdbInput>;
};

export type GqlSAdminMutationShowsDeleteArgs = {
    showIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationShowsUpsertArgs = {
    shows: Array<GqlSShowInput>;
};

export type GqlSAdminMutationTaskReorderArgs = {
    orderedIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationTasksDeleteArgs = {
    taskIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationTasksUpsertArgs = {
    tasks: Array<GqlSTaskCreate>;
};

export type GqlSAdminMutationTripActivitiesDeleteArgs = {
    tripActivityIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationTripActivitiesUpsertArgs = {
    tripActivities: Array<GqlSTripActivityInput>;
};

export type GqlSAdminMutationTripDaysDeleteArgs = {
    tripDayIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationTripDaysUpsertArgs = {
    tripDays: Array<GqlSTripDayInput>;
};

export type GqlSAdminMutationTripPackingItemsDeleteArgs = {
    tripPackingItemIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationTripPackingItemsUpsertArgs = {
    tripPackingItems: Array<GqlSTripPackingItemInput>;
};

export type GqlSAdminMutationTripsDeleteArgs = {
    tripIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationTripsUpsertArgs = {
    trips: Array<GqlSTripInput>;
};

export interface GqlSAdminTravelQuery {
    __typename?: 'AdminTravelQuery';
    adminTravelTripFindMany: Array<GqlSTrip>;
    adminTravelTripFindOne?: Maybe<GqlSTrip>;
}

export type GqlSAdminTravelQueryAdminTravelTripFindOneArgs = {
    tripId: Scalars['ID']['input'];
};

export interface GqlSChat {
    __typename?: 'Chat';
    chatId: Scalars['ID']['output'];
    lastModifiedAt: Scalars['DateTime']['output'];
    messages: Array<GqlSChatMessage>;
    title: Scalars['String']['output'];
}

export type GqlSChatAssistantInput =
    | GqlSChatAssistantInputBoolean
    | GqlSChatAssistantInputDate
    | GqlSChatAssistantInputDateRange
    | GqlSChatAssistantInputDateTime
    | GqlSChatAssistantInputMultiSelect
    | GqlSChatAssistantInputOtp
    | GqlSChatAssistantInputSingleSelect
    | GqlSChatAssistantInputText
    | GqlSChatAssistantInputTime;

export interface GqlSChatAssistantInputBoolean {
    __typename?: 'ChatAssistantInputBoolean';
    inputId: Scalars['ID']['output'];
    prompt: Scalars['String']['output'];
}

export interface GqlSChatAssistantInputDate {
    __typename?: 'ChatAssistantInputDate';
    inputId: Scalars['ID']['output'];
    prompt: Scalars['String']['output'];
}

export interface GqlSChatAssistantInputDateRange {
    __typename?: 'ChatAssistantInputDateRange';
    inputId: Scalars['ID']['output'];
    prompt: Scalars['String']['output'];
}

export interface GqlSChatAssistantInputDateTime {
    __typename?: 'ChatAssistantInputDateTime';
    inputId: Scalars['ID']['output'];
    prompt: Scalars['String']['output'];
}

export interface GqlSChatAssistantInputMultiSelect {
    __typename?: 'ChatAssistantInputMultiSelect';
    inputId: Scalars['ID']['output'];
    options: Array<Scalars['String']['output']>;
    prompt: Scalars['String']['output'];
}

export interface GqlSChatAssistantInputOtp {
    __typename?: 'ChatAssistantInputOtp';
    inputId: Scalars['ID']['output'];
    prompt: Scalars['String']['output'];
}

export interface GqlSChatAssistantInputSingleSelect {
    __typename?: 'ChatAssistantInputSingleSelect';
    inputId: Scalars['ID']['output'];
    options: Array<Scalars['String']['output']>;
    prompt: Scalars['String']['output'];
}

export interface GqlSChatAssistantInputText {
    __typename?: 'ChatAssistantInputText';
    inputId: Scalars['ID']['output'];
    prompt: Scalars['String']['output'];
}

export interface GqlSChatAssistantInputTime {
    __typename?: 'ChatAssistantInputTime';
    inputId: Scalars['ID']['output'];
    prompt: Scalars['String']['output'];
}

export type GqlSChatAssistantInputValue =
    | GqlSChatAssistantInputValueBoolean
    | GqlSChatAssistantInputValueDate
    | GqlSChatAssistantInputValueDateRange
    | GqlSChatAssistantInputValueDateTime
    | GqlSChatAssistantInputValueString
    | GqlSChatAssistantInputValueStringList
    | GqlSChatAssistantInputValueTime;

export interface GqlSChatAssistantInputValueBoolean {
    __typename?: 'ChatAssistantInputValueBoolean';
    boolean: Scalars['Boolean']['output'];
}

export interface GqlSChatAssistantInputValueDate {
    __typename?: 'ChatAssistantInputValueDate';
    date: Scalars['Date']['output'];
}

export interface GqlSChatAssistantInputValueDateRange {
    __typename?: 'ChatAssistantInputValueDateRange';
    from: Scalars['Date']['output'];
    to: Scalars['Date']['output'];
}

export interface GqlSChatAssistantInputValueDateTime {
    __typename?: 'ChatAssistantInputValueDateTime';
    dateTime: Scalars['DateTime']['output'];
}

export type GqlSChatAssistantInputValueKind = 'Boolean' | 'Date' | 'DateRange' | 'DateTime' | 'String' | 'StringList' | 'Time';

export interface GqlSChatAssistantInputValueString {
    __typename?: 'ChatAssistantInputValueString';
    value: Scalars['String']['output'];
}

export interface GqlSChatAssistantInputValueStringList {
    __typename?: 'ChatAssistantInputValueStringList';
    values: Array<Scalars['String']['output']>;
}

export interface GqlSChatAssistantInputValueTime {
    __typename?: 'ChatAssistantInputValueTime';
    time: Scalars['String']['output'];
}

export type GqlSChatAssistantOptions = {
    generationId?: InputMaybe<Scalars['ID']['input']>;
    modelId?: InputMaybe<Scalars['String']['input']>;
    requireToolCallApprovals: Scalars['Boolean']['input'];
};

export type GqlSChatMessage =
    | GqlSChatMessageAssistantInputCollection
    | GqlSChatMessageAssistantText
    | GqlSChatMessageToolApprovalRequest
    | GqlSChatMessageToolApprovalResponse
    | GqlSChatMessageToolCall
    | GqlSChatMessageUser
    | GqlSChatMessageUserInput;

export interface GqlSChatMessageAssistantInputCollection {
    __typename?: 'ChatMessageAssistantInputCollection';
    chatMessageId: Scalars['ID']['output'];
    createdAt: Scalars['DateTime']['output'];
    generation?: Maybe<GqlSChatMessageGeneration>;
    inputs: Array<GqlSChatAssistantInput>;
    mode: Scalars['String']['output'];
    prompt: Scalars['String']['output'];
}

export interface GqlSChatMessageAssistantText {
    __typename?: 'ChatMessageAssistantText';
    body: Scalars['String']['output'];
    chatMessageId: Scalars['ID']['output'];
    createdAt: Scalars['DateTime']['output'];
    generation?: Maybe<GqlSChatMessageGeneration>;
}

export interface GqlSChatMessageCreateResult {
    __typename?: 'ChatMessageCreateResult';
    chatId: Scalars['ID']['output'];
    chatMessageId: Scalars['ID']['output'];
}

export interface GqlSChatMessageGeneration {
    __typename?: 'ChatMessageGeneration';
    cachedInputTokens?: Maybe<Scalars['Int']['output']>;
    inputTokens?: Maybe<Scalars['Int']['output']>;
    modelId: Scalars['String']['output'];
    outputTokens?: Maybe<Scalars['Int']['output']>;
    reasoningTokens?: Maybe<Scalars['Int']['output']>;
    totalTokens?: Maybe<Scalars['Int']['output']>;
}

export interface GqlSChatMessageToolApprovalRequest {
    __typename?: 'ChatMessageToolApprovalRequest';
    approvalId: Scalars['String']['output'];
    args: Scalars['JSON']['output'];
    chatMessageId: Scalars['ID']['output'];
    createdAt: Scalars['DateTime']['output'];
    generation?: Maybe<GqlSChatMessageGeneration>;
    toolName: Scalars['String']['output'];
}

export interface GqlSChatMessageToolApprovalResponse {
    __typename?: 'ChatMessageToolApprovalResponse';
    approvalId: Scalars['String']['output'];
    approved: Scalars['Boolean']['output'];
    chatMessageId: Scalars['ID']['output'];
    createdAt: Scalars['DateTime']['output'];
    reason?: Maybe<Scalars['String']['output']>;
}

export interface GqlSChatMessageToolCall {
    __typename?: 'ChatMessageToolCall';
    args: Scalars['JSON']['output'];
    chatMessageId: Scalars['ID']['output'];
    createdAt: Scalars['DateTime']['output'];
    generation?: Maybe<GqlSChatMessageGeneration>;
    parentChatMessageId?: Maybe<Scalars['ID']['output']>;
    toolName: Scalars['String']['output'];
}

export interface GqlSChatMessageUser {
    __typename?: 'ChatMessageUser';
    attachments: Array<GqlSFileUpload>;
    author?: Maybe<GqlSUser>;
    body: Scalars['String']['output'];
    chatMessageId: Scalars['ID']['output'];
    compassObservations: Array<GqlSCompassObservation>;
    createdAt: Scalars['DateTime']['output'];
}

export interface GqlSChatMessageUserInput {
    __typename?: 'ChatMessageUserInput';
    answers: Array<GqlSChatMessageUserInputAnswer>;
    author?: Maybe<GqlSUser>;
    chatMessageId: Scalars['ID']['output'];
    collectionMessageId: Scalars['ID']['output'];
    createdAt: Scalars['DateTime']['output'];
}

export interface GqlSChatMessageUserInputAnswer {
    __typename?: 'ChatMessageUserInputAnswer';
    inputId: Scalars['ID']['output'];
    value: GqlSChatAssistantInputValue;
}

export type GqlSChatMessageUserInputAnswerCreate = {
    boolean?: InputMaybe<Scalars['Boolean']['input']>;
    date?: InputMaybe<Scalars['Date']['input']>;
    dateRangeFrom?: InputMaybe<Scalars['Date']['input']>;
    dateRangeTo?: InputMaybe<Scalars['Date']['input']>;
    dateTime?: InputMaybe<Scalars['DateTime']['input']>;
    inputId: Scalars['ID']['input'];
    kind: GqlSChatAssistantInputValueKind;
    string?: InputMaybe<Scalars['String']['input']>;
    stringList?: InputMaybe<Array<Scalars['String']['input']>>;
    time?: InputMaybe<Scalars['String']['input']>;
};

export type GqlSChatUpdate = GqlSChatUpdateAssistantTextChunk | GqlSChatUpdateMessageAppended | GqlSChatUpdateTurnEnded;

export interface GqlSChatUpdateAssistantTextChunk {
    __typename?: 'ChatUpdateAssistantTextChunk';
    chatMessageId: Scalars['ID']['output'];
    delta: Scalars['String']['output'];
}

export interface GqlSChatUpdateMessageAppended {
    __typename?: 'ChatUpdateMessageAppended';
    message: GqlSChatMessage;
}

export interface GqlSChatUpdateTurnEnded {
    __typename?: 'ChatUpdateTurnEnded';
    generationId: Scalars['ID']['output'];
}

export interface GqlSCompassInterview {
    __typename?: 'CompassInterview';
    completedAt?: Maybe<Scalars['DateTime']['output']>;
    dueAt: Scalars['DateTime']['output'];
    endReason?: Maybe<GqlSCompassInterviewEndReason>;
    interviewId: Scalars['ID']['output'];
    messages: Array<GqlSCompassInterviewMessage>;
    observationCount: Scalars['Int']['output'];
    startedAt?: Maybe<Scalars['DateTime']['output']>;
    status: GqlSCompassInterviewStatus;
    topic: GqlSCompassInterviewTopic;
    triggerReason: GqlSCompassInterviewTriggerReason;
}

export type GqlSCompassInterviewEndReason = 'agent_satisfied' | 'skipped' | 'user_ended';

export interface GqlSCompassInterviewMessage {
    __typename?: 'CompassInterviewMessage';
    content: Scalars['String']['output'];
    createdAt: Scalars['DateTime']['output'];
    interviewMessageId: Scalars['ID']['output'];
    modelId?: Maybe<Scalars['String']['output']>;
    role: GqlSCompassInterviewMessageRole;
}

export type GqlSCompassInterviewMessageRole = 'assistant' | 'user';

export type GqlSCompassInterviewStatus = 'completed' | 'in_progress' | 'pending' | 'skipped';

export type GqlSCompassInterviewTopic = 'career' | 'fitness' | 'general' | 'health' | 'relationships' | 'stress';

export type GqlSCompassInterviewTriggerReason = 'manual' | 'scheduled';

export type GqlSCompassInterviewUpdate =
    GqlSCompassInterviewUpdateAssistantTextChunk | GqlSCompassInterviewUpdateMessageAppended | GqlSCompassInterviewUpdateTurnEnded;

export interface GqlSCompassInterviewUpdateAssistantTextChunk {
    __typename?: 'CompassInterviewUpdateAssistantTextChunk';
    delta: Scalars['String']['output'];
    interviewMessageId: Scalars['ID']['output'];
}

export interface GqlSCompassInterviewUpdateMessageAppended {
    __typename?: 'CompassInterviewUpdateMessageAppended';
    message: GqlSCompassInterviewMessage;
}

export interface GqlSCompassInterviewUpdateTurnEnded {
    __typename?: 'CompassInterviewUpdateTurnEnded';
    concluded: Scalars['Boolean']['output'];
    generationId: Scalars['ID']['output'];
}

export interface GqlSCompassObservation {
    __typename?: 'CompassObservation';
    analyzerModelId?: Maybe<Scalars['String']['output']>;
    category: GqlSCompassObservationCategory;
    confidence?: Maybe<Scalars['Int']['output']>;
    content: Scalars['String']['output'];
    createdAt: Scalars['DateTime']['output'];
    dismissedAt?: Maybe<Scalars['DateTime']['output']>;
    observationId: Scalars['ID']['output'];
    sourceChatId?: Maybe<Scalars['ID']['output']>;
    sourceChatMessageId?: Maybe<Scalars['ID']['output']>;
    sourceInterviewId?: Maybe<Scalars['ID']['output']>;
    sourceInterviewMessageId?: Maybe<Scalars['ID']['output']>;
}

export type GqlSCompassObservationCategory = 'behavioral' | 'factual' | 'psychological';

export interface GqlSCvEducation {
    __typename?: 'CvEducation';
    cvEducationId: Scalars['ID']['output'];
    degreeDe: Scalars['String']['output'];
    degreeEn: Scalars['String']['output'];
    endDate: Scalars['Date']['output'];
    institution: Scalars['String']['output'];
    notesDe: Scalars['String']['output'];
    notesEn: Scalars['String']['output'];
    position: Scalars['Int']['output'];
    startDate?: Maybe<Scalars['Date']['output']>;
    subjectDe: Scalars['String']['output'];
    subjectEn: Scalars['String']['output'];
}

export type GqlSCvEducationInput = {
    cvEducationId?: InputMaybe<Scalars['ID']['input']>;
    degreeDe: Scalars['String']['input'];
    degreeEn: Scalars['String']['input'];
    endDate: Scalars['Date']['input'];
    institution: Scalars['String']['input'];
    notesDe: Scalars['String']['input'];
    notesEn: Scalars['String']['input'];
    position: Scalars['Int']['input'];
    startDate?: InputMaybe<Scalars['Date']['input']>;
    subjectDe: Scalars['String']['input'];
    subjectEn: Scalars['String']['input'];
};

export interface GqlSCvExperience {
    __typename?: 'CvExperience';
    company: Scalars['String']['output'];
    cvExperienceId: Scalars['ID']['output'];
    descriptionDe: Scalars['String']['output'];
    descriptionEn: Scalars['String']['output'];
    endDate?: Maybe<Scalars['Date']['output']>;
    managerName?: Maybe<Scalars['String']['output']>;
    roleDe: Scalars['String']['output'];
    roleEn: Scalars['String']['output'];
    startDate: Scalars['Date']['output'];
    technologies: Array<Scalars['String']['output']>;
}

export type GqlSCvExperienceInput = {
    company: Scalars['String']['input'];
    cvExperienceId?: InputMaybe<Scalars['ID']['input']>;
    descriptionDe: Scalars['String']['input'];
    descriptionEn: Scalars['String']['input'];
    endDate?: InputMaybe<Scalars['Date']['input']>;
    managerName?: InputMaybe<Scalars['String']['input']>;
    roleDe: Scalars['String']['input'];
    roleEn: Scalars['String']['input'];
    startDate: Scalars['Date']['input'];
    technologies: Array<Scalars['String']['input']>;
};

export interface GqlSCvHobby {
    __typename?: 'CvHobby';
    cvHobbyId: Scalars['ID']['output'];
    position: Scalars['Int']['output'];
    since?: Maybe<Scalars['Int']['output']>;
    textDe: Scalars['String']['output'];
    textEn: Scalars['String']['output'];
}

export type GqlSCvHobbyInput = {
    cvHobbyId?: InputMaybe<Scalars['ID']['input']>;
    position: Scalars['Int']['input'];
    since?: InputMaybe<Scalars['Int']['input']>;
    textDe: Scalars['String']['input'];
    textEn: Scalars['String']['input'];
};

export interface GqlSCvQuery {
    __typename?: 'CvQuery';
    publicCvEducationFindMany: Array<GqlSCvEducation>;
    publicCvExperienceFindMany: Array<GqlSCvExperience>;
    publicCvHobbyFindMany: Array<GqlSCvHobby>;
    publicCvSkillFindMany: Array<GqlSCvSkill>;
}

export interface GqlSCvSkill {
    __typename?: 'CvSkill';
    category: GqlSCvSkillCategory;
    cvSkillId: Scalars['ID']['output'];
    label: Scalars['String']['output'];
    position: Scalars['Int']['output'];
}

export type GqlSCvSkillCategory = 'capabilities' | 'frameworks' | 'languages' | 'services' | 'tools';

export type GqlSCvSkillInput = {
    category: GqlSCvSkillCategory;
    cvSkillId?: InputMaybe<Scalars['ID']['input']>;
    label: Scalars['String']['input'];
    position: Scalars['Int']['input'];
};

export interface GqlSFileUpload {
    __typename?: 'FileUpload';
    fileUploadId: Scalars['ID']['output'];
    filename: Scalars['String']['output'];
    mediaType: Scalars['String']['output'];
    size: Scalars['Int']['output'];
    url: Scalars['String']['output'];
}

export type GqlSFinanceCadence = 'monthly' | 'yearly';

export interface GqlSFinanceRecurringCost {
    __typename?: 'FinanceRecurringCost';
    active: Scalars['Boolean']['output'];
    amountCents: Scalars['Int']['output'];
    cadence: GqlSFinanceCadence;
    categoryKey: GqlSFinanceRecurringCostCategory;
    costId: Scalars['ID']['output'];
    createdAt: Scalars['DateTime']['output'];
    currency: Scalars['String']['output'];
    endsOn?: Maybe<Scalars['Date']['output']>;
    name: Scalars['String']['output'];
    notes?: Maybe<Scalars['String']['output']>;
    startsOn?: Maybe<Scalars['Date']['output']>;
    updatedAt: Scalars['DateTime']['output'];
}

export type GqlSFinanceRecurringCostCategory =
    'finance' | 'health' | 'housing' | 'insurance' | 'other' | 'subscriptions' | 'transport' | 'utilities';

export type GqlSFinanceRecurringCostInput = {
    active?: InputMaybe<Scalars['Boolean']['input']>;
    amountCents: Scalars['Int']['input'];
    cadence: GqlSFinanceCadence;
    categoryKey: GqlSFinanceRecurringCostCategory;
    costId?: InputMaybe<Scalars['ID']['input']>;
    currency?: InputMaybe<Scalars['String']['input']>;
    endsOn?: InputMaybe<Scalars['Date']['input']>;
    name: Scalars['String']['input'];
    notes?: InputMaybe<Scalars['String']['input']>;
    startsOn?: InputMaybe<Scalars['Date']['input']>;
};

export interface GqlSItem {
    __typename?: 'Item';
    brand?: Maybe<Scalars['String']['output']>;
    categoryKey: GqlSItemCategory;
    condition?: Maybe<GqlSItemCondition>;
    createdAt: Scalars['DateTime']['output'];
    currentValueCents?: Maybe<Scalars['Int']['output']>;
    disposalState: GqlSItemDisposalState;
    disposedAt?: Maybe<Scalars['DateTime']['output']>;
    files: Array<GqlSItemFile>;
    itemId: Scalars['ID']['output'];
    model?: Maybe<Scalars['String']['output']>;
    name: Scalars['String']['output'];
    notes?: Maybe<Scalars['String']['output']>;
    purchasePriceCents?: Maybe<Scalars['Int']['output']>;
    purchasedAt?: Maybe<Scalars['Date']['output']>;
    serialNumber?: Maybe<Scalars['String']['output']>;
    serviceEntries: Array<GqlSItemServiceEntry>;
    updatedAt: Scalars['DateTime']['output'];
    valuations: Array<GqlSItemValuation>;
    warrantyEndsAt?: Maybe<Scalars['Date']['output']>;
    warrantyNotes?: Maybe<Scalars['String']['output']>;
    warrantyProvider?: Maybe<Scalars['String']['output']>;
}

export type GqlSItemCategory = 'appliance' | 'clothing' | 'electronics' | 'furniture' | 'kitchen' | 'other' | 'sports' | 'tool' | 'vehicle';

export type GqlSItemCondition = 'fair' | 'good' | 'likeNew' | 'new' | 'poor';

export type GqlSItemDisposalState = 'disposed' | 'gifted' | 'lost' | 'owned' | 'sold';

export interface GqlSItemFile {
    __typename?: 'ItemFile';
    createdAt: Scalars['DateTime']['output'];
    fileUpload: GqlSFileUpload;
    itemFileId: Scalars['ID']['output'];
    itemId: Scalars['ID']['output'];
    kind: GqlSItemFileKind;
    label?: Maybe<Scalars['String']['output']>;
    pinned: Scalars['Boolean']['output'];
    serviceEntryId?: Maybe<Scalars['ID']['output']>;
    updatedAt: Scalars['DateTime']['output'];
}

export type GqlSItemFileAttachInput = {
    fileUploadId: Scalars['ID']['input'];
    itemId: Scalars['ID']['input'];
    kind: GqlSItemFileKind;
    label?: InputMaybe<Scalars['String']['input']>;
    pinned?: InputMaybe<Scalars['Boolean']['input']>;
    serviceEntryId?: InputMaybe<Scalars['ID']['input']>;
};

export type GqlSItemFileKind = 'invoice' | 'manual' | 'other' | 'photo' | 'receipt' | 'warranty';

export type GqlSItemFileUpsert = {
    itemFileId: Scalars['ID']['input'];
    label?: InputMaybe<Scalars['String']['input']>;
    pinned?: InputMaybe<Scalars['Boolean']['input']>;
};

export type GqlSItemInput = {
    brand?: InputMaybe<Scalars['String']['input']>;
    categoryKey: GqlSItemCategory;
    condition?: InputMaybe<GqlSItemCondition>;
    disposalState?: InputMaybe<GqlSItemDisposalState>;
    disposedAt?: InputMaybe<Scalars['DateTime']['input']>;
    itemId?: InputMaybe<Scalars['ID']['input']>;
    model?: InputMaybe<Scalars['String']['input']>;
    name: Scalars['String']['input'];
    notes?: InputMaybe<Scalars['String']['input']>;
    purchasePriceCents?: InputMaybe<Scalars['Int']['input']>;
    purchasedAt?: InputMaybe<Scalars['Date']['input']>;
    serialNumber?: InputMaybe<Scalars['String']['input']>;
    warrantyEndsAt?: InputMaybe<Scalars['Date']['input']>;
    warrantyNotes?: InputMaybe<Scalars['String']['input']>;
    warrantyProvider?: InputMaybe<Scalars['String']['input']>;
};

export type GqlSItemRepriceInput = {
    itemId: Scalars['ID']['input'];
    note?: InputMaybe<Scalars['String']['input']>;
    valueCents: Scalars['Int']['input'];
    valuedAt?: InputMaybe<Scalars['DateTime']['input']>;
};

export interface GqlSItemServiceEntry {
    __typename?: 'ItemServiceEntry';
    costCents?: Maybe<Scalars['Int']['output']>;
    createdAt: Scalars['DateTime']['output'];
    files: Array<GqlSItemFile>;
    kind: GqlSItemServiceKind;
    nextDueAt?: Maybe<Scalars['Date']['output']>;
    notes?: Maybe<Scalars['String']['output']>;
    performedAt: Scalars['Date']['output'];
    serviceEntryId: Scalars['ID']['output'];
    updatedAt: Scalars['DateTime']['output'];
    vendor?: Maybe<Scalars['String']['output']>;
}

export type GqlSItemServiceEntryInput = {
    costCents?: InputMaybe<Scalars['Int']['input']>;
    itemId: Scalars['ID']['input'];
    kind: GqlSItemServiceKind;
    nextDueAt?: InputMaybe<Scalars['Date']['input']>;
    notes?: InputMaybe<Scalars['String']['input']>;
    performedAt: Scalars['Date']['input'];
    serviceEntryId?: InputMaybe<Scalars['ID']['input']>;
    vendor?: InputMaybe<Scalars['String']['input']>;
};

export type GqlSItemServiceKind = 'other' | 'repair' | 'replacement' | 'service';

export interface GqlSItemValuation {
    __typename?: 'ItemValuation';
    note?: Maybe<Scalars['String']['output']>;
    valuationId: Scalars['ID']['output'];
    valueCents: Scalars['Int']['output'];
    valuedAt: Scalars['DateTime']['output'];
}

export interface GqlSLog {
    __typename?: 'Log';
    context?: Maybe<Scalars['JSON']['output']>;
    createdAt: Scalars['DateTime']['output'];
    level: GqlSLogLevel;
    logId: Scalars['ID']['output'];
    message: Scalars['String']['output'];
    sessionId?: Maybe<Scalars['ID']['output']>;
}

export type GqlSLogLevel = 'debug' | 'error' | 'info' | 'warn';

export interface GqlSMediaChannel {
    __typename?: 'MediaChannel';
    avatarUrl?: Maybe<Scalars['String']['output']>;
    channelId: Scalars['ID']['output'];
    description?: Maybe<Scalars['String']['output']>;
    handle?: Maybe<Scalars['String']['output']>;
    name: Scalars['String']['output'];
    notes?: Maybe<Scalars['String']['output']>;
    platform: GqlSMediaPlatform;
    priority: Scalars['Int']['output'];
    topics: Array<Scalars['String']['output']>;
    updatedAt: Scalars['DateTime']['output'];
    url: Scalars['String']['output'];
}

export type GqlSMediaChannelInput = {
    avatarUrl?: InputMaybe<Scalars['String']['input']>;
    channelId?: InputMaybe<Scalars['ID']['input']>;
    description?: InputMaybe<Scalars['String']['input']>;
    handle?: InputMaybe<Scalars['String']['input']>;
    name: Scalars['String']['input'];
    notes?: InputMaybe<Scalars['String']['input']>;
    platform: GqlSMediaPlatform;
    topics: Array<Scalars['String']['input']>;
    url: Scalars['String']['input'];
};

export type GqlSMediaPlatform = 'other' | 'podcast' | 'twitch' | 'youtube';

export type GqlSMediaTopic =
    | 'ai'
    | 'business'
    | 'comedy'
    | 'education'
    | 'entertainment'
    | 'finance'
    | 'gaming'
    | 'lifestyle'
    | 'movieCritic'
    | 'music'
    | 'news'
    | 'science'
    | 'software'
    | 'sports'
    | 'tech';

export interface GqlSMedicalAppointment {
    __typename?: 'MedicalAppointment';
    appointmentId: Scalars['ID']['output'];
    category: GqlSMedicalCategory;
    completedAt?: Maybe<Scalars['DateTime']['output']>;
    createdAt: Scalars['DateTime']['output'];
    nextDueAt?: Maybe<Scalars['DateTime']['output']>;
    notes?: Maybe<Scalars['String']['output']>;
    providerName?: Maybe<Scalars['String']['output']>;
    scheduledAt: Scalars['DateTime']['output'];
    status: GqlSMedicalAppointmentStatus;
    title: Scalars['String']['output'];
    topics: Array<Scalars['String']['output']>;
    updatedAt: Scalars['DateTime']['output'];
}

export type GqlSMedicalAppointmentInput = {
    appointmentId?: InputMaybe<Scalars['ID']['input']>;
    category: GqlSMedicalCategory;
    completedAt?: InputMaybe<Scalars['DateTime']['input']>;
    nextDueAt?: InputMaybe<Scalars['DateTime']['input']>;
    notes?: InputMaybe<Scalars['String']['input']>;
    providerName?: InputMaybe<Scalars['String']['input']>;
    scheduledAt: Scalars['DateTime']['input'];
    status: GqlSMedicalAppointmentStatus;
    title: Scalars['String']['input'];
    topics: Array<Scalars['String']['input']>;
};

export type GqlSMedicalAppointmentStatus = 'cancelled' | 'completed' | 'missed' | 'scheduled';

export type GqlSMedicalCategory = 'dentist' | 'dermatology' | 'ent' | 'eyes' | 'gp' | 'mentalHealth' | 'other' | 'physio';

export interface GqlSMedicalCategoryOverview {
    __typename?: 'MedicalCategoryOverview';
    category: GqlSMedicalCategory;
    defaultCadenceMonths?: Maybe<Scalars['Int']['output']>;
    isOverdue: Scalars['Boolean']['output'];
    lastCompletedAt?: Maybe<Scalars['DateTime']['output']>;
    nextDueAt?: Maybe<Scalars['DateTime']['output']>;
    recentRecords: Array<GqlSMedicalRecord>;
    upcoming: Array<GqlSMedicalAppointment>;
}

export interface GqlSMedicalRecord {
    __typename?: 'MedicalRecord';
    appointmentId?: Maybe<Scalars['ID']['output']>;
    bodyAreas: Array<Scalars['String']['output']>;
    category: GqlSMedicalCategory;
    createdAt: Scalars['DateTime']['output'];
    files: Array<GqlSMedicalRecordFile>;
    occurredAt?: Maybe<Scalars['DateTime']['output']>;
    recordId: Scalars['ID']['output'];
    resolvedAt?: Maybe<Scalars['DateTime']['output']>;
    severity?: Maybe<GqlSMedicalRecordSeverity>;
    summary: Scalars['String']['output'];
    symptoms: Array<Scalars['String']['output']>;
    title: Scalars['String']['output'];
    topics: Array<Scalars['String']['output']>;
    updatedAt: Scalars['DateTime']['output'];
}

export interface GqlSMedicalRecordFile {
    __typename?: 'MedicalRecordFile';
    createdAt: Scalars['DateTime']['output'];
    fileUpload: GqlSFileUpload;
    label?: Maybe<Scalars['String']['output']>;
    pinned: Scalars['Boolean']['output'];
    recordFileId: Scalars['ID']['output'];
    recordId: Scalars['ID']['output'];
    updatedAt: Scalars['DateTime']['output'];
}

export type GqlSMedicalRecordFileAttachInput = {
    fileUploadId: Scalars['ID']['input'];
    label?: InputMaybe<Scalars['String']['input']>;
    pinned?: InputMaybe<Scalars['Boolean']['input']>;
    recordId: Scalars['ID']['input'];
};

export type GqlSMedicalRecordInput = {
    appointmentId?: InputMaybe<Scalars['ID']['input']>;
    bodyAreas: Array<Scalars['String']['input']>;
    category: GqlSMedicalCategory;
    fileUploadIds?: InputMaybe<Array<Scalars['ID']['input']>>;
    occurredAt?: InputMaybe<Scalars['DateTime']['input']>;
    recordId?: InputMaybe<Scalars['ID']['input']>;
    resolvedAt?: InputMaybe<Scalars['DateTime']['input']>;
    severity?: InputMaybe<GqlSMedicalRecordSeverity>;
    summary: Scalars['String']['input'];
    symptoms: Array<Scalars['String']['input']>;
    title: Scalars['String']['input'];
    topics: Array<Scalars['String']['input']>;
};

export type GqlSMedicalRecordSeverity = 'info' | 'mild' | 'moderate' | 'severe';

export interface GqlSMovie {
    __typename?: 'Movie';
    backdropUrl?: Maybe<Scalars['String']['output']>;
    movieId: Scalars['ID']['output'];
    notes?: Maybe<Scalars['String']['output']>;
    overview?: Maybe<Scalars['String']['output']>;
    posterUrl?: Maybe<Scalars['String']['output']>;
    rating?: Maybe<Scalars['Int']['output']>;
    releaseDate?: Maybe<Scalars['Date']['output']>;
    runtimeMinutes?: Maybe<Scalars['Int']['output']>;
    status: GqlSMovieStatus;
    title: Scalars['String']['output'];
    tmdbId?: Maybe<Scalars['Int']['output']>;
    topics: Array<Scalars['String']['output']>;
    updatedAt: Scalars['DateTime']['output'];
    watchedAt?: Maybe<Scalars['DateTime']['output']>;
}

export type GqlSMovieAddFromTmdbInput = {
    status?: InputMaybe<GqlSMovieStatus>;
    tmdbId: Scalars['Int']['input'];
};

export type GqlSMovieInput = {
    backdropUrl?: InputMaybe<Scalars['String']['input']>;
    movieId?: InputMaybe<Scalars['ID']['input']>;
    notes?: InputMaybe<Scalars['String']['input']>;
    overview?: InputMaybe<Scalars['String']['input']>;
    posterUrl?: InputMaybe<Scalars['String']['input']>;
    rating?: InputMaybe<Scalars['Int']['input']>;
    releaseDate?: InputMaybe<Scalars['Date']['input']>;
    runtimeMinutes?: InputMaybe<Scalars['Int']['input']>;
    status: GqlSMovieStatus;
    title: Scalars['String']['input'];
    tmdbId?: InputMaybe<Scalars['Int']['input']>;
    topics: Array<Scalars['String']['input']>;
    watchedAt?: InputMaybe<Scalars['DateTime']['input']>;
};

export type GqlSMovieStatus = 'dropped' | 'watched' | 'watching' | 'watchlist';

export interface GqlSMutation {
    __typename?: 'Mutation';
    admin: GqlSAdminMutation;
    chatInputCollectionRespond?: Maybe<GqlSChatMessageCreateResult>;
    chatMessageCreate?: Maybe<GqlSChatMessageCreateResult>;
    chatToolApprovalRespond?: Maybe<GqlSChatMessageCreateResult>;
    user: GqlSUserMutation;
    userCreate: GqlSMutationResult;
}

export type GqlSMutationChatInputCollectionRespondArgs = {
    answers: Array<GqlSChatMessageUserInputAnswerCreate>;
    assistantOptions: GqlSChatAssistantOptions;
    collectionMessageId: Scalars['ID']['input'];
};

export type GqlSMutationChatMessageCreateArgs = {
    assistantOptions: GqlSChatAssistantOptions;
    chatId?: InputMaybe<Scalars['ID']['input']>;
    currentPagePath?: InputMaybe<Scalars['String']['input']>;
    fileUploadIds?: InputMaybe<Array<Scalars['ID']['input']>>;
    message: Scalars['String']['input'];
};

export type GqlSMutationChatToolApprovalRespondArgs = {
    approvalId: Scalars['String']['input'];
    approved: Scalars['Boolean']['input'];
    assistantOptions: GqlSChatAssistantOptions;
    reason?: InputMaybe<Scalars['String']['input']>;
};

export type GqlSMutationUserCreateArgs = {
    user: GqlSUserCreate;
};

export interface GqlSMutationResult {
    __typename?: 'MutationResult';
    referenceId?: Maybe<Scalars['ID']['output']>;
    referenceIds?: Maybe<Array<Scalars['ID']['output']>>;
    success: Scalars['Boolean']['output'];
}

export interface GqlSProject {
    __typename?: 'Project';
    activities: Array<GqlSProjectActivity>;
    completedAt?: Maybe<Scalars['DateTime']['output']>;
    createdAt: Scalars['DateTime']['output'];
    description?: Maybe<Scalars['String']['output']>;
    files: Array<GqlSProjectFile>;
    links: Array<GqlSProjectLink>;
    notes?: Maybe<Scalars['String']['output']>;
    position: Scalars['Int']['output'];
    projectId: Scalars['ID']['output'];
    sourceRequest?: Maybe<GqlSProjectRequest>;
    startedAt?: Maybe<Scalars['DateTime']['output']>;
    status: GqlSProjectStatus;
    tasks: Array<GqlSTask>;
    title: Scalars['String']['output'];
    totalWorkSec: Scalars['Int']['output'];
    updatedAt: Scalars['DateTime']['output'];
}

export interface GqlSProjectActivity {
    __typename?: 'ProjectActivity';
    activityId: Scalars['ID']['output'];
    amountCents?: Maybe<Scalars['Int']['output']>;
    channel?: Maybe<GqlSProjectActivityChannel>;
    createdAt: Scalars['DateTime']['output'];
    direction: GqlSProjectActivityDirection;
    durationSec?: Maybe<Scalars['Int']['output']>;
    endedAt?: Maybe<Scalars['DateTime']['output']>;
    files: Array<GqlSProjectFile>;
    kind: GqlSProjectActivityKind;
    links: Array<GqlSProjectLink>;
    notes?: Maybe<Scalars['String']['output']>;
    occurredAt: Scalars['DateTime']['output'];
    offerStatus?: Maybe<GqlSProjectOfferStatus>;
    projectId: Scalars['ID']['output'];
    startedAt?: Maybe<Scalars['DateTime']['output']>;
    taskId?: Maybe<Scalars['ID']['output']>;
    title: Scalars['String']['output'];
    updatedAt: Scalars['DateTime']['output'];
}

export type GqlSProjectActivityChannel = 'aiAssistant' | 'email' | 'inPerson' | 'malt' | 'other' | 'phone' | 'videoCall';

export type GqlSProjectActivityCreate = {
    activityId?: InputMaybe<Scalars['ID']['input']>;
    amountCents?: InputMaybe<Scalars['Int']['input']>;
    attachFileKind?: InputMaybe<GqlSProjectFileKind>;
    attachFileLabel?: InputMaybe<Scalars['String']['input']>;
    attachFilePinned?: InputMaybe<Scalars['Boolean']['input']>;
    attachFileUploadId?: InputMaybe<Scalars['ID']['input']>;
    attachLinkKind?: InputMaybe<GqlSProjectLinkKind>;
    attachLinkLabel?: InputMaybe<Scalars['String']['input']>;
    attachLinkPinned?: InputMaybe<Scalars['Boolean']['input']>;
    attachLinkUrl?: InputMaybe<Scalars['String']['input']>;
    channel?: InputMaybe<GqlSProjectActivityChannel>;
    direction?: InputMaybe<GqlSProjectActivityDirection>;
    durationSec?: InputMaybe<Scalars['Int']['input']>;
    kind: GqlSProjectActivityKind;
    notes?: InputMaybe<Scalars['String']['input']>;
    occurredAt: Scalars['DateTime']['input'];
    offerStatus?: InputMaybe<GqlSProjectOfferStatus>;
    projectId: Scalars['ID']['input'];
    taskId?: InputMaybe<Scalars['ID']['input']>;
    title: Scalars['String']['input'];
};

export type GqlSProjectActivityDirection = 'incoming' | 'internal' | 'outgoing';

export type GqlSProjectActivityKind = 'clientContact' | 'meeting' | 'milestone' | 'note' | 'offer' | 'work';

export type GqlSProjectCreate = {
    completedAt?: InputMaybe<Scalars['DateTime']['input']>;
    description?: InputMaybe<Scalars['String']['input']>;
    notes?: InputMaybe<Scalars['String']['input']>;
    position?: InputMaybe<Scalars['Int']['input']>;
    projectId?: InputMaybe<Scalars['ID']['input']>;
    sourceRequestId?: InputMaybe<Scalars['ID']['input']>;
    startedAt?: InputMaybe<Scalars['DateTime']['input']>;
    status: GqlSProjectStatus;
    title: Scalars['String']['input'];
};

export interface GqlSProjectFile {
    __typename?: 'ProjectFile';
    activityId?: Maybe<Scalars['ID']['output']>;
    createdAt: Scalars['DateTime']['output'];
    fileUpload: GqlSFileUpload;
    kind: GqlSProjectFileKind;
    label?: Maybe<Scalars['String']['output']>;
    pinned: Scalars['Boolean']['output'];
    projectFileId: Scalars['ID']['output'];
    projectId: Scalars['ID']['output'];
    updatedAt: Scalars['DateTime']['output'];
}

export type GqlSProjectFileKind = 'contract' | 'invoice' | 'offer' | 'other' | 'screenshot';

export type GqlSProjectFileUpsert = {
    activityId?: InputMaybe<Scalars['ID']['input']>;
    fileUploadId: Scalars['ID']['input'];
    kind: GqlSProjectFileKind;
    label?: InputMaybe<Scalars['String']['input']>;
    pinned?: InputMaybe<Scalars['Boolean']['input']>;
    projectFileId?: InputMaybe<Scalars['ID']['input']>;
    projectId: Scalars['ID']['input'];
};

export interface GqlSProjectLink {
    __typename?: 'ProjectLink';
    activityId?: Maybe<Scalars['ID']['output']>;
    createdAt: Scalars['DateTime']['output'];
    kind: GqlSProjectLinkKind;
    label?: Maybe<Scalars['String']['output']>;
    pinned: Scalars['Boolean']['output'];
    projectId: Scalars['ID']['output'];
    projectLinkId: Scalars['ID']['output'];
    updatedAt: Scalars['DateTime']['output'];
    url: Scalars['String']['output'];
}

export type GqlSProjectLinkKind = 'figma' | 'gdrive' | 'github' | 'invoice' | 'malt' | 'notion' | 'offer' | 'other';

export type GqlSProjectLinkUpsert = {
    activityId?: InputMaybe<Scalars['ID']['input']>;
    kind: GqlSProjectLinkKind;
    label?: InputMaybe<Scalars['String']['input']>;
    pinned?: InputMaybe<Scalars['Boolean']['input']>;
    projectId: Scalars['ID']['input'];
    projectLinkId?: InputMaybe<Scalars['ID']['input']>;
    url: Scalars['String']['input'];
};

export type GqlSProjectOfferStatus = 'accepted' | 'rejected' | 'sent' | 'withdrawn';

export interface GqlSProjectRequest {
    __typename?: 'ProjectRequest';
    budget?: Maybe<Scalars['String']['output']>;
    chatId?: Maybe<Scalars['ID']['output']>;
    company?: Maybe<Scalars['String']['output']>;
    convertedProject?: Maybe<GqlSProject>;
    createdAt: Scalars['DateTime']['output'];
    description: Scalars['String']['output'];
    email: Scalars['String']['output'];
    name: Scalars['String']['output'];
    projectRequestId: Scalars['ID']['output'];
    projectType: GqlSProjectRequestType;
    status: GqlSProjectRequestStatus;
    timeline?: Maybe<Scalars['String']['output']>;
    updatedAt: Scalars['DateTime']['output'];
    verifiedAt?: Maybe<Scalars['DateTime']['output']>;
}

export type GqlSProjectRequestStatus = 'archived' | 'emailVerified' | 'pendingOtp';

export type GqlSProjectRequestType = 'aiIntegration' | 'consulting' | 'mobile' | 'other' | 'webApp';

export type GqlSProjectStatus = 'active' | 'archived' | 'done' | 'idea' | 'paused' | 'planning';

export type GqlSProjectTimerStartInput = {
    projectId: Scalars['ID']['input'];
    taskId?: InputMaybe<Scalars['ID']['input']>;
    title?: InputMaybe<Scalars['String']['input']>;
};

export interface GqlSQuery {
    __typename?: 'Query';
    publicCvFindOne: GqlSCvQuery;
    sessionFindOne: GqlSSession;
}

export interface GqlSSession {
    __typename?: 'Session';
    sessionId: Scalars['ID']['output'];
    user?: Maybe<GqlSUser>;
    visitorChatFindMany: Array<GqlSChat>;
    visitorChatFindOne: GqlSChat;
    visitorChatQuotaFindOne: GqlSVisitorChatQuota;
}

export type GqlSSessionVisitorChatFindOneArgs = {
    chatId: Scalars['ID']['input'];
};

export interface GqlSShow {
    __typename?: 'Show';
    backdropUrl?: Maybe<Scalars['String']['output']>;
    firstAirDate?: Maybe<Scalars['Date']['output']>;
    isCompleted: Scalars['Boolean']['output'];
    nextSeasonReleaseDate?: Maybe<Scalars['Date']['output']>;
    nextSeasonReleaseRough?: Maybe<Scalars['String']['output']>;
    notes?: Maybe<Scalars['String']['output']>;
    overview?: Maybe<Scalars['String']['output']>;
    posterUrl?: Maybe<Scalars['String']['output']>;
    rating?: Maybe<Scalars['Int']['output']>;
    showId: Scalars['ID']['output'];
    status: GqlSMovieStatus;
    title: Scalars['String']['output'];
    tmdbId?: Maybe<Scalars['Int']['output']>;
    topics: Array<Scalars['String']['output']>;
    updatedAt: Scalars['DateTime']['output'];
}

export type GqlSShowAddFromTmdbInput = {
    status?: InputMaybe<GqlSMovieStatus>;
    tmdbId: Scalars['Int']['input'];
};

export type GqlSShowInput = {
    backdropUrl?: InputMaybe<Scalars['String']['input']>;
    firstAirDate?: InputMaybe<Scalars['Date']['input']>;
    isCompleted: Scalars['Boolean']['input'];
    nextSeasonReleaseDate?: InputMaybe<Scalars['Date']['input']>;
    nextSeasonReleaseRough?: InputMaybe<Scalars['String']['input']>;
    notes?: InputMaybe<Scalars['String']['input']>;
    overview?: InputMaybe<Scalars['String']['input']>;
    posterUrl?: InputMaybe<Scalars['String']['input']>;
    rating?: InputMaybe<Scalars['Int']['input']>;
    showId?: InputMaybe<Scalars['ID']['input']>;
    status: GqlSMovieStatus;
    title: Scalars['String']['input'];
    tmdbId?: InputMaybe<Scalars['Int']['input']>;
    topics: Array<Scalars['String']['input']>;
};

export interface GqlSSubscription {
    __typename?: 'Subscription';
    chatUpdates: GqlSChatUpdate;
    compassInterviewUpdates: GqlSCompassInterviewUpdate;
    userUpdates: GqlSUser;
}

export type GqlSSubscriptionChatUpdatesArgs = {
    generationId: Scalars['ID']['input'];
};

export type GqlSSubscriptionCompassInterviewUpdatesArgs = {
    generationId: Scalars['ID']['input'];
};

export interface GqlSTask {
    __typename?: 'Task';
    completedAt?: Maybe<Scalars['DateTime']['output']>;
    createdAt: Scalars['DateTime']['output'];
    dueAt?: Maybe<Scalars['DateTime']['output']>;
    effort?: Maybe<GqlSTaskEffort>;
    notes?: Maybe<Scalars['String']['output']>;
    position: Scalars['Int']['output'];
    projectId?: Maybe<Scalars['ID']['output']>;
    status: GqlSTaskStatus;
    taskId: Scalars['ID']['output'];
    title: Scalars['String']['output'];
    updatedAt: Scalars['DateTime']['output'];
    whenBucket?: Maybe<GqlSTaskWhenBucket>;
}

export type GqlSTaskCreate = {
    completedAt?: InputMaybe<Scalars['DateTime']['input']>;
    dueAt?: InputMaybe<Scalars['DateTime']['input']>;
    effort?: InputMaybe<GqlSTaskEffort>;
    notes?: InputMaybe<Scalars['String']['input']>;
    position: Scalars['Int']['input'];
    projectId?: InputMaybe<Scalars['ID']['input']>;
    status: GqlSTaskStatus;
    taskId?: InputMaybe<Scalars['ID']['input']>;
    title: Scalars['String']['input'];
    whenBucket?: InputMaybe<GqlSTaskWhenBucket>;
};

export type GqlSTaskEffort = 'deep' | 'focused' | 'quick';

export type GqlSTaskStatus = 'doing' | 'done' | 'todo';

export type GqlSTaskWhenBucket = 'someday' | 'today' | 'waiting' | 'week';

export interface GqlSTmdbMovieResult {
    __typename?: 'TmdbMovieResult';
    overview?: Maybe<Scalars['String']['output']>;
    posterUrl?: Maybe<Scalars['String']['output']>;
    releaseDate?: Maybe<Scalars['Date']['output']>;
    title: Scalars['String']['output'];
    tmdbId: Scalars['Int']['output'];
}

export interface GqlSTmdbTvResult {
    __typename?: 'TmdbTvResult';
    firstAirDate?: Maybe<Scalars['Date']['output']>;
    overview?: Maybe<Scalars['String']['output']>;
    posterUrl?: Maybe<Scalars['String']['output']>;
    title: Scalars['String']['output'];
    tmdbId: Scalars['Int']['output'];
}

export type GqlSTransportMode = 'car' | 'ferry' | 'flight' | 'mixed' | 'train';

export interface GqlSTrip {
    __typename?: 'Trip';
    accommodation?: Maybe<Scalars['String']['output']>;
    createdAt: Scalars['DateTime']['output'];
    days: Array<GqlSTripDay>;
    destination: Scalars['String']['output'];
    endsOn?: Maybe<Scalars['Date']['output']>;
    notes?: Maybe<Scalars['String']['output']>;
    packingItems: Array<GqlSTripPackingItem>;
    startsOn?: Maybe<Scalars['Date']['output']>;
    status: GqlSTripStatus;
    title: Scalars['String']['output'];
    transportMode?: Maybe<GqlSTransportMode>;
    tripId: Scalars['ID']['output'];
    updatedAt: Scalars['DateTime']['output'];
}

export interface GqlSTripActivity {
    __typename?: 'TripActivity';
    createdAt: Scalars['DateTime']['output'];
    endsAt?: Maybe<Scalars['String']['output']>;
    location?: Maybe<Scalars['String']['output']>;
    notes?: Maybe<Scalars['String']['output']>;
    position: Scalars['Int']['output'];
    startsAt?: Maybe<Scalars['String']['output']>;
    title: Scalars['String']['output'];
    tripActivityId: Scalars['ID']['output'];
    tripDayId: Scalars['ID']['output'];
    updatedAt: Scalars['DateTime']['output'];
    url?: Maybe<Scalars['String']['output']>;
}

export type GqlSTripActivityInput = {
    endsAt?: InputMaybe<Scalars['String']['input']>;
    location?: InputMaybe<Scalars['String']['input']>;
    notes?: InputMaybe<Scalars['String']['input']>;
    position?: InputMaybe<Scalars['Int']['input']>;
    startsAt?: InputMaybe<Scalars['String']['input']>;
    title: Scalars['String']['input'];
    tripActivityId?: InputMaybe<Scalars['ID']['input']>;
    tripDayId: Scalars['ID']['input'];
    url?: InputMaybe<Scalars['String']['input']>;
};

export interface GqlSTripDay {
    __typename?: 'TripDay';
    activities: Array<GqlSTripActivity>;
    createdAt: Scalars['DateTime']['output'];
    date?: Maybe<Scalars['Date']['output']>;
    dayNumber: Scalars['Int']['output'];
    summary?: Maybe<Scalars['String']['output']>;
    title?: Maybe<Scalars['String']['output']>;
    tripDayId: Scalars['ID']['output'];
    tripId: Scalars['ID']['output'];
    updatedAt: Scalars['DateTime']['output'];
}

export type GqlSTripDayInput = {
    date?: InputMaybe<Scalars['Date']['input']>;
    dayNumber: Scalars['Int']['input'];
    summary?: InputMaybe<Scalars['String']['input']>;
    title?: InputMaybe<Scalars['String']['input']>;
    tripDayId?: InputMaybe<Scalars['ID']['input']>;
    tripId: Scalars['ID']['input'];
};

export type GqlSTripInput = {
    accommodation?: InputMaybe<Scalars['String']['input']>;
    destination: Scalars['String']['input'];
    endsOn?: InputMaybe<Scalars['Date']['input']>;
    notes?: InputMaybe<Scalars['String']['input']>;
    startsOn?: InputMaybe<Scalars['Date']['input']>;
    status: GqlSTripStatus;
    title: Scalars['String']['input'];
    transportMode?: InputMaybe<GqlSTransportMode>;
    tripId?: InputMaybe<Scalars['ID']['input']>;
};

export interface GqlSTripPackingItem {
    __typename?: 'TripPackingItem';
    category: Scalars['String']['output'];
    createdAt: Scalars['DateTime']['output'];
    label: Scalars['String']['output'];
    notes?: Maybe<Scalars['String']['output']>;
    packed: Scalars['Boolean']['output'];
    position: Scalars['Int']['output'];
    quantity: Scalars['Int']['output'];
    tripId: Scalars['ID']['output'];
    tripPackingItemId: Scalars['ID']['output'];
    updatedAt: Scalars['DateTime']['output'];
}

export type GqlSTripPackingItemInput = {
    category: Scalars['String']['input'];
    label: Scalars['String']['input'];
    notes?: InputMaybe<Scalars['String']['input']>;
    packed?: InputMaybe<Scalars['Boolean']['input']>;
    position?: InputMaybe<Scalars['Int']['input']>;
    quantity?: InputMaybe<Scalars['Int']['input']>;
    tripId: Scalars['ID']['input'];
    tripPackingItemId?: InputMaybe<Scalars['ID']['input']>;
};

export type GqlSTripStatus = 'active' | 'cancelled' | 'completed' | 'draft' | 'planned';

export interface GqlSUser {
    __typename?: 'User';
    admin?: Maybe<GqlSAdmin>;
    name: Scalars['String']['output'];
    userId: Scalars['ID']['output'];
}

export type GqlSUserCreate = {
    name: Scalars['String']['input'];
};

export interface GqlSUserMutation {
    __typename?: 'UserMutation';
    userSessionTerminateMany: GqlSMutationResult;
    userUpdate: GqlSMutationResult;
}

export type GqlSUserMutationUserSessionTerminateManyArgs = {
    sessionIds: Array<Scalars['ID']['input']>;
};

export type GqlSUserMutationUserUpdateArgs = {
    user: GqlSUserUpdate;
};

export type GqlSUserUpdate = {
    name: Scalars['String']['input'];
};

export interface GqlSVisitorChatQuota {
    __typename?: 'VisitorChatQuota';
    limit: Scalars['Int']['output'];
    resetsAt?: Maybe<Scalars['DateTime']['output']>;
    used: Scalars['Int']['output'];
}

export interface GqlSYoutubeChannelResult {
    __typename?: 'YoutubeChannelResult';
    avatarUrl?: Maybe<Scalars['String']['output']>;
    canonicalUrl: Scalars['String']['output'];
    channelId: Scalars['String']['output'];
    description?: Maybe<Scalars['String']['output']>;
    handle?: Maybe<Scalars['String']['output']>;
    subscriberCount?: Maybe<Scalars['Int']['output']>;
    title: Scalars['String']['output'];
}

export type WithIndex<TObject> = TObject & Record<string, any>;
export type ResolversObject<TObject> = WithIndex<TObject>;

export type ResolverTypeWrapper<T> = Promise<T> | T;

export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
    resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<
    TResult,
    TParent = Record<PropertyKey, never>,
    TContext = Record<PropertyKey, never>,
    TArgs = Record<PropertyKey, never>,
> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
    parent: TParent,
    args: TArgs,
    context: TContext,
    info: GraphQLResolveInfo,
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
    parent: TParent,
    args: TArgs,
    context: TContext,
    info: GraphQLResolveInfo,
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
    parent: TParent,
    args: TArgs,
    context: TContext,
    info: GraphQLResolveInfo,
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
    subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
    resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
    subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
    resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
    SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs> | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<
    TResult,
    TKey extends string,
    TParent = Record<PropertyKey, never>,
    TContext = Record<PropertyKey, never>,
    TArgs = Record<PropertyKey, never>,
> =
    | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
    | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (
    parent: TParent,
    context: TContext,
    info: GraphQLResolveInfo,
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (
    obj: T,
    context: TContext,
    info: GraphQLResolveInfo,
) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<
    TResult = Record<PropertyKey, never>,
    TParent = Record<PropertyKey, never>,
    TContext = Record<PropertyKey, never>,
    TArgs = Record<PropertyKey, never>,
> = (
    next: NextResolverFn<TResult>,
    parent: TParent,
    args: TArgs,
    context: TContext,
    info: GraphQLResolveInfo,
) => TResult | Promise<TResult>;

/** Mapping of union types */
export type GqlSResolversUnionTypes<_RefType extends Record<string, unknown>> = ResolversObject<{
    ChatAssistantInput:
        | GqlSChatAssistantInputBoolean
        | GqlSChatAssistantInputDate
        | GqlSChatAssistantInputDateRange
        | GqlSChatAssistantInputDateTime
        | GqlSChatAssistantInputMultiSelect
        | GqlSChatAssistantInputOtp
        | GqlSChatAssistantInputSingleSelect
        | GqlSChatAssistantInputText
        | GqlSChatAssistantInputTime;
    ChatAssistantInputValue:
        | GqlSChatAssistantInputValueBoolean
        | GqlSChatAssistantInputValueDate
        | GqlSChatAssistantInputValueDateRange
        | GqlSChatAssistantInputValueDateTime
        | GqlSChatAssistantInputValueString
        | GqlSChatAssistantInputValueStringList
        | GqlSChatAssistantInputValueTime;
    ChatMessage:
        | (Omit<GqlSChatMessageAssistantInputCollection, 'inputs'> & { inputs: Array<_RefType['ChatAssistantInput']> })
        | GqlSChatMessageAssistantText
        | GqlSChatMessageToolApprovalRequest
        | GqlSChatMessageToolApprovalResponse
        | GqlSChatMessageToolCall
        | (Omit<GqlSChatMessageUser, 'author'> & { author?: Maybe<_RefType['User']> })
        | (Omit<GqlSChatMessageUserInput, 'answers' | 'author'> & {
              answers: Array<_RefType['ChatMessageUserInputAnswer']>;
              author?: Maybe<_RefType['User']>;
          });
    ChatUpdate:
        | GqlSChatUpdateAssistantTextChunk
        | (Omit<GqlSChatUpdateMessageAppended, 'message'> & { message: _RefType['ChatMessage'] })
        | GqlSChatUpdateTurnEnded;
    CompassInterviewUpdate:
        GqlSCompassInterviewUpdateAssistantTextChunk | GqlSCompassInterviewUpdateMessageAppended | GqlSCompassInterviewUpdateTurnEnded;
}>;

/** Mapping between all available schema types and the resolvers types */
export type GqlSResolversTypes = ResolversObject<{
    Admin: ResolverTypeWrapper<
        Omit<GqlSAdmin, 'adminChatFindMany' | 'adminChatFindOne' | 'adminPublicChatFindMany' | 'adminPublicChatFindOne'> & {
            adminChatFindMany: Array<GqlSResolversTypes['Chat']>;
            adminChatFindOne: GqlSResolversTypes['Chat'];
            adminPublicChatFindMany: Array<GqlSResolversTypes['Chat']>;
            adminPublicChatFindOne: GqlSResolversTypes['Chat'];
        }
    >;
    AdminChatConfig: ResolverTypeWrapper<GqlSAdminChatConfig>;
    AdminChatModel: ResolverTypeWrapper<GqlSAdminChatModel>;
    AdminCompass: ResolverTypeWrapper<GqlSAdminCompass>;
    AdminFinancesQuery: ResolverTypeWrapper<GqlSAdminFinancesQuery>;
    AdminInventoryQuery: ResolverTypeWrapper<GqlSAdminInventoryQuery>;
    AdminMediaQuery: ResolverTypeWrapper<GqlSAdminMediaQuery>;
    AdminMedicalQuery: ResolverTypeWrapper<GqlSAdminMedicalQuery>;
    AdminMutation: ResolverTypeWrapper<GqlSAdminMutation>;
    AdminTravelQuery: ResolverTypeWrapper<GqlSAdminTravelQuery>;
    Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
    Chat: ResolverTypeWrapper<Omit<GqlSChat, 'messages'> & { messages: Array<GqlSResolversTypes['ChatMessage']> }>;
    ChatAssistantInput: ResolverTypeWrapper<GqlSResolversUnionTypes<GqlSResolversTypes>['ChatAssistantInput']>;
    ChatAssistantInputBoolean: ResolverTypeWrapper<GqlSChatAssistantInputBoolean>;
    ChatAssistantInputDate: ResolverTypeWrapper<GqlSChatAssistantInputDate>;
    ChatAssistantInputDateRange: ResolverTypeWrapper<GqlSChatAssistantInputDateRange>;
    ChatAssistantInputDateTime: ResolverTypeWrapper<GqlSChatAssistantInputDateTime>;
    ChatAssistantInputMultiSelect: ResolverTypeWrapper<GqlSChatAssistantInputMultiSelect>;
    ChatAssistantInputOtp: ResolverTypeWrapper<GqlSChatAssistantInputOtp>;
    ChatAssistantInputSingleSelect: ResolverTypeWrapper<GqlSChatAssistantInputSingleSelect>;
    ChatAssistantInputText: ResolverTypeWrapper<GqlSChatAssistantInputText>;
    ChatAssistantInputTime: ResolverTypeWrapper<GqlSChatAssistantInputTime>;
    ChatAssistantInputValue: ResolverTypeWrapper<GqlSResolversUnionTypes<GqlSResolversTypes>['ChatAssistantInputValue']>;
    ChatAssistantInputValueBoolean: ResolverTypeWrapper<GqlSChatAssistantInputValueBoolean>;
    ChatAssistantInputValueDate: ResolverTypeWrapper<GqlSChatAssistantInputValueDate>;
    ChatAssistantInputValueDateRange: ResolverTypeWrapper<GqlSChatAssistantInputValueDateRange>;
    ChatAssistantInputValueDateTime: ResolverTypeWrapper<GqlSChatAssistantInputValueDateTime>;
    ChatAssistantInputValueKind: GqlSChatAssistantInputValueKind;
    ChatAssistantInputValueString: ResolverTypeWrapper<GqlSChatAssistantInputValueString>;
    ChatAssistantInputValueStringList: ResolverTypeWrapper<GqlSChatAssistantInputValueStringList>;
    ChatAssistantInputValueTime: ResolverTypeWrapper<GqlSChatAssistantInputValueTime>;
    ChatAssistantOptions: GqlSChatAssistantOptions;
    ChatMessage: ResolverTypeWrapper<GqlSResolversUnionTypes<GqlSResolversTypes>['ChatMessage']>;
    ChatMessageAssistantInputCollection: ResolverTypeWrapper<
        Omit<GqlSChatMessageAssistantInputCollection, 'inputs'> & { inputs: Array<GqlSResolversTypes['ChatAssistantInput']> }
    >;
    ChatMessageAssistantText: ResolverTypeWrapper<GqlSChatMessageAssistantText>;
    ChatMessageCreateResult: ResolverTypeWrapper<GqlSChatMessageCreateResult>;
    ChatMessageGeneration: ResolverTypeWrapper<GqlSChatMessageGeneration>;
    ChatMessageToolApprovalRequest: ResolverTypeWrapper<GqlSChatMessageToolApprovalRequest>;
    ChatMessageToolApprovalResponse: ResolverTypeWrapper<GqlSChatMessageToolApprovalResponse>;
    ChatMessageToolCall: ResolverTypeWrapper<GqlSChatMessageToolCall>;
    ChatMessageUser: ResolverTypeWrapper<Omit<GqlSChatMessageUser, 'author'> & { author?: Maybe<GqlSResolversTypes['User']> }>;
    ChatMessageUserInput: ResolverTypeWrapper<
        Omit<GqlSChatMessageUserInput, 'answers' | 'author'> & {
            answers: Array<GqlSResolversTypes['ChatMessageUserInputAnswer']>;
            author?: Maybe<GqlSResolversTypes['User']>;
        }
    >;
    ChatMessageUserInputAnswer: ResolverTypeWrapper<
        Omit<GqlSChatMessageUserInputAnswer, 'value'> & { value: GqlSResolversTypes['ChatAssistantInputValue'] }
    >;
    ChatMessageUserInputAnswerCreate: GqlSChatMessageUserInputAnswerCreate;
    ChatUpdate: ResolverTypeWrapper<GqlSResolversUnionTypes<GqlSResolversTypes>['ChatUpdate']>;
    ChatUpdateAssistantTextChunk: ResolverTypeWrapper<GqlSChatUpdateAssistantTextChunk>;
    ChatUpdateMessageAppended: ResolverTypeWrapper<
        Omit<GqlSChatUpdateMessageAppended, 'message'> & { message: GqlSResolversTypes['ChatMessage'] }
    >;
    ChatUpdateTurnEnded: ResolverTypeWrapper<GqlSChatUpdateTurnEnded>;
    CompassInterview: ResolverTypeWrapper<GqlSCompassInterview>;
    CompassInterviewEndReason: GqlSCompassInterviewEndReason;
    CompassInterviewMessage: ResolverTypeWrapper<GqlSCompassInterviewMessage>;
    CompassInterviewMessageRole: GqlSCompassInterviewMessageRole;
    CompassInterviewStatus: GqlSCompassInterviewStatus;
    CompassInterviewTopic: GqlSCompassInterviewTopic;
    CompassInterviewTriggerReason: GqlSCompassInterviewTriggerReason;
    CompassInterviewUpdate: ResolverTypeWrapper<GqlSResolversUnionTypes<GqlSResolversTypes>['CompassInterviewUpdate']>;
    CompassInterviewUpdateAssistantTextChunk: ResolverTypeWrapper<GqlSCompassInterviewUpdateAssistantTextChunk>;
    CompassInterviewUpdateMessageAppended: ResolverTypeWrapper<GqlSCompassInterviewUpdateMessageAppended>;
    CompassInterviewUpdateTurnEnded: ResolverTypeWrapper<GqlSCompassInterviewUpdateTurnEnded>;
    CompassObservation: ResolverTypeWrapper<GqlSCompassObservation>;
    CompassObservationCategory: GqlSCompassObservationCategory;
    CvEducation: ResolverTypeWrapper<GqlSCvEducation>;
    CvEducationInput: GqlSCvEducationInput;
    CvExperience: ResolverTypeWrapper<GqlSCvExperience>;
    CvExperienceInput: GqlSCvExperienceInput;
    CvHobby: ResolverTypeWrapper<GqlSCvHobby>;
    CvHobbyInput: GqlSCvHobbyInput;
    CvQuery: ResolverTypeWrapper<GqlSCvQuery>;
    CvSkill: ResolverTypeWrapper<GqlSCvSkill>;
    CvSkillCategory: GqlSCvSkillCategory;
    CvSkillInput: GqlSCvSkillInput;
    Date: ResolverTypeWrapper<Scalars['Date']['output']>;
    DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
    FileUpload: ResolverTypeWrapper<GqlSFileUpload>;
    FinanceCadence: GqlSFinanceCadence;
    FinanceRecurringCost: ResolverTypeWrapper<GqlSFinanceRecurringCost>;
    FinanceRecurringCostCategory: GqlSFinanceRecurringCostCategory;
    FinanceRecurringCostInput: GqlSFinanceRecurringCostInput;
    ID: ResolverTypeWrapper<Scalars['ID']['output']>;
    Int: ResolverTypeWrapper<Scalars['Int']['output']>;
    Item: ResolverTypeWrapper<GqlSItem>;
    ItemCategory: GqlSItemCategory;
    ItemCondition: GqlSItemCondition;
    ItemDisposalState: GqlSItemDisposalState;
    ItemFile: ResolverTypeWrapper<GqlSItemFile>;
    ItemFileAttachInput: GqlSItemFileAttachInput;
    ItemFileKind: GqlSItemFileKind;
    ItemFileUpsert: GqlSItemFileUpsert;
    ItemInput: GqlSItemInput;
    ItemRepriceInput: GqlSItemRepriceInput;
    ItemServiceEntry: ResolverTypeWrapper<GqlSItemServiceEntry>;
    ItemServiceEntryInput: GqlSItemServiceEntryInput;
    ItemServiceKind: GqlSItemServiceKind;
    ItemValuation: ResolverTypeWrapper<GqlSItemValuation>;
    JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
    Log: ResolverTypeWrapper<GqlSLog>;
    LogLevel: GqlSLogLevel;
    MediaChannel: ResolverTypeWrapper<GqlSMediaChannel>;
    MediaChannelInput: GqlSMediaChannelInput;
    MediaPlatform: GqlSMediaPlatform;
    MediaTopic: GqlSMediaTopic;
    MedicalAppointment: ResolverTypeWrapper<GqlSMedicalAppointment>;
    MedicalAppointmentInput: GqlSMedicalAppointmentInput;
    MedicalAppointmentStatus: GqlSMedicalAppointmentStatus;
    MedicalCategory: GqlSMedicalCategory;
    MedicalCategoryOverview: ResolverTypeWrapper<GqlSMedicalCategoryOverview>;
    MedicalRecord: ResolverTypeWrapper<GqlSMedicalRecord>;
    MedicalRecordFile: ResolverTypeWrapper<GqlSMedicalRecordFile>;
    MedicalRecordFileAttachInput: GqlSMedicalRecordFileAttachInput;
    MedicalRecordInput: GqlSMedicalRecordInput;
    MedicalRecordSeverity: GqlSMedicalRecordSeverity;
    Movie: ResolverTypeWrapper<GqlSMovie>;
    MovieAddFromTmdbInput: GqlSMovieAddFromTmdbInput;
    MovieInput: GqlSMovieInput;
    MovieStatus: GqlSMovieStatus;
    Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
    MutationResult: ResolverTypeWrapper<GqlSMutationResult>;
    Project: ResolverTypeWrapper<GqlSProject>;
    ProjectActivity: ResolverTypeWrapper<GqlSProjectActivity>;
    ProjectActivityChannel: GqlSProjectActivityChannel;
    ProjectActivityCreate: GqlSProjectActivityCreate;
    ProjectActivityDirection: GqlSProjectActivityDirection;
    ProjectActivityKind: GqlSProjectActivityKind;
    ProjectCreate: GqlSProjectCreate;
    ProjectFile: ResolverTypeWrapper<GqlSProjectFile>;
    ProjectFileKind: GqlSProjectFileKind;
    ProjectFileUpsert: GqlSProjectFileUpsert;
    ProjectLink: ResolverTypeWrapper<GqlSProjectLink>;
    ProjectLinkKind: GqlSProjectLinkKind;
    ProjectLinkUpsert: GqlSProjectLinkUpsert;
    ProjectOfferStatus: GqlSProjectOfferStatus;
    ProjectRequest: ResolverTypeWrapper<GqlSProjectRequest>;
    ProjectRequestStatus: GqlSProjectRequestStatus;
    ProjectRequestType: GqlSProjectRequestType;
    ProjectStatus: GqlSProjectStatus;
    ProjectTimerStartInput: GqlSProjectTimerStartInput;
    Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
    Session: ResolverTypeWrapper<
        Omit<GqlSSession, 'user' | 'visitorChatFindMany' | 'visitorChatFindOne'> & {
            user?: Maybe<GqlSResolversTypes['User']>;
            visitorChatFindMany: Array<GqlSResolversTypes['Chat']>;
            visitorChatFindOne: GqlSResolversTypes['Chat'];
        }
    >;
    Show: ResolverTypeWrapper<GqlSShow>;
    ShowAddFromTmdbInput: GqlSShowAddFromTmdbInput;
    ShowInput: GqlSShowInput;
    String: ResolverTypeWrapper<Scalars['String']['output']>;
    Subscription: ResolverTypeWrapper<Record<PropertyKey, never>>;
    Task: ResolverTypeWrapper<GqlSTask>;
    TaskCreate: GqlSTaskCreate;
    TaskEffort: GqlSTaskEffort;
    TaskStatus: GqlSTaskStatus;
    TaskWhenBucket: GqlSTaskWhenBucket;
    TmdbMovieResult: ResolverTypeWrapper<GqlSTmdbMovieResult>;
    TmdbTvResult: ResolverTypeWrapper<GqlSTmdbTvResult>;
    TransportMode: GqlSTransportMode;
    Trip: ResolverTypeWrapper<GqlSTrip>;
    TripActivity: ResolverTypeWrapper<GqlSTripActivity>;
    TripActivityInput: GqlSTripActivityInput;
    TripDay: ResolverTypeWrapper<GqlSTripDay>;
    TripDayInput: GqlSTripDayInput;
    TripInput: GqlSTripInput;
    TripPackingItem: ResolverTypeWrapper<GqlSTripPackingItem>;
    TripPackingItemInput: GqlSTripPackingItemInput;
    TripStatus: GqlSTripStatus;
    User: ResolverTypeWrapper<Omit<GqlSUser, 'admin'> & { admin?: Maybe<GqlSResolversTypes['Admin']> }>;
    UserCreate: GqlSUserCreate;
    UserMutation: ResolverTypeWrapper<GqlSUserMutation>;
    UserUpdate: GqlSUserUpdate;
    VisitorChatQuota: ResolverTypeWrapper<GqlSVisitorChatQuota>;
    YoutubeChannelResult: ResolverTypeWrapper<GqlSYoutubeChannelResult>;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type GqlSResolversParentTypes = ResolversObject<{
    Admin: Omit<GqlSAdmin, 'adminChatFindMany' | 'adminChatFindOne' | 'adminPublicChatFindMany' | 'adminPublicChatFindOne'> & {
        adminChatFindMany: Array<GqlSResolversParentTypes['Chat']>;
        adminChatFindOne: GqlSResolversParentTypes['Chat'];
        adminPublicChatFindMany: Array<GqlSResolversParentTypes['Chat']>;
        adminPublicChatFindOne: GqlSResolversParentTypes['Chat'];
    };
    AdminChatConfig: GqlSAdminChatConfig;
    AdminChatModel: GqlSAdminChatModel;
    AdminCompass: GqlSAdminCompass;
    AdminFinancesQuery: GqlSAdminFinancesQuery;
    AdminInventoryQuery: GqlSAdminInventoryQuery;
    AdminMediaQuery: GqlSAdminMediaQuery;
    AdminMedicalQuery: GqlSAdminMedicalQuery;
    AdminMutation: GqlSAdminMutation;
    AdminTravelQuery: GqlSAdminTravelQuery;
    Boolean: Scalars['Boolean']['output'];
    Chat: Omit<GqlSChat, 'messages'> & { messages: Array<GqlSResolversParentTypes['ChatMessage']> };
    ChatAssistantInput: GqlSResolversUnionTypes<GqlSResolversParentTypes>['ChatAssistantInput'];
    ChatAssistantInputBoolean: GqlSChatAssistantInputBoolean;
    ChatAssistantInputDate: GqlSChatAssistantInputDate;
    ChatAssistantInputDateRange: GqlSChatAssistantInputDateRange;
    ChatAssistantInputDateTime: GqlSChatAssistantInputDateTime;
    ChatAssistantInputMultiSelect: GqlSChatAssistantInputMultiSelect;
    ChatAssistantInputOtp: GqlSChatAssistantInputOtp;
    ChatAssistantInputSingleSelect: GqlSChatAssistantInputSingleSelect;
    ChatAssistantInputText: GqlSChatAssistantInputText;
    ChatAssistantInputTime: GqlSChatAssistantInputTime;
    ChatAssistantInputValue: GqlSResolversUnionTypes<GqlSResolversParentTypes>['ChatAssistantInputValue'];
    ChatAssistantInputValueBoolean: GqlSChatAssistantInputValueBoolean;
    ChatAssistantInputValueDate: GqlSChatAssistantInputValueDate;
    ChatAssistantInputValueDateRange: GqlSChatAssistantInputValueDateRange;
    ChatAssistantInputValueDateTime: GqlSChatAssistantInputValueDateTime;
    ChatAssistantInputValueString: GqlSChatAssistantInputValueString;
    ChatAssistantInputValueStringList: GqlSChatAssistantInputValueStringList;
    ChatAssistantInputValueTime: GqlSChatAssistantInputValueTime;
    ChatAssistantOptions: GqlSChatAssistantOptions;
    ChatMessage: GqlSResolversUnionTypes<GqlSResolversParentTypes>['ChatMessage'];
    ChatMessageAssistantInputCollection: Omit<GqlSChatMessageAssistantInputCollection, 'inputs'> & {
        inputs: Array<GqlSResolversParentTypes['ChatAssistantInput']>;
    };
    ChatMessageAssistantText: GqlSChatMessageAssistantText;
    ChatMessageCreateResult: GqlSChatMessageCreateResult;
    ChatMessageGeneration: GqlSChatMessageGeneration;
    ChatMessageToolApprovalRequest: GqlSChatMessageToolApprovalRequest;
    ChatMessageToolApprovalResponse: GqlSChatMessageToolApprovalResponse;
    ChatMessageToolCall: GqlSChatMessageToolCall;
    ChatMessageUser: Omit<GqlSChatMessageUser, 'author'> & { author?: Maybe<GqlSResolversParentTypes['User']> };
    ChatMessageUserInput: Omit<GqlSChatMessageUserInput, 'answers' | 'author'> & {
        answers: Array<GqlSResolversParentTypes['ChatMessageUserInputAnswer']>;
        author?: Maybe<GqlSResolversParentTypes['User']>;
    };
    ChatMessageUserInputAnswer: Omit<GqlSChatMessageUserInputAnswer, 'value'> & {
        value: GqlSResolversParentTypes['ChatAssistantInputValue'];
    };
    ChatMessageUserInputAnswerCreate: GqlSChatMessageUserInputAnswerCreate;
    ChatUpdate: GqlSResolversUnionTypes<GqlSResolversParentTypes>['ChatUpdate'];
    ChatUpdateAssistantTextChunk: GqlSChatUpdateAssistantTextChunk;
    ChatUpdateMessageAppended: Omit<GqlSChatUpdateMessageAppended, 'message'> & { message: GqlSResolversParentTypes['ChatMessage'] };
    ChatUpdateTurnEnded: GqlSChatUpdateTurnEnded;
    CompassInterview: GqlSCompassInterview;
    CompassInterviewMessage: GqlSCompassInterviewMessage;
    CompassInterviewUpdate: GqlSResolversUnionTypes<GqlSResolversParentTypes>['CompassInterviewUpdate'];
    CompassInterviewUpdateAssistantTextChunk: GqlSCompassInterviewUpdateAssistantTextChunk;
    CompassInterviewUpdateMessageAppended: GqlSCompassInterviewUpdateMessageAppended;
    CompassInterviewUpdateTurnEnded: GqlSCompassInterviewUpdateTurnEnded;
    CompassObservation: GqlSCompassObservation;
    CvEducation: GqlSCvEducation;
    CvEducationInput: GqlSCvEducationInput;
    CvExperience: GqlSCvExperience;
    CvExperienceInput: GqlSCvExperienceInput;
    CvHobby: GqlSCvHobby;
    CvHobbyInput: GqlSCvHobbyInput;
    CvQuery: GqlSCvQuery;
    CvSkill: GqlSCvSkill;
    CvSkillInput: GqlSCvSkillInput;
    Date: Scalars['Date']['output'];
    DateTime: Scalars['DateTime']['output'];
    FileUpload: GqlSFileUpload;
    FinanceRecurringCost: GqlSFinanceRecurringCost;
    FinanceRecurringCostInput: GqlSFinanceRecurringCostInput;
    ID: Scalars['ID']['output'];
    Int: Scalars['Int']['output'];
    Item: GqlSItem;
    ItemFile: GqlSItemFile;
    ItemFileAttachInput: GqlSItemFileAttachInput;
    ItemFileUpsert: GqlSItemFileUpsert;
    ItemInput: GqlSItemInput;
    ItemRepriceInput: GqlSItemRepriceInput;
    ItemServiceEntry: GqlSItemServiceEntry;
    ItemServiceEntryInput: GqlSItemServiceEntryInput;
    ItemValuation: GqlSItemValuation;
    JSON: Scalars['JSON']['output'];
    Log: GqlSLog;
    MediaChannel: GqlSMediaChannel;
    MediaChannelInput: GqlSMediaChannelInput;
    MedicalAppointment: GqlSMedicalAppointment;
    MedicalAppointmentInput: GqlSMedicalAppointmentInput;
    MedicalCategoryOverview: GqlSMedicalCategoryOverview;
    MedicalRecord: GqlSMedicalRecord;
    MedicalRecordFile: GqlSMedicalRecordFile;
    MedicalRecordFileAttachInput: GqlSMedicalRecordFileAttachInput;
    MedicalRecordInput: GqlSMedicalRecordInput;
    Movie: GqlSMovie;
    MovieAddFromTmdbInput: GqlSMovieAddFromTmdbInput;
    MovieInput: GqlSMovieInput;
    Mutation: Record<PropertyKey, never>;
    MutationResult: GqlSMutationResult;
    Project: GqlSProject;
    ProjectActivity: GqlSProjectActivity;
    ProjectActivityCreate: GqlSProjectActivityCreate;
    ProjectCreate: GqlSProjectCreate;
    ProjectFile: GqlSProjectFile;
    ProjectFileUpsert: GqlSProjectFileUpsert;
    ProjectLink: GqlSProjectLink;
    ProjectLinkUpsert: GqlSProjectLinkUpsert;
    ProjectRequest: GqlSProjectRequest;
    ProjectTimerStartInput: GqlSProjectTimerStartInput;
    Query: Record<PropertyKey, never>;
    Session: Omit<GqlSSession, 'user' | 'visitorChatFindMany' | 'visitorChatFindOne'> & {
        user?: Maybe<GqlSResolversParentTypes['User']>;
        visitorChatFindMany: Array<GqlSResolversParentTypes['Chat']>;
        visitorChatFindOne: GqlSResolversParentTypes['Chat'];
    };
    Show: GqlSShow;
    ShowAddFromTmdbInput: GqlSShowAddFromTmdbInput;
    ShowInput: GqlSShowInput;
    String: Scalars['String']['output'];
    Subscription: Record<PropertyKey, never>;
    Task: GqlSTask;
    TaskCreate: GqlSTaskCreate;
    TmdbMovieResult: GqlSTmdbMovieResult;
    TmdbTvResult: GqlSTmdbTvResult;
    Trip: GqlSTrip;
    TripActivity: GqlSTripActivity;
    TripActivityInput: GqlSTripActivityInput;
    TripDay: GqlSTripDay;
    TripDayInput: GqlSTripDayInput;
    TripInput: GqlSTripInput;
    TripPackingItem: GqlSTripPackingItem;
    TripPackingItemInput: GqlSTripPackingItemInput;
    User: Omit<GqlSUser, 'admin'> & { admin?: Maybe<GqlSResolversParentTypes['Admin']> };
    UserCreate: GqlSUserCreate;
    UserMutation: GqlSUserMutation;
    UserUpdate: GqlSUserUpdate;
    VisitorChatQuota: GqlSVisitorChatQuota;
    YoutubeChannelResult: GqlSYoutubeChannelResult;
}>;

export type GqlSAdminResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['Admin'] = GqlSResolversParentTypes['Admin'],
> = ResolversObject<{
    adminChatConfigFindOne?: Resolver<GqlSResolversTypes['AdminChatConfig'], ParentType, ContextType>;
    adminChatCount?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType, Partial<GqlSAdminAdminChatCountArgs>>;
    adminChatFindMany?: Resolver<Array<GqlSResolversTypes['Chat']>, ParentType, ContextType, Partial<GqlSAdminAdminChatFindManyArgs>>;
    adminChatFindOne?: Resolver<
        GqlSResolversTypes['Chat'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminAdminChatFindOneArgs, 'chatId'>
    >;
    adminCompassFindOne?: Resolver<GqlSResolversTypes['AdminCompass'], ParentType, ContextType>;
    adminCvFindOne?: Resolver<GqlSResolversTypes['CvQuery'], ParentType, ContextType>;
    adminFinancesFindOne?: Resolver<GqlSResolversTypes['AdminFinancesQuery'], ParentType, ContextType>;
    adminInventoryFindOne?: Resolver<GqlSResolversTypes['AdminInventoryQuery'], ParentType, ContextType>;
    adminLogFindMany?: Resolver<Array<GqlSResolversTypes['Log']>, ParentType, ContextType, Partial<GqlSAdminAdminLogFindManyArgs>>;
    adminMediaFindOne?: Resolver<GqlSResolversTypes['AdminMediaQuery'], ParentType, ContextType>;
    adminMedicalFindOne?: Resolver<GqlSResolversTypes['AdminMedicalQuery'], ParentType, ContextType>;
    adminProjectActiveTimerFindOne?: Resolver<Maybe<GqlSResolversTypes['ProjectActivity']>, ParentType, ContextType>;
    adminProjectFindMany?: Resolver<
        Array<GqlSResolversTypes['Project']>,
        ParentType,
        ContextType,
        Partial<GqlSAdminAdminProjectFindManyArgs>
    >;
    adminProjectFindOne?: Resolver<
        GqlSResolversTypes['Project'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminAdminProjectFindOneArgs, 'projectId'>
    >;
    adminProjectRequestFindMany?: Resolver<
        Array<GqlSResolversTypes['ProjectRequest']>,
        ParentType,
        ContextType,
        Partial<GqlSAdminAdminProjectRequestFindManyArgs>
    >;
    adminProjectRequestInboxCount?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    adminPublicChatFindMany?: Resolver<Array<GqlSResolversTypes['Chat']>, ParentType, ContextType>;
    adminPublicChatFindOne?: Resolver<
        GqlSResolversTypes['Chat'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminAdminPublicChatFindOneArgs, 'chatId'>
    >;
    adminStandaloneTaskFindMany?: Resolver<Array<GqlSResolversTypes['Task']>, ParentType, ContextType>;
    adminStandaloneTaskOpenCount?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    adminTravelFindOne?: Resolver<GqlSResolversTypes['AdminTravelQuery'], ParentType, ContextType>;
}>;

export type GqlSAdminChatConfigResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminChatConfig'] = GqlSResolversParentTypes['AdminChatConfig'],
> = ResolversObject<{
    availableModels?: Resolver<Array<GqlSResolversTypes['AdminChatModel']>, ParentType, ContextType>;
    defaultModelId?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
}>;

export type GqlSAdminChatModelResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminChatModel'] = GqlSResolversParentTypes['AdminChatModel'],
> = ResolversObject<{
    label?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    modelId?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    supportedMediaTypes?: Resolver<Array<GqlSResolversTypes['String']>, ParentType, ContextType>;
}>;

export type GqlSAdminCompassResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminCompass'] = GqlSResolversParentTypes['AdminCompass'],
> = ResolversObject<{
    adminCompassInterviewFindMany?: Resolver<Array<GqlSResolversTypes['CompassInterview']>, ParentType, ContextType>;
    adminCompassInterviewFindOne?: Resolver<
        Maybe<GqlSResolversTypes['CompassInterview']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminCompassAdminCompassInterviewFindOneArgs, 'interviewId'>
    >;
    adminCompassInterviewPendingFindOne?: Resolver<Maybe<GqlSResolversTypes['CompassInterview']>, ParentType, ContextType>;
    adminCompassObservationFindMany?: Resolver<
        Array<GqlSResolversTypes['CompassObservation']>,
        ParentType,
        ContextType,
        Partial<GqlSAdminCompassAdminCompassObservationFindManyArgs>
    >;
    observationsSinceSynthesis?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    prose?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    psychology?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    scheduledInterviewAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    scheduledInterviewReason?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    scheduledInterviewTopic?: Resolver<Maybe<GqlSResolversTypes['CompassInterviewTopic']>, ParentType, ContextType>;
    summary?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    synthesisInProgress?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    synthesisModelId?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    synthesizedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
}>;

export type GqlSAdminFinancesQueryResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminFinancesQuery'] = GqlSResolversParentTypes['AdminFinancesQuery'],
> = ResolversObject<{
    adminFinancesMonthlyExpensesCentsFindOne?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    adminFinancesMonthlyNetIncomeCentsFindOne?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    adminFinancesRecurringCostFindMany?: Resolver<Array<GqlSResolversTypes['FinanceRecurringCost']>, ParentType, ContextType>;
    adminFinancesYearlyExpensesCentsFindOne?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
}>;

export type GqlSAdminInventoryQueryResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminInventoryQuery'] = GqlSResolversParentTypes['AdminInventoryQuery'],
> = ResolversObject<{
    adminInventoryItemFindMany?: Resolver<
        Array<GqlSResolversTypes['Item']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminInventoryQueryAdminInventoryItemFindManyArgs, 'includeDisposed'>
    >;
    adminInventoryItemFindOne?: Resolver<
        Maybe<GqlSResolversTypes['Item']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminInventoryQueryAdminInventoryItemFindOneArgs, 'itemId'>
    >;
    adminInventoryItemUpcomingWarrantyFindMany?: Resolver<
        Array<GqlSResolversTypes['Item']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminInventoryQueryAdminInventoryItemUpcomingWarrantyFindManyArgs, 'withinDays'>
    >;
    adminInventoryMaterialNetWorthCentsFindOne?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
}>;

export type GqlSAdminMediaQueryResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminMediaQuery'] = GqlSResolversParentTypes['AdminMediaQuery'],
> = ResolversObject<{
    adminMediaChannelFindMany?: Resolver<
        Array<GqlSResolversTypes['MediaChannel']>,
        ParentType,
        ContextType,
        Partial<GqlSAdminMediaQueryAdminMediaChannelFindManyArgs>
    >;
    adminMediaMovieFindMany?: Resolver<Array<GqlSResolversTypes['Movie']>, ParentType, ContextType>;
    adminMediaShowFindMany?: Resolver<Array<GqlSResolversTypes['Show']>, ParentType, ContextType>;
    adminMediaTmdbFindMany?: Resolver<
        Array<GqlSResolversTypes['TmdbMovieResult']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMediaQueryAdminMediaTmdbFindManyArgs, 'query'>
    >;
    adminMediaTmdbTvFindMany?: Resolver<
        Array<GqlSResolversTypes['TmdbTvResult']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMediaQueryAdminMediaTmdbTvFindManyArgs, 'query'>
    >;
    adminMediaYoutubeFindMany?: Resolver<
        Array<GqlSResolversTypes['YoutubeChannelResult']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMediaQueryAdminMediaYoutubeFindManyArgs, 'query'>
    >;
}>;

export type GqlSAdminMedicalQueryResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminMedicalQuery'] = GqlSResolversParentTypes['AdminMedicalQuery'],
> = ResolversObject<{
    adminMedicalAppointmentFindMany?: Resolver<Array<GqlSResolversTypes['MedicalAppointment']>, ParentType, ContextType>;
    adminMedicalCategoryOverviewFindMany?: Resolver<Array<GqlSResolversTypes['MedicalCategoryOverview']>, ParentType, ContextType>;
    adminMedicalRecordFindMany?: Resolver<Array<GqlSResolversTypes['MedicalRecord']>, ParentType, ContextType>;
}>;

export type GqlSAdminMutationResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminMutation'] = GqlSResolversParentTypes['AdminMutation'],
> = ResolversObject<{
    chatConfigDefaultModelSet?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationChatConfigDefaultModelSetArgs, 'modelId'>
    >;
    chatInputCollectionRespond?: Resolver<
        Maybe<GqlSResolversTypes['ChatMessageCreateResult']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationChatInputCollectionRespondArgs, 'answers' | 'assistantOptions' | 'collectionMessageId'>
    >;
    chatMessageCreate?: Resolver<
        Maybe<GqlSResolversTypes['ChatMessageCreateResult']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationChatMessageCreateArgs, 'assistantOptions' | 'message'>
    >;
    chatToolApprovalRespond?: Resolver<
        Maybe<GqlSResolversTypes['ChatMessageCreateResult']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationChatToolApprovalRespondArgs, 'approvalId' | 'approved' | 'assistantOptions'>
    >;
    compassInterviewEnd?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationCompassInterviewEndArgs, 'interviewId'>
    >;
    compassInterviewMessageSend?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationCompassInterviewMessageSendArgs, 'content' | 'interviewId'>
    >;
    compassInterviewSkip?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationCompassInterviewSkipArgs, 'interviewId'>
    >;
    compassInterviewStart?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationCompassInterviewStartArgs, 'interviewId'>
    >;
    compassInterviewStartNow?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        Partial<GqlSAdminMutationCompassInterviewStartNowArgs>
    >;
    compassObservationDismiss?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationCompassObservationDismissArgs, 'observationId'>
    >;
    compassScheduledInterviewDismiss?: Resolver<GqlSResolversTypes['MutationResult'], ParentType, ContextType>;
    compassSynthesizeRequest?: Resolver<GqlSResolversTypes['MutationResult'], ParentType, ContextType>;
    cvEducationReorder?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationCvEducationReorderArgs, 'orderedIds'>
    >;
    cvEducationsDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationCvEducationsDeleteArgs, 'cvEducationIds'>
    >;
    cvEducationsUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationCvEducationsUpsertArgs, 'cvEducations'>
    >;
    cvExperiencesDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationCvExperiencesDeleteArgs, 'cvExperienceIds'>
    >;
    cvExperiencesUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationCvExperiencesUpsertArgs, 'cvExperiences'>
    >;
    cvHobbiesDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationCvHobbiesDeleteArgs, 'cvHobbyIds'>
    >;
    cvHobbiesUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationCvHobbiesUpsertArgs, 'cvHobbies'>
    >;
    cvHobbyReorder?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationCvHobbyReorderArgs, 'orderedIds'>
    >;
    cvSkillReorder?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationCvSkillReorderArgs, 'orderedIds'>
    >;
    cvSkillsDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationCvSkillsDeleteArgs, 'cvSkillIds'>
    >;
    cvSkillsUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationCvSkillsUpsertArgs, 'cvSkills'>
    >;
    financeMonthlyNetIncomeSet?: Resolver<
        GqlSResolversTypes['AdminFinancesQuery'],
        ParentType,
        ContextType,
        Partial<GqlSAdminMutationFinanceMonthlyNetIncomeSetArgs>
    >;
    financeRecurringCostDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationFinanceRecurringCostDeleteArgs, 'costId'>
    >;
    financeRecurringCostUpsert?: Resolver<
        GqlSResolversTypes['FinanceRecurringCost'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationFinanceRecurringCostUpsertArgs, 'input'>
    >;
    itemFilesAttach?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationItemFilesAttachArgs, 'inputs'>
    >;
    itemFilesDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationItemFilesDeleteArgs, 'itemFileIds'>
    >;
    itemFilesUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationItemFilesUpsertArgs, 'itemFiles'>
    >;
    itemServiceEntriesDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationItemServiceEntriesDeleteArgs, 'serviceEntryIds'>
    >;
    itemServiceEntriesUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationItemServiceEntriesUpsertArgs, 'itemServiceEntries'>
    >;
    itemsDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationItemsDeleteArgs, 'itemIds'>
    >;
    itemsReprice?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationItemsRepriceArgs, 'inputs'>
    >;
    itemsUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationItemsUpsertArgs, 'items'>
    >;
    mediaChannelReorder?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationMediaChannelReorderArgs, 'orderedIds'>
    >;
    mediaChannelsDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationMediaChannelsDeleteArgs, 'channelIds'>
    >;
    mediaChannelsUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationMediaChannelsUpsertArgs, 'mediaChannels'>
    >;
    medicalAppointmentsDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationMedicalAppointmentsDeleteArgs, 'appointmentIds'>
    >;
    medicalAppointmentsUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationMedicalAppointmentsUpsertArgs, 'medicalAppointments'>
    >;
    medicalRecordFilesAttach?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationMedicalRecordFilesAttachArgs, 'inputs'>
    >;
    medicalRecordFilesDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationMedicalRecordFilesDeleteArgs, 'recordFileIds'>
    >;
    medicalRecordsDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationMedicalRecordsDeleteArgs, 'recordIds'>
    >;
    medicalRecordsUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationMedicalRecordsUpsertArgs, 'medicalRecords'>
    >;
    moviesAddFromTmdb?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationMoviesAddFromTmdbArgs, 'inputs'>
    >;
    moviesDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationMoviesDeleteArgs, 'movieIds'>
    >;
    moviesUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationMoviesUpsertArgs, 'movies'>
    >;
    projectActivitiesDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationProjectActivitiesDeleteArgs, 'activityIds'>
    >;
    projectActivitiesUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationProjectActivitiesUpsertArgs, 'projectActivities'>
    >;
    projectFilesDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationProjectFilesDeleteArgs, 'projectFileIds'>
    >;
    projectFilesUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationProjectFilesUpsertArgs, 'projectFiles'>
    >;
    projectLinksDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationProjectLinksDeleteArgs, 'projectLinkIds'>
    >;
    projectLinksUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationProjectLinksUpsertArgs, 'projectLinks'>
    >;
    projectReorder?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationProjectReorderArgs, 'orderedIds'>
    >;
    projectRequestArchive?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationProjectRequestArchiveArgs, 'projectRequestId'>
    >;
    projectRequestDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationProjectRequestDeleteArgs, 'projectRequestId'>
    >;
    projectTimersStart?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationProjectTimersStartArgs, 'inputs'>
    >;
    projectTimersStop?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationProjectTimersStopArgs, 'activityIds'>
    >;
    projectsDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationProjectsDeleteArgs, 'projectIds'>
    >;
    projectsUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationProjectsUpsertArgs, 'projects'>
    >;
    showsAddFromTmdb?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationShowsAddFromTmdbArgs, 'inputs'>
    >;
    showsDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationShowsDeleteArgs, 'showIds'>
    >;
    showsUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationShowsUpsertArgs, 'shows'>
    >;
    taskReorder?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationTaskReorderArgs, 'orderedIds'>
    >;
    tasksDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationTasksDeleteArgs, 'taskIds'>
    >;
    tasksUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationTasksUpsertArgs, 'tasks'>
    >;
    tripActivitiesDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationTripActivitiesDeleteArgs, 'tripActivityIds'>
    >;
    tripActivitiesUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationTripActivitiesUpsertArgs, 'tripActivities'>
    >;
    tripDaysDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationTripDaysDeleteArgs, 'tripDayIds'>
    >;
    tripDaysUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationTripDaysUpsertArgs, 'tripDays'>
    >;
    tripPackingItemsDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationTripPackingItemsDeleteArgs, 'tripPackingItemIds'>
    >;
    tripPackingItemsUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationTripPackingItemsUpsertArgs, 'tripPackingItems'>
    >;
    tripsDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationTripsDeleteArgs, 'tripIds'>
    >;
    tripsUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationTripsUpsertArgs, 'trips'>
    >;
}>;

export type GqlSAdminTravelQueryResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminTravelQuery'] = GqlSResolversParentTypes['AdminTravelQuery'],
> = ResolversObject<{
    adminTravelTripFindMany?: Resolver<Array<GqlSResolversTypes['Trip']>, ParentType, ContextType>;
    adminTravelTripFindOne?: Resolver<
        Maybe<GqlSResolversTypes['Trip']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminTravelQueryAdminTravelTripFindOneArgs, 'tripId'>
    >;
}>;

export type GqlSChatResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['Chat'] = GqlSResolversParentTypes['Chat'],
> = ResolversObject<{
    chatId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    lastModifiedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    messages?: Resolver<Array<GqlSResolversTypes['ChatMessage']>, ParentType, ContextType>;
    title?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
}>;

export type GqlSChatAssistantInputResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatAssistantInput'] = GqlSResolversParentTypes['ChatAssistantInput'],
> = ResolversObject<{
    __resolveType: TypeResolveFn<
        | 'ChatAssistantInputBoolean'
        | 'ChatAssistantInputDate'
        | 'ChatAssistantInputDateRange'
        | 'ChatAssistantInputDateTime'
        | 'ChatAssistantInputMultiSelect'
        | 'ChatAssistantInputOtp'
        | 'ChatAssistantInputSingleSelect'
        | 'ChatAssistantInputText'
        | 'ChatAssistantInputTime',
        ParentType,
        ContextType
    >;
}>;

export type GqlSChatAssistantInputBooleanResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatAssistantInputBoolean'] = GqlSResolversParentTypes['ChatAssistantInputBoolean'],
> = ResolversObject<{
    inputId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    prompt?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSChatAssistantInputDateResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatAssistantInputDate'] = GqlSResolversParentTypes['ChatAssistantInputDate'],
> = ResolversObject<{
    inputId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    prompt?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSChatAssistantInputDateRangeResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatAssistantInputDateRange'] = GqlSResolversParentTypes['ChatAssistantInputDateRange'],
> = ResolversObject<{
    inputId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    prompt?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSChatAssistantInputDateTimeResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatAssistantInputDateTime'] = GqlSResolversParentTypes['ChatAssistantInputDateTime'],
> = ResolversObject<{
    inputId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    prompt?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSChatAssistantInputMultiSelectResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatAssistantInputMultiSelect'] =
        GqlSResolversParentTypes['ChatAssistantInputMultiSelect'],
> = ResolversObject<{
    inputId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    options?: Resolver<Array<GqlSResolversTypes['String']>, ParentType, ContextType>;
    prompt?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSChatAssistantInputOtpResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatAssistantInputOtp'] = GqlSResolversParentTypes['ChatAssistantInputOtp'],
> = ResolversObject<{
    inputId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    prompt?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSChatAssistantInputSingleSelectResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatAssistantInputSingleSelect'] =
        GqlSResolversParentTypes['ChatAssistantInputSingleSelect'],
> = ResolversObject<{
    inputId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    options?: Resolver<Array<GqlSResolversTypes['String']>, ParentType, ContextType>;
    prompt?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSChatAssistantInputTextResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatAssistantInputText'] = GqlSResolversParentTypes['ChatAssistantInputText'],
> = ResolversObject<{
    inputId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    prompt?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSChatAssistantInputTimeResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatAssistantInputTime'] = GqlSResolversParentTypes['ChatAssistantInputTime'],
> = ResolversObject<{
    inputId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    prompt?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSChatAssistantInputValueResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatAssistantInputValue'] = GqlSResolversParentTypes['ChatAssistantInputValue'],
> = ResolversObject<{
    __resolveType: TypeResolveFn<
        | 'ChatAssistantInputValueBoolean'
        | 'ChatAssistantInputValueDate'
        | 'ChatAssistantInputValueDateRange'
        | 'ChatAssistantInputValueDateTime'
        | 'ChatAssistantInputValueString'
        | 'ChatAssistantInputValueStringList'
        | 'ChatAssistantInputValueTime',
        ParentType,
        ContextType
    >;
}>;

export type GqlSChatAssistantInputValueBooleanResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatAssistantInputValueBoolean'] =
        GqlSResolversParentTypes['ChatAssistantInputValueBoolean'],
> = ResolversObject<{
    boolean?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSChatAssistantInputValueDateResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatAssistantInputValueDate'] = GqlSResolversParentTypes['ChatAssistantInputValueDate'],
> = ResolversObject<{
    date?: Resolver<GqlSResolversTypes['Date'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSChatAssistantInputValueDateRangeResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatAssistantInputValueDateRange'] =
        GqlSResolversParentTypes['ChatAssistantInputValueDateRange'],
> = ResolversObject<{
    from?: Resolver<GqlSResolversTypes['Date'], ParentType, ContextType>;
    to?: Resolver<GqlSResolversTypes['Date'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSChatAssistantInputValueDateTimeResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatAssistantInputValueDateTime'] =
        GqlSResolversParentTypes['ChatAssistantInputValueDateTime'],
> = ResolversObject<{
    dateTime?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSChatAssistantInputValueStringResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatAssistantInputValueString'] =
        GqlSResolversParentTypes['ChatAssistantInputValueString'],
> = ResolversObject<{
    value?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSChatAssistantInputValueStringListResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatAssistantInputValueStringList'] =
        GqlSResolversParentTypes['ChatAssistantInputValueStringList'],
> = ResolversObject<{
    values?: Resolver<Array<GqlSResolversTypes['String']>, ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSChatAssistantInputValueTimeResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatAssistantInputValueTime'] = GqlSResolversParentTypes['ChatAssistantInputValueTime'],
> = ResolversObject<{
    time?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSChatMessageResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatMessage'] = GqlSResolversParentTypes['ChatMessage'],
> = ResolversObject<{
    __resolveType: TypeResolveFn<
        | 'ChatMessageAssistantInputCollection'
        | 'ChatMessageAssistantText'
        | 'ChatMessageToolApprovalRequest'
        | 'ChatMessageToolApprovalResponse'
        | 'ChatMessageToolCall'
        | 'ChatMessageUser'
        | 'ChatMessageUserInput',
        ParentType,
        ContextType
    >;
}>;

export type GqlSChatMessageAssistantInputCollectionResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatMessageAssistantInputCollection'] =
        GqlSResolversParentTypes['ChatMessageAssistantInputCollection'],
> = ResolversObject<{
    chatMessageId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    generation?: Resolver<Maybe<GqlSResolversTypes['ChatMessageGeneration']>, ParentType, ContextType>;
    inputs?: Resolver<Array<GqlSResolversTypes['ChatAssistantInput']>, ParentType, ContextType>;
    mode?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    prompt?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSChatMessageAssistantTextResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatMessageAssistantText'] = GqlSResolversParentTypes['ChatMessageAssistantText'],
> = ResolversObject<{
    body?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    chatMessageId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    generation?: Resolver<Maybe<GqlSResolversTypes['ChatMessageGeneration']>, ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSChatMessageCreateResultResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatMessageCreateResult'] = GqlSResolversParentTypes['ChatMessageCreateResult'],
> = ResolversObject<{
    chatId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    chatMessageId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
}>;

export type GqlSChatMessageGenerationResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatMessageGeneration'] = GqlSResolversParentTypes['ChatMessageGeneration'],
> = ResolversObject<{
    cachedInputTokens?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    inputTokens?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    modelId?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    outputTokens?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    reasoningTokens?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    totalTokens?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
}>;

export type GqlSChatMessageToolApprovalRequestResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatMessageToolApprovalRequest'] =
        GqlSResolversParentTypes['ChatMessageToolApprovalRequest'],
> = ResolversObject<{
    approvalId?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    args?: Resolver<GqlSResolversTypes['JSON'], ParentType, ContextType>;
    chatMessageId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    generation?: Resolver<Maybe<GqlSResolversTypes['ChatMessageGeneration']>, ParentType, ContextType>;
    toolName?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSChatMessageToolApprovalResponseResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatMessageToolApprovalResponse'] =
        GqlSResolversParentTypes['ChatMessageToolApprovalResponse'],
> = ResolversObject<{
    approvalId?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    approved?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    chatMessageId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    reason?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSChatMessageToolCallResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatMessageToolCall'] = GqlSResolversParentTypes['ChatMessageToolCall'],
> = ResolversObject<{
    args?: Resolver<GqlSResolversTypes['JSON'], ParentType, ContextType>;
    chatMessageId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    generation?: Resolver<Maybe<GqlSResolversTypes['ChatMessageGeneration']>, ParentType, ContextType>;
    parentChatMessageId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    toolName?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSChatMessageUserResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatMessageUser'] = GqlSResolversParentTypes['ChatMessageUser'],
> = ResolversObject<{
    attachments?: Resolver<Array<GqlSResolversTypes['FileUpload']>, ParentType, ContextType>;
    author?: Resolver<Maybe<GqlSResolversTypes['User']>, ParentType, ContextType>;
    body?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    chatMessageId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    compassObservations?: Resolver<Array<GqlSResolversTypes['CompassObservation']>, ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSChatMessageUserInputResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatMessageUserInput'] = GqlSResolversParentTypes['ChatMessageUserInput'],
> = ResolversObject<{
    answers?: Resolver<Array<GqlSResolversTypes['ChatMessageUserInputAnswer']>, ParentType, ContextType>;
    author?: Resolver<Maybe<GqlSResolversTypes['User']>, ParentType, ContextType>;
    chatMessageId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    collectionMessageId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSChatMessageUserInputAnswerResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatMessageUserInputAnswer'] = GqlSResolversParentTypes['ChatMessageUserInputAnswer'],
> = ResolversObject<{
    inputId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    value?: Resolver<GqlSResolversTypes['ChatAssistantInputValue'], ParentType, ContextType>;
}>;

export type GqlSChatUpdateResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatUpdate'] = GqlSResolversParentTypes['ChatUpdate'],
> = ResolversObject<{
    __resolveType: TypeResolveFn<
        'ChatUpdateAssistantTextChunk' | 'ChatUpdateMessageAppended' | 'ChatUpdateTurnEnded',
        ParentType,
        ContextType
    >;
}>;

export type GqlSChatUpdateAssistantTextChunkResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatUpdateAssistantTextChunk'] = GqlSResolversParentTypes['ChatUpdateAssistantTextChunk'],
> = ResolversObject<{
    chatMessageId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    delta?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSChatUpdateMessageAppendedResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatUpdateMessageAppended'] = GqlSResolversParentTypes['ChatUpdateMessageAppended'],
> = ResolversObject<{
    message?: Resolver<GqlSResolversTypes['ChatMessage'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSChatUpdateTurnEndedResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatUpdateTurnEnded'] = GqlSResolversParentTypes['ChatUpdateTurnEnded'],
> = ResolversObject<{
    generationId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSCompassInterviewResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['CompassInterview'] = GqlSResolversParentTypes['CompassInterview'],
> = ResolversObject<{
    completedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    dueAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    endReason?: Resolver<Maybe<GqlSResolversTypes['CompassInterviewEndReason']>, ParentType, ContextType>;
    interviewId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    messages?: Resolver<Array<GqlSResolversTypes['CompassInterviewMessage']>, ParentType, ContextType>;
    observationCount?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    startedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    status?: Resolver<GqlSResolversTypes['CompassInterviewStatus'], ParentType, ContextType>;
    topic?: Resolver<GqlSResolversTypes['CompassInterviewTopic'], ParentType, ContextType>;
    triggerReason?: Resolver<GqlSResolversTypes['CompassInterviewTriggerReason'], ParentType, ContextType>;
}>;

export type GqlSCompassInterviewMessageResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['CompassInterviewMessage'] = GqlSResolversParentTypes['CompassInterviewMessage'],
> = ResolversObject<{
    content?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    interviewMessageId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    modelId?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    role?: Resolver<GqlSResolversTypes['CompassInterviewMessageRole'], ParentType, ContextType>;
}>;

export type GqlSCompassInterviewUpdateResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['CompassInterviewUpdate'] = GqlSResolversParentTypes['CompassInterviewUpdate'],
> = ResolversObject<{
    __resolveType: TypeResolveFn<
        'CompassInterviewUpdateAssistantTextChunk' | 'CompassInterviewUpdateMessageAppended' | 'CompassInterviewUpdateTurnEnded',
        ParentType,
        ContextType
    >;
}>;

export type GqlSCompassInterviewUpdateAssistantTextChunkResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['CompassInterviewUpdateAssistantTextChunk'] =
        GqlSResolversParentTypes['CompassInterviewUpdateAssistantTextChunk'],
> = ResolversObject<{
    delta?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    interviewMessageId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSCompassInterviewUpdateMessageAppendedResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['CompassInterviewUpdateMessageAppended'] =
        GqlSResolversParentTypes['CompassInterviewUpdateMessageAppended'],
> = ResolversObject<{
    message?: Resolver<GqlSResolversTypes['CompassInterviewMessage'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSCompassInterviewUpdateTurnEndedResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['CompassInterviewUpdateTurnEnded'] =
        GqlSResolversParentTypes['CompassInterviewUpdateTurnEnded'],
> = ResolversObject<{
    concluded?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    generationId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSCompassObservationResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['CompassObservation'] = GqlSResolversParentTypes['CompassObservation'],
> = ResolversObject<{
    analyzerModelId?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    category?: Resolver<GqlSResolversTypes['CompassObservationCategory'], ParentType, ContextType>;
    confidence?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    content?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    dismissedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    observationId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    sourceChatId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    sourceChatMessageId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    sourceInterviewId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    sourceInterviewMessageId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
}>;

export type GqlSCvEducationResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['CvEducation'] = GqlSResolversParentTypes['CvEducation'],
> = ResolversObject<{
    cvEducationId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    degreeDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    degreeEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    endDate?: Resolver<GqlSResolversTypes['Date'], ParentType, ContextType>;
    institution?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    notesDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    notesEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    position?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    startDate?: Resolver<Maybe<GqlSResolversTypes['Date']>, ParentType, ContextType>;
    subjectDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    subjectEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
}>;

export type GqlSCvExperienceResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['CvExperience'] = GqlSResolversParentTypes['CvExperience'],
> = ResolversObject<{
    company?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    cvExperienceId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    descriptionDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    descriptionEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    endDate?: Resolver<Maybe<GqlSResolversTypes['Date']>, ParentType, ContextType>;
    managerName?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    roleDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    roleEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    startDate?: Resolver<GqlSResolversTypes['Date'], ParentType, ContextType>;
    technologies?: Resolver<Array<GqlSResolversTypes['String']>, ParentType, ContextType>;
}>;

export type GqlSCvHobbyResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['CvHobby'] = GqlSResolversParentTypes['CvHobby'],
> = ResolversObject<{
    cvHobbyId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    position?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    since?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    textDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    textEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
}>;

export type GqlSCvQueryResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['CvQuery'] = GqlSResolversParentTypes['CvQuery'],
> = ResolversObject<{
    publicCvEducationFindMany?: Resolver<Array<GqlSResolversTypes['CvEducation']>, ParentType, ContextType>;
    publicCvExperienceFindMany?: Resolver<Array<GqlSResolversTypes['CvExperience']>, ParentType, ContextType>;
    publicCvHobbyFindMany?: Resolver<Array<GqlSResolversTypes['CvHobby']>, ParentType, ContextType>;
    publicCvSkillFindMany?: Resolver<Array<GqlSResolversTypes['CvSkill']>, ParentType, ContextType>;
}>;

export type GqlSCvSkillResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['CvSkill'] = GqlSResolversParentTypes['CvSkill'],
> = ResolversObject<{
    category?: Resolver<GqlSResolversTypes['CvSkillCategory'], ParentType, ContextType>;
    cvSkillId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    label?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    position?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
}>;

export interface GqlSDateScalarConfig extends GraphQLScalarTypeConfig<GqlSResolversTypes['Date'], any> {
    name: 'Date';
}

export interface GqlSDateTimeScalarConfig extends GraphQLScalarTypeConfig<GqlSResolversTypes['DateTime'], any> {
    name: 'DateTime';
}

export type GqlSFileUploadResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['FileUpload'] = GqlSResolversParentTypes['FileUpload'],
> = ResolversObject<{
    fileUploadId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    filename?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    mediaType?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    size?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    url?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
}>;

export type GqlSFinanceRecurringCostResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['FinanceRecurringCost'] = GqlSResolversParentTypes['FinanceRecurringCost'],
> = ResolversObject<{
    active?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    amountCents?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    cadence?: Resolver<GqlSResolversTypes['FinanceCadence'], ParentType, ContextType>;
    categoryKey?: Resolver<GqlSResolversTypes['FinanceRecurringCostCategory'], ParentType, ContextType>;
    costId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    currency?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    endsOn?: Resolver<Maybe<GqlSResolversTypes['Date']>, ParentType, ContextType>;
    name?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    notes?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    startsOn?: Resolver<Maybe<GqlSResolversTypes['Date']>, ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSItemResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['Item'] = GqlSResolversParentTypes['Item'],
> = ResolversObject<{
    brand?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    categoryKey?: Resolver<GqlSResolversTypes['ItemCategory'], ParentType, ContextType>;
    condition?: Resolver<Maybe<GqlSResolversTypes['ItemCondition']>, ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    currentValueCents?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    disposalState?: Resolver<GqlSResolversTypes['ItemDisposalState'], ParentType, ContextType>;
    disposedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    files?: Resolver<Array<GqlSResolversTypes['ItemFile']>, ParentType, ContextType>;
    itemId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    model?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    name?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    notes?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    purchasePriceCents?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    purchasedAt?: Resolver<Maybe<GqlSResolversTypes['Date']>, ParentType, ContextType>;
    serialNumber?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    serviceEntries?: Resolver<Array<GqlSResolversTypes['ItemServiceEntry']>, ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    valuations?: Resolver<Array<GqlSResolversTypes['ItemValuation']>, ParentType, ContextType>;
    warrantyEndsAt?: Resolver<Maybe<GqlSResolversTypes['Date']>, ParentType, ContextType>;
    warrantyNotes?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    warrantyProvider?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
}>;

export type GqlSItemFileResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ItemFile'] = GqlSResolversParentTypes['ItemFile'],
> = ResolversObject<{
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    fileUpload?: Resolver<GqlSResolversTypes['FileUpload'], ParentType, ContextType>;
    itemFileId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    itemId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    kind?: Resolver<GqlSResolversTypes['ItemFileKind'], ParentType, ContextType>;
    label?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    pinned?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    serviceEntryId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSItemServiceEntryResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ItemServiceEntry'] = GqlSResolversParentTypes['ItemServiceEntry'],
> = ResolversObject<{
    costCents?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    files?: Resolver<Array<GqlSResolversTypes['ItemFile']>, ParentType, ContextType>;
    kind?: Resolver<GqlSResolversTypes['ItemServiceKind'], ParentType, ContextType>;
    nextDueAt?: Resolver<Maybe<GqlSResolversTypes['Date']>, ParentType, ContextType>;
    notes?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    performedAt?: Resolver<GqlSResolversTypes['Date'], ParentType, ContextType>;
    serviceEntryId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    vendor?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
}>;

export type GqlSItemValuationResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ItemValuation'] = GqlSResolversParentTypes['ItemValuation'],
> = ResolversObject<{
    note?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    valuationId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    valueCents?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    valuedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export interface GqlSJsonScalarConfig extends GraphQLScalarTypeConfig<GqlSResolversTypes['JSON'], any> {
    name: 'JSON';
}

export type GqlSLogResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['Log'] = GqlSResolversParentTypes['Log'],
> = ResolversObject<{
    context?: Resolver<Maybe<GqlSResolversTypes['JSON']>, ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    level?: Resolver<GqlSResolversTypes['LogLevel'], ParentType, ContextType>;
    logId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    message?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    sessionId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
}>;

export type GqlSMediaChannelResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['MediaChannel'] = GqlSResolversParentTypes['MediaChannel'],
> = ResolversObject<{
    avatarUrl?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    channelId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    description?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    handle?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    name?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    notes?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    platform?: Resolver<GqlSResolversTypes['MediaPlatform'], ParentType, ContextType>;
    priority?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    topics?: Resolver<Array<GqlSResolversTypes['String']>, ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    url?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
}>;

export type GqlSMedicalAppointmentResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['MedicalAppointment'] = GqlSResolversParentTypes['MedicalAppointment'],
> = ResolversObject<{
    appointmentId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    category?: Resolver<GqlSResolversTypes['MedicalCategory'], ParentType, ContextType>;
    completedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    nextDueAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    notes?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    providerName?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    scheduledAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    status?: Resolver<GqlSResolversTypes['MedicalAppointmentStatus'], ParentType, ContextType>;
    title?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    topics?: Resolver<Array<GqlSResolversTypes['String']>, ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSMedicalCategoryOverviewResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['MedicalCategoryOverview'] = GqlSResolversParentTypes['MedicalCategoryOverview'],
> = ResolversObject<{
    category?: Resolver<GqlSResolversTypes['MedicalCategory'], ParentType, ContextType>;
    defaultCadenceMonths?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    isOverdue?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    lastCompletedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    nextDueAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    recentRecords?: Resolver<Array<GqlSResolversTypes['MedicalRecord']>, ParentType, ContextType>;
    upcoming?: Resolver<Array<GqlSResolversTypes['MedicalAppointment']>, ParentType, ContextType>;
}>;

export type GqlSMedicalRecordResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['MedicalRecord'] = GqlSResolversParentTypes['MedicalRecord'],
> = ResolversObject<{
    appointmentId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    bodyAreas?: Resolver<Array<GqlSResolversTypes['String']>, ParentType, ContextType>;
    category?: Resolver<GqlSResolversTypes['MedicalCategory'], ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    files?: Resolver<Array<GqlSResolversTypes['MedicalRecordFile']>, ParentType, ContextType>;
    occurredAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    recordId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    resolvedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    severity?: Resolver<Maybe<GqlSResolversTypes['MedicalRecordSeverity']>, ParentType, ContextType>;
    summary?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    symptoms?: Resolver<Array<GqlSResolversTypes['String']>, ParentType, ContextType>;
    title?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    topics?: Resolver<Array<GqlSResolversTypes['String']>, ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSMedicalRecordFileResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['MedicalRecordFile'] = GqlSResolversParentTypes['MedicalRecordFile'],
> = ResolversObject<{
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    fileUpload?: Resolver<GqlSResolversTypes['FileUpload'], ParentType, ContextType>;
    label?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    pinned?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    recordFileId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    recordId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSMovieResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['Movie'] = GqlSResolversParentTypes['Movie'],
> = ResolversObject<{
    backdropUrl?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    movieId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    notes?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    overview?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    posterUrl?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    rating?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    releaseDate?: Resolver<Maybe<GqlSResolversTypes['Date']>, ParentType, ContextType>;
    runtimeMinutes?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    status?: Resolver<GqlSResolversTypes['MovieStatus'], ParentType, ContextType>;
    title?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    tmdbId?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    topics?: Resolver<Array<GqlSResolversTypes['String']>, ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    watchedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
}>;

export type GqlSMutationResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['Mutation'] = GqlSResolversParentTypes['Mutation'],
> = ResolversObject<{
    admin?: Resolver<GqlSResolversTypes['AdminMutation'], ParentType, ContextType>;
    chatInputCollectionRespond?: Resolver<
        Maybe<GqlSResolversTypes['ChatMessageCreateResult']>,
        ParentType,
        ContextType,
        RequireFields<GqlSMutationChatInputCollectionRespondArgs, 'answers' | 'assistantOptions' | 'collectionMessageId'>
    >;
    chatMessageCreate?: Resolver<
        Maybe<GqlSResolversTypes['ChatMessageCreateResult']>,
        ParentType,
        ContextType,
        RequireFields<GqlSMutationChatMessageCreateArgs, 'assistantOptions' | 'message'>
    >;
    chatToolApprovalRespond?: Resolver<
        Maybe<GqlSResolversTypes['ChatMessageCreateResult']>,
        ParentType,
        ContextType,
        RequireFields<GqlSMutationChatToolApprovalRespondArgs, 'approvalId' | 'approved' | 'assistantOptions'>
    >;
    user?: Resolver<GqlSResolversTypes['UserMutation'], ParentType, ContextType>;
    userCreate?: Resolver<GqlSResolversTypes['MutationResult'], ParentType, ContextType, RequireFields<GqlSMutationUserCreateArgs, 'user'>>;
}>;

export type GqlSMutationResultResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['MutationResult'] = GqlSResolversParentTypes['MutationResult'],
> = ResolversObject<{
    referenceId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    referenceIds?: Resolver<Maybe<Array<GqlSResolversTypes['ID']>>, ParentType, ContextType>;
    success?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
}>;

export type GqlSProjectResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['Project'] = GqlSResolversParentTypes['Project'],
> = ResolversObject<{
    activities?: Resolver<Array<GqlSResolversTypes['ProjectActivity']>, ParentType, ContextType>;
    completedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    description?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    files?: Resolver<Array<GqlSResolversTypes['ProjectFile']>, ParentType, ContextType>;
    links?: Resolver<Array<GqlSResolversTypes['ProjectLink']>, ParentType, ContextType>;
    notes?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    position?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    projectId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    sourceRequest?: Resolver<Maybe<GqlSResolversTypes['ProjectRequest']>, ParentType, ContextType>;
    startedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    status?: Resolver<GqlSResolversTypes['ProjectStatus'], ParentType, ContextType>;
    tasks?: Resolver<Array<GqlSResolversTypes['Task']>, ParentType, ContextType>;
    title?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    totalWorkSec?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSProjectActivityResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ProjectActivity'] = GqlSResolversParentTypes['ProjectActivity'],
> = ResolversObject<{
    activityId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    amountCents?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    channel?: Resolver<Maybe<GqlSResolversTypes['ProjectActivityChannel']>, ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    direction?: Resolver<GqlSResolversTypes['ProjectActivityDirection'], ParentType, ContextType>;
    durationSec?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    endedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    files?: Resolver<Array<GqlSResolversTypes['ProjectFile']>, ParentType, ContextType>;
    kind?: Resolver<GqlSResolversTypes['ProjectActivityKind'], ParentType, ContextType>;
    links?: Resolver<Array<GqlSResolversTypes['ProjectLink']>, ParentType, ContextType>;
    notes?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    occurredAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    offerStatus?: Resolver<Maybe<GqlSResolversTypes['ProjectOfferStatus']>, ParentType, ContextType>;
    projectId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    startedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    taskId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    title?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSProjectFileResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ProjectFile'] = GqlSResolversParentTypes['ProjectFile'],
> = ResolversObject<{
    activityId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    fileUpload?: Resolver<GqlSResolversTypes['FileUpload'], ParentType, ContextType>;
    kind?: Resolver<GqlSResolversTypes['ProjectFileKind'], ParentType, ContextType>;
    label?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    pinned?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    projectFileId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    projectId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSProjectLinkResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ProjectLink'] = GqlSResolversParentTypes['ProjectLink'],
> = ResolversObject<{
    activityId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    kind?: Resolver<GqlSResolversTypes['ProjectLinkKind'], ParentType, ContextType>;
    label?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    pinned?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    projectId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    projectLinkId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    url?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
}>;

export type GqlSProjectRequestResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ProjectRequest'] = GqlSResolversParentTypes['ProjectRequest'],
> = ResolversObject<{
    budget?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    chatId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    company?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    convertedProject?: Resolver<Maybe<GqlSResolversTypes['Project']>, ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    description?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    email?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    name?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    projectRequestId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    projectType?: Resolver<GqlSResolversTypes['ProjectRequestType'], ParentType, ContextType>;
    status?: Resolver<GqlSResolversTypes['ProjectRequestStatus'], ParentType, ContextType>;
    timeline?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    verifiedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
}>;

export type GqlSQueryResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['Query'] = GqlSResolversParentTypes['Query'],
> = ResolversObject<{
    publicCvFindOne?: Resolver<GqlSResolversTypes['CvQuery'], ParentType, ContextType>;
    sessionFindOne?: Resolver<GqlSResolversTypes['Session'], ParentType, ContextType>;
}>;

export type GqlSSessionResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['Session'] = GqlSResolversParentTypes['Session'],
> = ResolversObject<{
    sessionId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    user?: Resolver<Maybe<GqlSResolversTypes['User']>, ParentType, ContextType>;
    visitorChatFindMany?: Resolver<Array<GqlSResolversTypes['Chat']>, ParentType, ContextType>;
    visitorChatFindOne?: Resolver<
        GqlSResolversTypes['Chat'],
        ParentType,
        ContextType,
        RequireFields<GqlSSessionVisitorChatFindOneArgs, 'chatId'>
    >;
    visitorChatQuotaFindOne?: Resolver<GqlSResolversTypes['VisitorChatQuota'], ParentType, ContextType>;
}>;

export type GqlSShowResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['Show'] = GqlSResolversParentTypes['Show'],
> = ResolversObject<{
    backdropUrl?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    firstAirDate?: Resolver<Maybe<GqlSResolversTypes['Date']>, ParentType, ContextType>;
    isCompleted?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    nextSeasonReleaseDate?: Resolver<Maybe<GqlSResolversTypes['Date']>, ParentType, ContextType>;
    nextSeasonReleaseRough?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    notes?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    overview?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    posterUrl?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    rating?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    showId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    status?: Resolver<GqlSResolversTypes['MovieStatus'], ParentType, ContextType>;
    title?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    tmdbId?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    topics?: Resolver<Array<GqlSResolversTypes['String']>, ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSSubscriptionResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['Subscription'] = GqlSResolversParentTypes['Subscription'],
> = ResolversObject<{
    chatUpdates?: SubscriptionResolver<
        GqlSResolversTypes['ChatUpdate'],
        'chatUpdates',
        ParentType,
        ContextType,
        RequireFields<GqlSSubscriptionChatUpdatesArgs, 'generationId'>
    >;
    compassInterviewUpdates?: SubscriptionResolver<
        GqlSResolversTypes['CompassInterviewUpdate'],
        'compassInterviewUpdates',
        ParentType,
        ContextType,
        RequireFields<GqlSSubscriptionCompassInterviewUpdatesArgs, 'generationId'>
    >;
    userUpdates?: SubscriptionResolver<GqlSResolversTypes['User'], 'userUpdates', ParentType, ContextType>;
}>;

export type GqlSTaskResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['Task'] = GqlSResolversParentTypes['Task'],
> = ResolversObject<{
    completedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    dueAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    effort?: Resolver<Maybe<GqlSResolversTypes['TaskEffort']>, ParentType, ContextType>;
    notes?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    position?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    projectId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    status?: Resolver<GqlSResolversTypes['TaskStatus'], ParentType, ContextType>;
    taskId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    title?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    whenBucket?: Resolver<Maybe<GqlSResolversTypes['TaskWhenBucket']>, ParentType, ContextType>;
}>;

export type GqlSTmdbMovieResultResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['TmdbMovieResult'] = GqlSResolversParentTypes['TmdbMovieResult'],
> = ResolversObject<{
    overview?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    posterUrl?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    releaseDate?: Resolver<Maybe<GqlSResolversTypes['Date']>, ParentType, ContextType>;
    title?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    tmdbId?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
}>;

export type GqlSTmdbTvResultResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['TmdbTvResult'] = GqlSResolversParentTypes['TmdbTvResult'],
> = ResolversObject<{
    firstAirDate?: Resolver<Maybe<GqlSResolversTypes['Date']>, ParentType, ContextType>;
    overview?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    posterUrl?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    title?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    tmdbId?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
}>;

export type GqlSTripResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['Trip'] = GqlSResolversParentTypes['Trip'],
> = ResolversObject<{
    accommodation?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    days?: Resolver<Array<GqlSResolversTypes['TripDay']>, ParentType, ContextType>;
    destination?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    endsOn?: Resolver<Maybe<GqlSResolversTypes['Date']>, ParentType, ContextType>;
    notes?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    packingItems?: Resolver<Array<GqlSResolversTypes['TripPackingItem']>, ParentType, ContextType>;
    startsOn?: Resolver<Maybe<GqlSResolversTypes['Date']>, ParentType, ContextType>;
    status?: Resolver<GqlSResolversTypes['TripStatus'], ParentType, ContextType>;
    title?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    transportMode?: Resolver<Maybe<GqlSResolversTypes['TransportMode']>, ParentType, ContextType>;
    tripId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSTripActivityResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['TripActivity'] = GqlSResolversParentTypes['TripActivity'],
> = ResolversObject<{
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    endsAt?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    location?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    notes?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    position?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    startsAt?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    title?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    tripActivityId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    tripDayId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    url?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
}>;

export type GqlSTripDayResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['TripDay'] = GqlSResolversParentTypes['TripDay'],
> = ResolversObject<{
    activities?: Resolver<Array<GqlSResolversTypes['TripActivity']>, ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    date?: Resolver<Maybe<GqlSResolversTypes['Date']>, ParentType, ContextType>;
    dayNumber?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    summary?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    title?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    tripDayId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    tripId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSTripPackingItemResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['TripPackingItem'] = GqlSResolversParentTypes['TripPackingItem'],
> = ResolversObject<{
    category?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    label?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    notes?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    packed?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    position?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    quantity?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    tripId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    tripPackingItemId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSUserResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['User'] = GqlSResolversParentTypes['User'],
> = ResolversObject<{
    admin?: Resolver<Maybe<GqlSResolversTypes['Admin']>, ParentType, ContextType>;
    name?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    userId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
}>;

export type GqlSUserMutationResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['UserMutation'] = GqlSResolversParentTypes['UserMutation'],
> = ResolversObject<{
    userSessionTerminateMany?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSUserMutationUserSessionTerminateManyArgs, 'sessionIds'>
    >;
    userUpdate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSUserMutationUserUpdateArgs, 'user'>
    >;
}>;

export type GqlSVisitorChatQuotaResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['VisitorChatQuota'] = GqlSResolversParentTypes['VisitorChatQuota'],
> = ResolversObject<{
    limit?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    resetsAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    used?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
}>;

export type GqlSYoutubeChannelResultResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['YoutubeChannelResult'] = GqlSResolversParentTypes['YoutubeChannelResult'],
> = ResolversObject<{
    avatarUrl?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    canonicalUrl?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    channelId?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    description?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    handle?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    subscriberCount?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    title?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
}>;

export type GqlSResolvers<ContextType = any> = ResolversObject<{
    Admin?: GqlSAdminResolvers<ContextType>;
    AdminChatConfig?: GqlSAdminChatConfigResolvers<ContextType>;
    AdminChatModel?: GqlSAdminChatModelResolvers<ContextType>;
    AdminCompass?: GqlSAdminCompassResolvers<ContextType>;
    AdminFinancesQuery?: GqlSAdminFinancesQueryResolvers<ContextType>;
    AdminInventoryQuery?: GqlSAdminInventoryQueryResolvers<ContextType>;
    AdminMediaQuery?: GqlSAdminMediaQueryResolvers<ContextType>;
    AdminMedicalQuery?: GqlSAdminMedicalQueryResolvers<ContextType>;
    AdminMutation?: GqlSAdminMutationResolvers<ContextType>;
    AdminTravelQuery?: GqlSAdminTravelQueryResolvers<ContextType>;
    Chat?: GqlSChatResolvers<ContextType>;
    ChatAssistantInput?: GqlSChatAssistantInputResolvers<ContextType>;
    ChatAssistantInputBoolean?: GqlSChatAssistantInputBooleanResolvers<ContextType>;
    ChatAssistantInputDate?: GqlSChatAssistantInputDateResolvers<ContextType>;
    ChatAssistantInputDateRange?: GqlSChatAssistantInputDateRangeResolvers<ContextType>;
    ChatAssistantInputDateTime?: GqlSChatAssistantInputDateTimeResolvers<ContextType>;
    ChatAssistantInputMultiSelect?: GqlSChatAssistantInputMultiSelectResolvers<ContextType>;
    ChatAssistantInputOtp?: GqlSChatAssistantInputOtpResolvers<ContextType>;
    ChatAssistantInputSingleSelect?: GqlSChatAssistantInputSingleSelectResolvers<ContextType>;
    ChatAssistantInputText?: GqlSChatAssistantInputTextResolvers<ContextType>;
    ChatAssistantInputTime?: GqlSChatAssistantInputTimeResolvers<ContextType>;
    ChatAssistantInputValue?: GqlSChatAssistantInputValueResolvers<ContextType>;
    ChatAssistantInputValueBoolean?: GqlSChatAssistantInputValueBooleanResolvers<ContextType>;
    ChatAssistantInputValueDate?: GqlSChatAssistantInputValueDateResolvers<ContextType>;
    ChatAssistantInputValueDateRange?: GqlSChatAssistantInputValueDateRangeResolvers<ContextType>;
    ChatAssistantInputValueDateTime?: GqlSChatAssistantInputValueDateTimeResolvers<ContextType>;
    ChatAssistantInputValueString?: GqlSChatAssistantInputValueStringResolvers<ContextType>;
    ChatAssistantInputValueStringList?: GqlSChatAssistantInputValueStringListResolvers<ContextType>;
    ChatAssistantInputValueTime?: GqlSChatAssistantInputValueTimeResolvers<ContextType>;
    ChatMessage?: GqlSChatMessageResolvers<ContextType>;
    ChatMessageAssistantInputCollection?: GqlSChatMessageAssistantInputCollectionResolvers<ContextType>;
    ChatMessageAssistantText?: GqlSChatMessageAssistantTextResolvers<ContextType>;
    ChatMessageCreateResult?: GqlSChatMessageCreateResultResolvers<ContextType>;
    ChatMessageGeneration?: GqlSChatMessageGenerationResolvers<ContextType>;
    ChatMessageToolApprovalRequest?: GqlSChatMessageToolApprovalRequestResolvers<ContextType>;
    ChatMessageToolApprovalResponse?: GqlSChatMessageToolApprovalResponseResolvers<ContextType>;
    ChatMessageToolCall?: GqlSChatMessageToolCallResolvers<ContextType>;
    ChatMessageUser?: GqlSChatMessageUserResolvers<ContextType>;
    ChatMessageUserInput?: GqlSChatMessageUserInputResolvers<ContextType>;
    ChatMessageUserInputAnswer?: GqlSChatMessageUserInputAnswerResolvers<ContextType>;
    ChatUpdate?: GqlSChatUpdateResolvers<ContextType>;
    ChatUpdateAssistantTextChunk?: GqlSChatUpdateAssistantTextChunkResolvers<ContextType>;
    ChatUpdateMessageAppended?: GqlSChatUpdateMessageAppendedResolvers<ContextType>;
    ChatUpdateTurnEnded?: GqlSChatUpdateTurnEndedResolvers<ContextType>;
    CompassInterview?: GqlSCompassInterviewResolvers<ContextType>;
    CompassInterviewMessage?: GqlSCompassInterviewMessageResolvers<ContextType>;
    CompassInterviewUpdate?: GqlSCompassInterviewUpdateResolvers<ContextType>;
    CompassInterviewUpdateAssistantTextChunk?: GqlSCompassInterviewUpdateAssistantTextChunkResolvers<ContextType>;
    CompassInterviewUpdateMessageAppended?: GqlSCompassInterviewUpdateMessageAppendedResolvers<ContextType>;
    CompassInterviewUpdateTurnEnded?: GqlSCompassInterviewUpdateTurnEndedResolvers<ContextType>;
    CompassObservation?: GqlSCompassObservationResolvers<ContextType>;
    CvEducation?: GqlSCvEducationResolvers<ContextType>;
    CvExperience?: GqlSCvExperienceResolvers<ContextType>;
    CvHobby?: GqlSCvHobbyResolvers<ContextType>;
    CvQuery?: GqlSCvQueryResolvers<ContextType>;
    CvSkill?: GqlSCvSkillResolvers<ContextType>;
    Date?: GraphQLScalarType;
    DateTime?: GraphQLScalarType;
    FileUpload?: GqlSFileUploadResolvers<ContextType>;
    FinanceRecurringCost?: GqlSFinanceRecurringCostResolvers<ContextType>;
    Item?: GqlSItemResolvers<ContextType>;
    ItemFile?: GqlSItemFileResolvers<ContextType>;
    ItemServiceEntry?: GqlSItemServiceEntryResolvers<ContextType>;
    ItemValuation?: GqlSItemValuationResolvers<ContextType>;
    JSON?: GraphQLScalarType;
    Log?: GqlSLogResolvers<ContextType>;
    MediaChannel?: GqlSMediaChannelResolvers<ContextType>;
    MedicalAppointment?: GqlSMedicalAppointmentResolvers<ContextType>;
    MedicalCategoryOverview?: GqlSMedicalCategoryOverviewResolvers<ContextType>;
    MedicalRecord?: GqlSMedicalRecordResolvers<ContextType>;
    MedicalRecordFile?: GqlSMedicalRecordFileResolvers<ContextType>;
    Movie?: GqlSMovieResolvers<ContextType>;
    Mutation?: GqlSMutationResolvers<ContextType>;
    MutationResult?: GqlSMutationResultResolvers<ContextType>;
    Project?: GqlSProjectResolvers<ContextType>;
    ProjectActivity?: GqlSProjectActivityResolvers<ContextType>;
    ProjectFile?: GqlSProjectFileResolvers<ContextType>;
    ProjectLink?: GqlSProjectLinkResolvers<ContextType>;
    ProjectRequest?: GqlSProjectRequestResolvers<ContextType>;
    Query?: GqlSQueryResolvers<ContextType>;
    Session?: GqlSSessionResolvers<ContextType>;
    Show?: GqlSShowResolvers<ContextType>;
    Subscription?: GqlSSubscriptionResolvers<ContextType>;
    Task?: GqlSTaskResolvers<ContextType>;
    TmdbMovieResult?: GqlSTmdbMovieResultResolvers<ContextType>;
    TmdbTvResult?: GqlSTmdbTvResultResolvers<ContextType>;
    Trip?: GqlSTripResolvers<ContextType>;
    TripActivity?: GqlSTripActivityResolvers<ContextType>;
    TripDay?: GqlSTripDayResolvers<ContextType>;
    TripPackingItem?: GqlSTripPackingItemResolvers<ContextType>;
    User?: GqlSUserResolvers<ContextType>;
    UserMutation?: GqlSUserMutationResolvers<ContextType>;
    VisitorChatQuota?: GqlSVisitorChatQuotaResolvers<ContextType>;
    YoutubeChannelResult?: GqlSYoutubeChannelResultResolvers<ContextType>;
}>;

type Properties<T> = {
    [K in keyof T]: z.ZodType<T[K], T[K] | undefined>;
};

type definedNonNullAny = {};

export const isDefinedNonNullAny = (v: any): v is definedNonNullAny => v !== undefined && v !== null;

export const definedNonNullAnySchema = z.any().refine((v) => isDefinedNonNullAny(v));

export const GqlSChatAssistantInputValueKindSchema: z.ZodType<
    'Boolean' | 'Date' | 'DateRange' | 'DateTime' | 'String' | 'StringList' | 'Time',
    'Boolean' | 'Date' | 'DateRange' | 'DateTime' | 'String' | 'StringList' | 'Time'
> = z.enum(['Boolean', 'Date', 'DateRange', 'DateTime', 'String', 'StringList', 'Time']);

export const GqlSCompassInterviewEndReasonSchema: z.ZodType<
    'agent_satisfied' | 'skipped' | 'user_ended',
    'agent_satisfied' | 'skipped' | 'user_ended'
> = z.enum(['agent_satisfied', 'skipped', 'user_ended']);

export const GqlSCompassInterviewMessageRoleSchema: z.ZodType<'assistant' | 'user', 'assistant' | 'user'> = z.enum(['assistant', 'user']);

export const GqlSCompassInterviewStatusSchema: z.ZodType<
    'completed' | 'in_progress' | 'pending' | 'skipped',
    'completed' | 'in_progress' | 'pending' | 'skipped'
> = z.enum(['completed', 'in_progress', 'pending', 'skipped']);

export const GqlSCompassInterviewTopicSchema: z.ZodType<
    'career' | 'fitness' | 'general' | 'health' | 'relationships' | 'stress',
    'career' | 'fitness' | 'general' | 'health' | 'relationships' | 'stress'
> = z.enum(['career', 'fitness', 'general', 'health', 'relationships', 'stress']);

export const GqlSCompassInterviewTriggerReasonSchema: z.ZodType<'manual' | 'scheduled', 'manual' | 'scheduled'> = z.enum([
    'manual',
    'scheduled',
]);

export const GqlSCompassObservationCategorySchema: z.ZodType<
    'behavioral' | 'factual' | 'psychological',
    'behavioral' | 'factual' | 'psychological'
> = z.enum(['behavioral', 'factual', 'psychological']);

export const GqlSCvSkillCategorySchema: z.ZodType<
    'capabilities' | 'frameworks' | 'languages' | 'services' | 'tools',
    'capabilities' | 'frameworks' | 'languages' | 'services' | 'tools'
> = z.enum(['capabilities', 'frameworks', 'languages', 'services', 'tools']);

export const GqlSFinanceCadenceSchema: z.ZodType<'monthly' | 'yearly', 'monthly' | 'yearly'> = z.enum(['monthly', 'yearly']);

export const GqlSFinanceRecurringCostCategorySchema: z.ZodType<
    'finance' | 'health' | 'housing' | 'insurance' | 'other' | 'subscriptions' | 'transport' | 'utilities',
    'finance' | 'health' | 'housing' | 'insurance' | 'other' | 'subscriptions' | 'transport' | 'utilities'
> = z.enum(['finance', 'health', 'housing', 'insurance', 'other', 'subscriptions', 'transport', 'utilities']);

export const GqlSItemCategorySchema: z.ZodType<
    'appliance' | 'clothing' | 'electronics' | 'furniture' | 'kitchen' | 'other' | 'sports' | 'tool' | 'vehicle',
    'appliance' | 'clothing' | 'electronics' | 'furniture' | 'kitchen' | 'other' | 'sports' | 'tool' | 'vehicle'
> = z.enum(['appliance', 'clothing', 'electronics', 'furniture', 'kitchen', 'other', 'sports', 'tool', 'vehicle']);

export const GqlSItemConditionSchema: z.ZodType<
    'fair' | 'good' | 'likeNew' | 'new' | 'poor',
    'fair' | 'good' | 'likeNew' | 'new' | 'poor'
> = z.enum(['fair', 'good', 'likeNew', 'new', 'poor']);

export const GqlSItemDisposalStateSchema: z.ZodType<
    'disposed' | 'gifted' | 'lost' | 'owned' | 'sold',
    'disposed' | 'gifted' | 'lost' | 'owned' | 'sold'
> = z.enum(['disposed', 'gifted', 'lost', 'owned', 'sold']);

export const GqlSItemFileKindSchema: z.ZodType<
    'invoice' | 'manual' | 'other' | 'photo' | 'receipt' | 'warranty',
    'invoice' | 'manual' | 'other' | 'photo' | 'receipt' | 'warranty'
> = z.enum(['invoice', 'manual', 'other', 'photo', 'receipt', 'warranty']);

export const GqlSItemServiceKindSchema: z.ZodType<
    'other' | 'repair' | 'replacement' | 'service',
    'other' | 'repair' | 'replacement' | 'service'
> = z.enum(['other', 'repair', 'replacement', 'service']);

export const GqlSLogLevelSchema: z.ZodType<'debug' | 'error' | 'info' | 'warn', 'debug' | 'error' | 'info' | 'warn'> = z.enum([
    'debug',
    'error',
    'info',
    'warn',
]);

export const GqlSMediaPlatformSchema: z.ZodType<'other' | 'podcast' | 'twitch' | 'youtube', 'other' | 'podcast' | 'twitch' | 'youtube'> =
    z.enum(['other', 'podcast', 'twitch', 'youtube']);

export const GqlSMediaTopicSchema: z.ZodType<
    | 'ai'
    | 'business'
    | 'comedy'
    | 'education'
    | 'entertainment'
    | 'finance'
    | 'gaming'
    | 'lifestyle'
    | 'movieCritic'
    | 'music'
    | 'news'
    | 'science'
    | 'software'
    | 'sports'
    | 'tech',
    | 'ai'
    | 'business'
    | 'comedy'
    | 'education'
    | 'entertainment'
    | 'finance'
    | 'gaming'
    | 'lifestyle'
    | 'movieCritic'
    | 'music'
    | 'news'
    | 'science'
    | 'software'
    | 'sports'
    | 'tech'
> = z.enum([
    'ai',
    'business',
    'comedy',
    'education',
    'entertainment',
    'finance',
    'gaming',
    'lifestyle',
    'movieCritic',
    'music',
    'news',
    'science',
    'software',
    'sports',
    'tech',
]);

export const GqlSMedicalAppointmentStatusSchema: z.ZodType<
    'cancelled' | 'completed' | 'missed' | 'scheduled',
    'cancelled' | 'completed' | 'missed' | 'scheduled'
> = z.enum(['cancelled', 'completed', 'missed', 'scheduled']);

export const GqlSMedicalCategorySchema: z.ZodType<
    'dentist' | 'dermatology' | 'ent' | 'eyes' | 'gp' | 'mentalHealth' | 'other' | 'physio',
    'dentist' | 'dermatology' | 'ent' | 'eyes' | 'gp' | 'mentalHealth' | 'other' | 'physio'
> = z.enum(['dentist', 'dermatology', 'ent', 'eyes', 'gp', 'mentalHealth', 'other', 'physio']);

export const GqlSMedicalRecordSeveritySchema: z.ZodType<'info' | 'mild' | 'moderate' | 'severe', 'info' | 'mild' | 'moderate' | 'severe'> =
    z.enum(['info', 'mild', 'moderate', 'severe']);

export const GqlSMovieStatusSchema: z.ZodType<
    'dropped' | 'watched' | 'watching' | 'watchlist',
    'dropped' | 'watched' | 'watching' | 'watchlist'
> = z.enum(['dropped', 'watched', 'watching', 'watchlist']);

export const GqlSProjectActivityChannelSchema: z.ZodType<
    'aiAssistant' | 'email' | 'inPerson' | 'malt' | 'other' | 'phone' | 'videoCall',
    'aiAssistant' | 'email' | 'inPerson' | 'malt' | 'other' | 'phone' | 'videoCall'
> = z.enum(['aiAssistant', 'email', 'inPerson', 'malt', 'other', 'phone', 'videoCall']);

export const GqlSProjectActivityDirectionSchema: z.ZodType<'incoming' | 'internal' | 'outgoing', 'incoming' | 'internal' | 'outgoing'> =
    z.enum(['incoming', 'internal', 'outgoing']);

export const GqlSProjectActivityKindSchema: z.ZodType<
    'clientContact' | 'meeting' | 'milestone' | 'note' | 'offer' | 'work',
    'clientContact' | 'meeting' | 'milestone' | 'note' | 'offer' | 'work'
> = z.enum(['clientContact', 'meeting', 'milestone', 'note', 'offer', 'work']);

export const GqlSProjectFileKindSchema: z.ZodType<
    'contract' | 'invoice' | 'offer' | 'other' | 'screenshot',
    'contract' | 'invoice' | 'offer' | 'other' | 'screenshot'
> = z.enum(['contract', 'invoice', 'offer', 'other', 'screenshot']);

export const GqlSProjectLinkKindSchema: z.ZodType<
    'figma' | 'gdrive' | 'github' | 'invoice' | 'malt' | 'notion' | 'offer' | 'other',
    'figma' | 'gdrive' | 'github' | 'invoice' | 'malt' | 'notion' | 'offer' | 'other'
> = z.enum(['figma', 'gdrive', 'github', 'invoice', 'malt', 'notion', 'offer', 'other']);

export const GqlSProjectOfferStatusSchema: z.ZodType<
    'accepted' | 'rejected' | 'sent' | 'withdrawn',
    'accepted' | 'rejected' | 'sent' | 'withdrawn'
> = z.enum(['accepted', 'rejected', 'sent', 'withdrawn']);

export const GqlSProjectRequestStatusSchema: z.ZodType<
    'archived' | 'emailVerified' | 'pendingOtp',
    'archived' | 'emailVerified' | 'pendingOtp'
> = z.enum(['archived', 'emailVerified', 'pendingOtp']);

export const GqlSProjectRequestTypeSchema: z.ZodType<
    'aiIntegration' | 'consulting' | 'mobile' | 'other' | 'webApp',
    'aiIntegration' | 'consulting' | 'mobile' | 'other' | 'webApp'
> = z.enum(['aiIntegration', 'consulting', 'mobile', 'other', 'webApp']);

export const GqlSProjectStatusSchema: z.ZodType<
    'active' | 'archived' | 'done' | 'idea' | 'paused' | 'planning',
    'active' | 'archived' | 'done' | 'idea' | 'paused' | 'planning'
> = z.enum(['active', 'archived', 'done', 'idea', 'paused', 'planning']);

export const GqlSTaskEffortSchema: z.ZodType<'deep' | 'focused' | 'quick', 'deep' | 'focused' | 'quick'> = z.enum([
    'deep',
    'focused',
    'quick',
]);

export const GqlSTaskStatusSchema: z.ZodType<'doing' | 'done' | 'todo', 'doing' | 'done' | 'todo'> = z.enum(['doing', 'done', 'todo']);

export const GqlSTaskWhenBucketSchema: z.ZodType<'someday' | 'today' | 'waiting' | 'week', 'someday' | 'today' | 'waiting' | 'week'> =
    z.enum(['someday', 'today', 'waiting', 'week']);

export const GqlSTransportModeSchema: z.ZodType<
    'car' | 'ferry' | 'flight' | 'mixed' | 'train',
    'car' | 'ferry' | 'flight' | 'mixed' | 'train'
> = z.enum(['car', 'ferry', 'flight', 'mixed', 'train']);

export const GqlSTripStatusSchema: z.ZodType<
    'active' | 'cancelled' | 'completed' | 'draft' | 'planned',
    'active' | 'cancelled' | 'completed' | 'draft' | 'planned'
> = z.enum(['active', 'cancelled', 'completed', 'draft', 'planned']);

export function GqlSChatAssistantOptionsSchema(): z.ZodObject<Properties<GqlSChatAssistantOptions>> {
    return z.object({
        generationId: z.string().nullish(),
        modelId: z.string().nullish(),
        requireToolCallApprovals: z.boolean(),
    });
}

export function GqlSChatMessageUserInputAnswerCreateSchema(): z.ZodObject<Properties<GqlSChatMessageUserInputAnswerCreate>> {
    return z.object({
        boolean: z.boolean().nullish(),
        date: z.string().nullish(),
        dateRangeFrom: z.string().nullish(),
        dateRangeTo: z.string().nullish(),
        dateTime: z.date().nullish(),
        inputId: z.string(),
        kind: GqlSChatAssistantInputValueKindSchema,
        string: z.string().nullish(),
        stringList: z.array(z.string()).nullish(),
        time: z.string().nullish(),
    });
}

export function GqlSCvEducationInputSchema(): z.ZodObject<Properties<GqlSCvEducationInput>> {
    return z.object({
        cvEducationId: z.string().nullish(),
        degreeDe: z.string(),
        degreeEn: z.string(),
        endDate: z.string(),
        institution: z.string(),
        notesDe: z.string(),
        notesEn: z.string(),
        position: z.number(),
        startDate: z.string().nullish(),
        subjectDe: z.string(),
        subjectEn: z.string(),
    });
}

export function GqlSCvExperienceInputSchema(): z.ZodObject<Properties<GqlSCvExperienceInput>> {
    return z.object({
        company: z.string(),
        cvExperienceId: z.string().nullish(),
        descriptionDe: z.string(),
        descriptionEn: z.string(),
        endDate: z.string().nullish(),
        managerName: z.string().nullish(),
        roleDe: z.string(),
        roleEn: z.string(),
        startDate: z.string(),
        technologies: z.array(z.string()),
    });
}

export function GqlSCvHobbyInputSchema(): z.ZodObject<Properties<GqlSCvHobbyInput>> {
    return z.object({
        cvHobbyId: z.string().nullish(),
        position: z.number(),
        since: z.number().nullish(),
        textDe: z.string(),
        textEn: z.string(),
    });
}

export function GqlSCvSkillInputSchema(): z.ZodObject<Properties<GqlSCvSkillInput>> {
    return z.object({
        category: GqlSCvSkillCategorySchema,
        cvSkillId: z.string().nullish(),
        label: z.string(),
        position: z.number(),
    });
}

export function GqlSFinanceRecurringCostInputSchema(): z.ZodObject<Properties<GqlSFinanceRecurringCostInput>> {
    return z.object({
        active: z.boolean().nullish(),
        amountCents: z.number(),
        cadence: GqlSFinanceCadenceSchema,
        categoryKey: GqlSFinanceRecurringCostCategorySchema,
        costId: z.string().nullish(),
        currency: z.string().nullish(),
        endsOn: z.string().nullish(),
        name: z.string(),
        notes: z.string().nullish(),
        startsOn: z.string().nullish(),
    });
}

export function GqlSItemFileAttachInputSchema(): z.ZodObject<Properties<GqlSItemFileAttachInput>> {
    return z.object({
        fileUploadId: z.string(),
        itemId: z.string(),
        kind: GqlSItemFileKindSchema,
        label: z.string().nullish(),
        pinned: z.boolean().nullish(),
        serviceEntryId: z.string().nullish(),
    });
}

export function GqlSItemFileUpsertSchema(): z.ZodObject<Properties<GqlSItemFileUpsert>> {
    return z.object({
        itemFileId: z.string(),
        label: z.string().nullish(),
        pinned: z.boolean().nullish(),
    });
}

export function GqlSItemInputSchema(): z.ZodObject<Properties<GqlSItemInput>> {
    return z.object({
        brand: z.string().nullish(),
        categoryKey: GqlSItemCategorySchema,
        condition: GqlSItemConditionSchema.nullish(),
        disposalState: GqlSItemDisposalStateSchema.nullish(),
        disposedAt: z.date().nullish(),
        itemId: z.string().nullish(),
        model: z.string().nullish(),
        name: z.string(),
        notes: z.string().nullish(),
        purchasePriceCents: z.number().nullish(),
        purchasedAt: z.string().nullish(),
        serialNumber: z.string().nullish(),
        warrantyEndsAt: z.string().nullish(),
        warrantyNotes: z.string().nullish(),
        warrantyProvider: z.string().nullish(),
    });
}

export function GqlSItemRepriceInputSchema(): z.ZodObject<Properties<GqlSItemRepriceInput>> {
    return z.object({
        itemId: z.string(),
        note: z.string().nullish(),
        valueCents: z.number(),
        valuedAt: z.date().nullish(),
    });
}

export function GqlSItemServiceEntryInputSchema(): z.ZodObject<Properties<GqlSItemServiceEntryInput>> {
    return z.object({
        costCents: z.number().nullish(),
        itemId: z.string(),
        kind: GqlSItemServiceKindSchema,
        nextDueAt: z.string().nullish(),
        notes: z.string().nullish(),
        performedAt: z.string(),
        serviceEntryId: z.string().nullish(),
        vendor: z.string().nullish(),
    });
}

export function GqlSMediaChannelInputSchema(): z.ZodObject<Properties<GqlSMediaChannelInput>> {
    return z.object({
        avatarUrl: z.string().nullish(),
        channelId: z.string().nullish(),
        description: z.string().nullish(),
        handle: z.string().nullish(),
        name: z.string(),
        notes: z.string().nullish(),
        platform: GqlSMediaPlatformSchema,
        topics: z.array(z.string()),
        url: z.string(),
    });
}

export function GqlSMedicalAppointmentInputSchema(): z.ZodObject<Properties<GqlSMedicalAppointmentInput>> {
    return z.object({
        appointmentId: z.string().nullish(),
        category: GqlSMedicalCategorySchema,
        completedAt: z.date().nullish(),
        nextDueAt: z.date().nullish(),
        notes: z.string().nullish(),
        providerName: z.string().nullish(),
        scheduledAt: z.date(),
        status: GqlSMedicalAppointmentStatusSchema,
        title: z.string(),
        topics: z.array(z.string()),
    });
}

export function GqlSMedicalRecordFileAttachInputSchema(): z.ZodObject<Properties<GqlSMedicalRecordFileAttachInput>> {
    return z.object({
        fileUploadId: z.string(),
        label: z.string().nullish(),
        pinned: z.boolean().nullish(),
        recordId: z.string(),
    });
}

export function GqlSMedicalRecordInputSchema(): z.ZodObject<Properties<GqlSMedicalRecordInput>> {
    return z.object({
        appointmentId: z.string().nullish(),
        bodyAreas: z.array(z.string()),
        category: GqlSMedicalCategorySchema,
        fileUploadIds: z.array(z.string()).nullish(),
        occurredAt: z.date().nullish(),
        recordId: z.string().nullish(),
        resolvedAt: z.date().nullish(),
        severity: GqlSMedicalRecordSeveritySchema.nullish(),
        summary: z.string(),
        symptoms: z.array(z.string()),
        title: z.string(),
        topics: z.array(z.string()),
    });
}

export function GqlSMovieAddFromTmdbInputSchema(): z.ZodObject<Properties<GqlSMovieAddFromTmdbInput>> {
    return z.object({
        status: GqlSMovieStatusSchema.nullish(),
        tmdbId: z.number(),
    });
}

export function GqlSMovieInputSchema(): z.ZodObject<Properties<GqlSMovieInput>> {
    return z.object({
        backdropUrl: z.string().nullish(),
        movieId: z.string().nullish(),
        notes: z.string().nullish(),
        overview: z.string().nullish(),
        posterUrl: z.string().nullish(),
        rating: z.number().nullish(),
        releaseDate: z.string().nullish(),
        runtimeMinutes: z.number().nullish(),
        status: GqlSMovieStatusSchema,
        title: z.string(),
        tmdbId: z.number().nullish(),
        topics: z.array(z.string()),
        watchedAt: z.date().nullish(),
    });
}

export function GqlSProjectActivityCreateSchema(): z.ZodObject<Properties<GqlSProjectActivityCreate>> {
    return z.object({
        activityId: z.string().nullish(),
        amountCents: z.number().nullish(),
        attachFileKind: GqlSProjectFileKindSchema.nullish(),
        attachFileLabel: z.string().nullish(),
        attachFilePinned: z.boolean().nullish(),
        attachFileUploadId: z.string().nullish(),
        attachLinkKind: GqlSProjectLinkKindSchema.nullish(),
        attachLinkLabel: z.string().nullish(),
        attachLinkPinned: z.boolean().nullish(),
        attachLinkUrl: z.string().nullish(),
        channel: GqlSProjectActivityChannelSchema.nullish(),
        direction: GqlSProjectActivityDirectionSchema.nullish(),
        durationSec: z.number().nullish(),
        kind: GqlSProjectActivityKindSchema,
        notes: z.string().nullish(),
        occurredAt: z.date(),
        offerStatus: GqlSProjectOfferStatusSchema.nullish(),
        projectId: z.string(),
        taskId: z.string().nullish(),
        title: z.string(),
    });
}

export function GqlSProjectCreateSchema(): z.ZodObject<Properties<GqlSProjectCreate>> {
    return z.object({
        completedAt: z.date().nullish(),
        description: z.string().nullish(),
        notes: z.string().nullish(),
        position: z.number().nullish(),
        projectId: z.string().nullish(),
        sourceRequestId: z.string().nullish(),
        startedAt: z.date().nullish(),
        status: GqlSProjectStatusSchema,
        title: z.string(),
    });
}

export function GqlSProjectFileUpsertSchema(): z.ZodObject<Properties<GqlSProjectFileUpsert>> {
    return z.object({
        activityId: z.string().nullish(),
        fileUploadId: z.string(),
        kind: GqlSProjectFileKindSchema,
        label: z.string().nullish(),
        pinned: z.boolean().nullish(),
        projectFileId: z.string().nullish(),
        projectId: z.string(),
    });
}

export function GqlSProjectLinkUpsertSchema(): z.ZodObject<Properties<GqlSProjectLinkUpsert>> {
    return z.object({
        activityId: z.string().nullish(),
        kind: GqlSProjectLinkKindSchema,
        label: z.string().nullish(),
        pinned: z.boolean().nullish(),
        projectId: z.string(),
        projectLinkId: z.string().nullish(),
        url: z.string(),
    });
}

export function GqlSProjectTimerStartInputSchema(): z.ZodObject<Properties<GqlSProjectTimerStartInput>> {
    return z.object({
        projectId: z.string(),
        taskId: z.string().nullish(),
        title: z.string().nullish(),
    });
}

export function GqlSShowAddFromTmdbInputSchema(): z.ZodObject<Properties<GqlSShowAddFromTmdbInput>> {
    return z.object({
        status: GqlSMovieStatusSchema.nullish(),
        tmdbId: z.number(),
    });
}

export function GqlSShowInputSchema(): z.ZodObject<Properties<GqlSShowInput>> {
    return z.object({
        backdropUrl: z.string().nullish(),
        firstAirDate: z.string().nullish(),
        isCompleted: z.boolean(),
        nextSeasonReleaseDate: z.string().nullish(),
        nextSeasonReleaseRough: z.string().nullish(),
        notes: z.string().nullish(),
        overview: z.string().nullish(),
        posterUrl: z.string().nullish(),
        rating: z.number().nullish(),
        showId: z.string().nullish(),
        status: GqlSMovieStatusSchema,
        title: z.string(),
        tmdbId: z.number().nullish(),
        topics: z.array(z.string()),
    });
}

export function GqlSTaskCreateSchema(): z.ZodObject<Properties<GqlSTaskCreate>> {
    return z.object({
        completedAt: z.date().nullish(),
        dueAt: z.date().nullish(),
        effort: GqlSTaskEffortSchema.nullish(),
        notes: z.string().nullish(),
        position: z.number(),
        projectId: z.string().nullish(),
        status: GqlSTaskStatusSchema,
        taskId: z.string().nullish(),
        title: z.string(),
        whenBucket: GqlSTaskWhenBucketSchema.nullish(),
    });
}

export function GqlSTripActivityInputSchema(): z.ZodObject<Properties<GqlSTripActivityInput>> {
    return z.object({
        endsAt: z.string().nullish(),
        location: z.string().nullish(),
        notes: z.string().nullish(),
        position: z.number().nullish(),
        startsAt: z.string().nullish(),
        title: z.string(),
        tripActivityId: z.string().nullish(),
        tripDayId: z.string(),
        url: z.string().nullish(),
    });
}

export function GqlSTripDayInputSchema(): z.ZodObject<Properties<GqlSTripDayInput>> {
    return z.object({
        date: z.string().nullish(),
        dayNumber: z.number(),
        summary: z.string().nullish(),
        title: z.string().nullish(),
        tripDayId: z.string().nullish(),
        tripId: z.string(),
    });
}

export function GqlSTripInputSchema(): z.ZodObject<Properties<GqlSTripInput>> {
    return z.object({
        accommodation: z.string().nullish(),
        destination: z.string(),
        endsOn: z.string().nullish(),
        notes: z.string().nullish(),
        startsOn: z.string().nullish(),
        status: GqlSTripStatusSchema,
        title: z.string(),
        transportMode: GqlSTransportModeSchema.nullish(),
        tripId: z.string().nullish(),
    });
}

export function GqlSTripPackingItemInputSchema(): z.ZodObject<Properties<GqlSTripPackingItemInput>> {
    return z.object({
        category: z.string(),
        label: z.string(),
        notes: z.string().nullish(),
        packed: z.boolean().nullish(),
        position: z.number().nullish(),
        quantity: z.number().nullish(),
        tripId: z.string(),
        tripPackingItemId: z.string().nullish(),
    });
}

export function GqlSUserCreateSchema(): z.ZodObject<Properties<GqlSUserCreate>> {
    return z.object({
        name: z.string(),
    });
}

export function GqlSUserUpdateSchema(): z.ZodObject<Properties<GqlSUserUpdate>> {
    return z.object({
        name: z.string(),
    });
}
