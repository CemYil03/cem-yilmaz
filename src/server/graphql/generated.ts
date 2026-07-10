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
    adminFitnessFindOne: GqlSAdminFitnessQuery;
    adminInventoryFindOne: GqlSAdminInventoryQuery;
    adminLogFindMany: Array<GqlSLog>;
    adminMediaFindOne: GqlSAdminMediaQuery;
    adminMedicalFindOne: GqlSAdminMedicalQuery;
    adminNutritionFindOne: GqlSAdminNutritionQuery;
    adminProjectActiveTimerFindOne?: Maybe<GqlSAdminProjectActivity>;
    adminProjectFindMany: Array<GqlSAdminProject>;
    adminProjectFindOne: GqlSAdminProject;
    adminProjectRequestFindMany: Array<GqlSAdminProjectRequest>;
    adminProjectRequestInboxCount: Scalars['Int']['output'];
    adminPublicChatFindMany: Array<GqlSChat>;
    adminPublicChatFindOne: GqlSChat;
    adminStandaloneTaskFindMany: Array<GqlSAdminProjectTask>;
    adminStandaloneTaskOpenCount: Scalars['Int']['output'];
    adminTaxFindOne: GqlSAdminTaxQuery;
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
    status?: InputMaybe<GqlSAdminProjectStatus>;
};

export type GqlSAdminAdminProjectFindOneArgs = {
    projectId: Scalars['ID']['input'];
};

export type GqlSAdminAdminProjectRequestFindManyArgs = {
    status?: InputMaybe<GqlSAdminProjectRequestStatus>;
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

export type GqlSAdminFinancesCadence = 'monthly' | 'yearly';

export interface GqlSAdminFinancesQuery {
    __typename?: 'AdminFinancesQuery';
    adminFinancesMonthlyExpensesCentsFindOne: Scalars['Int']['output'];
    adminFinancesMonthlyNetIncomeCentsFindOne?: Maybe<Scalars['Int']['output']>;
    adminFinancesRecurringCostFindMany: Array<GqlSAdminFinancesRecurringCost>;
    adminFinancesYearlyExpensesCentsFindOne: Scalars['Int']['output'];
}

export interface GqlSAdminFinancesRecurringCost {
    __typename?: 'AdminFinancesRecurringCost';
    active: Scalars['Boolean']['output'];
    amountCents: Scalars['Int']['output'];
    cadence: GqlSAdminFinancesCadence;
    categoryKey: GqlSAdminFinancesRecurringCostCategory;
    costId: Scalars['ID']['output'];
    createdAt: Scalars['DateTime']['output'];
    currency: Scalars['String']['output'];
    endsOn?: Maybe<Scalars['Date']['output']>;
    name: Scalars['String']['output'];
    notes?: Maybe<Scalars['String']['output']>;
    startsOn?: Maybe<Scalars['Date']['output']>;
    updatedAt: Scalars['DateTime']['output'];
}

export type GqlSAdminFinancesRecurringCostCategory =
    | 'connectivity'
    | 'donations'
    | 'household'
    | 'housing'
    | 'insurance'
    | 'memberships'
    | 'other'
    | 'savingsGeneral'
    | 'savingsVacation'
    | 'subscriptionsEntertainment'
    | 'subscriptionsWork'
    | 'transport';

export type GqlSAdminFinancesRecurringCostInput = {
    active?: InputMaybe<Scalars['Boolean']['input']>;
    amountCents: Scalars['Int']['input'];
    cadence: GqlSAdminFinancesCadence;
    categoryKey: GqlSAdminFinancesRecurringCostCategory;
    costId?: InputMaybe<Scalars['ID']['input']>;
    currency?: InputMaybe<Scalars['String']['input']>;
    endsOn?: InputMaybe<Scalars['Date']['input']>;
    name: Scalars['String']['input'];
    notes?: InputMaybe<Scalars['String']['input']>;
    startsOn?: InputMaybe<Scalars['Date']['input']>;
};

export type GqlSAdminFitnessEquipmentType = 'barbell' | 'bodyweight' | 'cable' | 'dumbbell' | 'kettlebell' | 'machine' | 'other';

export interface GqlSAdminFitnessExercise {
    __typename?: 'AdminFitnessExercise';
    createdAt: Scalars['DateTime']['output'];
    equipment?: Maybe<GqlSAdminFitnessEquipmentType>;
    exerciseId: Scalars['ID']['output'];
    muscleGroup: GqlSAdminFitnessMuscleGroup;
    name: Scalars['String']['output'];
    notes?: Maybe<Scalars['String']['output']>;
    updatedAt: Scalars['DateTime']['output'];
}

export type GqlSAdminFitnessExerciseInput = {
    equipment?: InputMaybe<GqlSAdminFitnessEquipmentType>;
    exerciseId?: InputMaybe<Scalars['ID']['input']>;
    muscleGroup: GqlSAdminFitnessMuscleGroup;
    name: Scalars['String']['input'];
    notes?: InputMaybe<Scalars['String']['input']>;
};

export type GqlSAdminFitnessMuscleGroup = 'arms' | 'back' | 'cardio' | 'chest' | 'core' | 'fullBody' | 'legs' | 'other' | 'shoulders';

export interface GqlSAdminFitnessQuery {
    __typename?: 'AdminFitnessQuery';
    adminFitnessExerciseFindMany: Array<GqlSAdminFitnessExercise>;
    adminFitnessRoutineFindMany: Array<GqlSAdminFitnessWorkoutRoutine>;
    adminFitnessSessionFindMany: Array<GqlSAdminFitnessWorkoutSession>;
}

export interface GqlSAdminFitnessWorkoutRoutine {
    __typename?: 'AdminFitnessWorkoutRoutine';
    createdAt: Scalars['DateTime']['output'];
    items: Array<GqlSAdminFitnessWorkoutRoutineItem>;
    name: Scalars['String']['output'];
    notes?: Maybe<Scalars['String']['output']>;
    position: Scalars['Int']['output'];
    routineId: Scalars['ID']['output'];
    updatedAt: Scalars['DateTime']['output'];
}

export type GqlSAdminFitnessWorkoutRoutineInput = {
    name: Scalars['String']['input'];
    notes?: InputMaybe<Scalars['String']['input']>;
    position?: InputMaybe<Scalars['Int']['input']>;
    routineId?: InputMaybe<Scalars['ID']['input']>;
};

export interface GqlSAdminFitnessWorkoutRoutineItem {
    __typename?: 'AdminFitnessWorkoutRoutineItem';
    createdAt: Scalars['DateTime']['output'];
    exercise: GqlSAdminFitnessExercise;
    notes?: Maybe<Scalars['String']['output']>;
    position: Scalars['Int']['output'];
    routineId: Scalars['ID']['output'];
    routineItemId: Scalars['ID']['output'];
    targetReps?: Maybe<Scalars['Int']['output']>;
    targetSets?: Maybe<Scalars['Int']['output']>;
    targetWeight?: Maybe<Scalars['Float']['output']>;
    updatedAt: Scalars['DateTime']['output'];
}

export type GqlSAdminFitnessWorkoutRoutineItemInput = {
    exerciseId: Scalars['ID']['input'];
    notes?: InputMaybe<Scalars['String']['input']>;
    position?: InputMaybe<Scalars['Int']['input']>;
    routineId: Scalars['ID']['input'];
    routineItemId?: InputMaybe<Scalars['ID']['input']>;
    targetReps?: InputMaybe<Scalars['Int']['input']>;
    targetSets?: InputMaybe<Scalars['Int']['input']>;
    targetWeight?: InputMaybe<Scalars['Float']['input']>;
};

export interface GqlSAdminFitnessWorkoutSession {
    __typename?: 'AdminFitnessWorkoutSession';
    createdAt: Scalars['DateTime']['output'];
    date: Scalars['Date']['output'];
    durationMinutes?: Maybe<Scalars['Int']['output']>;
    notes?: Maybe<Scalars['String']['output']>;
    routineId?: Maybe<Scalars['ID']['output']>;
    sessionId: Scalars['ID']['output'];
    sets: Array<GqlSAdminFitnessWorkoutSet>;
    title?: Maybe<Scalars['String']['output']>;
    updatedAt: Scalars['DateTime']['output'];
}

export type GqlSAdminFitnessWorkoutSessionInput = {
    date: Scalars['Date']['input'];
    durationMinutes?: InputMaybe<Scalars['Int']['input']>;
    notes?: InputMaybe<Scalars['String']['input']>;
    routineId?: InputMaybe<Scalars['ID']['input']>;
    sessionId?: InputMaybe<Scalars['ID']['input']>;
    title?: InputMaybe<Scalars['String']['input']>;
};

export interface GqlSAdminFitnessWorkoutSet {
    __typename?: 'AdminFitnessWorkoutSet';
    createdAt: Scalars['DateTime']['output'];
    exercise: GqlSAdminFitnessExercise;
    isWarmup: Scalars['Boolean']['output'];
    notes?: Maybe<Scalars['String']['output']>;
    position: Scalars['Int']['output'];
    reps?: Maybe<Scalars['Int']['output']>;
    rpe?: Maybe<Scalars['Int']['output']>;
    sessionId: Scalars['ID']['output'];
    setId: Scalars['ID']['output'];
    updatedAt: Scalars['DateTime']['output'];
    weight?: Maybe<Scalars['Float']['output']>;
}

export type GqlSAdminFitnessWorkoutSetInput = {
    exerciseId: Scalars['ID']['input'];
    isWarmup?: InputMaybe<Scalars['Boolean']['input']>;
    notes?: InputMaybe<Scalars['String']['input']>;
    position?: InputMaybe<Scalars['Int']['input']>;
    reps?: InputMaybe<Scalars['Int']['input']>;
    rpe?: InputMaybe<Scalars['Int']['input']>;
    sessionId: Scalars['ID']['input'];
    setId?: InputMaybe<Scalars['ID']['input']>;
    weight?: InputMaybe<Scalars['Float']['input']>;
};

export interface GqlSAdminInventoryItem {
    __typename?: 'AdminInventoryItem';
    brand?: Maybe<Scalars['String']['output']>;
    categoryKey: GqlSAdminInventoryItemCategory;
    condition?: Maybe<GqlSAdminInventoryItemCondition>;
    createdAt: Scalars['DateTime']['output'];
    currentValueCents?: Maybe<Scalars['Int']['output']>;
    disposalState: GqlSAdminInventoryItemDisposalState;
    disposedAt?: Maybe<Scalars['DateTime']['output']>;
    files: Array<GqlSAdminInventoryItemFile>;
    itemId: Scalars['ID']['output'];
    model?: Maybe<Scalars['String']['output']>;
    name: Scalars['String']['output'];
    notes?: Maybe<Scalars['String']['output']>;
    purchasePriceCents?: Maybe<Scalars['Int']['output']>;
    purchasedAt?: Maybe<Scalars['Date']['output']>;
    serialNumber?: Maybe<Scalars['String']['output']>;
    serviceEntries: Array<GqlSAdminInventoryItemServiceEntry>;
    updatedAt: Scalars['DateTime']['output'];
    valuations: Array<GqlSAdminInventoryItemValuation>;
    warrantyEndsAt?: Maybe<Scalars['Date']['output']>;
    warrantyNotes?: Maybe<Scalars['String']['output']>;
    warrantyProvider?: Maybe<Scalars['String']['output']>;
}

export type GqlSAdminInventoryItemCategory =
    'appliance' | 'clothing' | 'electronics' | 'furniture' | 'kitchen' | 'other' | 'sports' | 'tool' | 'vehicle';

export type GqlSAdminInventoryItemCondition = 'fair' | 'good' | 'likeNew' | 'new' | 'poor';

export type GqlSAdminInventoryItemDisposalState = 'disposed' | 'gifted' | 'lost' | 'owned' | 'sold';

export interface GqlSAdminInventoryItemFile {
    __typename?: 'AdminInventoryItemFile';
    createdAt: Scalars['DateTime']['output'];
    fileUpload: GqlSFileUpload;
    itemFileId: Scalars['ID']['output'];
    itemId: Scalars['ID']['output'];
    kind: GqlSAdminInventoryItemFileKind;
    label?: Maybe<Scalars['String']['output']>;
    pinned: Scalars['Boolean']['output'];
    serviceEntryId?: Maybe<Scalars['ID']['output']>;
    updatedAt: Scalars['DateTime']['output'];
}

export type GqlSAdminInventoryItemFileAttachInput = {
    fileUploadId: Scalars['ID']['input'];
    itemId: Scalars['ID']['input'];
    kind: GqlSAdminInventoryItemFileKind;
    label?: InputMaybe<Scalars['String']['input']>;
    pinned?: InputMaybe<Scalars['Boolean']['input']>;
    serviceEntryId?: InputMaybe<Scalars['ID']['input']>;
};

export type GqlSAdminInventoryItemFileKind = 'invoice' | 'manual' | 'other' | 'photo' | 'receipt' | 'warranty';

export type GqlSAdminInventoryItemFileUpsert = {
    itemFileId: Scalars['ID']['input'];
    label?: InputMaybe<Scalars['String']['input']>;
    pinned?: InputMaybe<Scalars['Boolean']['input']>;
};

export type GqlSAdminInventoryItemInput = {
    brand?: InputMaybe<Scalars['String']['input']>;
    categoryKey: GqlSAdminInventoryItemCategory;
    condition?: InputMaybe<GqlSAdminInventoryItemCondition>;
    disposalState?: InputMaybe<GqlSAdminInventoryItemDisposalState>;
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

export type GqlSAdminInventoryItemRepriceInput = {
    itemId: Scalars['ID']['input'];
    note?: InputMaybe<Scalars['String']['input']>;
    valueCents: Scalars['Int']['input'];
    valuedAt?: InputMaybe<Scalars['DateTime']['input']>;
};

export interface GqlSAdminInventoryItemServiceEntry {
    __typename?: 'AdminInventoryItemServiceEntry';
    costCents?: Maybe<Scalars['Int']['output']>;
    createdAt: Scalars['DateTime']['output'];
    files: Array<GqlSAdminInventoryItemFile>;
    kind: GqlSAdminInventoryItemServiceKind;
    nextDueAt?: Maybe<Scalars['Date']['output']>;
    notes?: Maybe<Scalars['String']['output']>;
    performedAt: Scalars['Date']['output'];
    serviceEntryId: Scalars['ID']['output'];
    updatedAt: Scalars['DateTime']['output'];
    vendor?: Maybe<Scalars['String']['output']>;
}

export type GqlSAdminInventoryItemServiceEntryInput = {
    costCents?: InputMaybe<Scalars['Int']['input']>;
    itemId: Scalars['ID']['input'];
    kind: GqlSAdminInventoryItemServiceKind;
    nextDueAt?: InputMaybe<Scalars['Date']['input']>;
    notes?: InputMaybe<Scalars['String']['input']>;
    performedAt: Scalars['Date']['input'];
    serviceEntryId?: InputMaybe<Scalars['ID']['input']>;
    vendor?: InputMaybe<Scalars['String']['input']>;
};

export type GqlSAdminInventoryItemServiceKind = 'other' | 'repair' | 'replacement' | 'service';

export interface GqlSAdminInventoryItemValuation {
    __typename?: 'AdminInventoryItemValuation';
    note?: Maybe<Scalars['String']['output']>;
    valuationId: Scalars['ID']['output'];
    valueCents: Scalars['Int']['output'];
    valuedAt: Scalars['DateTime']['output'];
}

export interface GqlSAdminInventoryQuery {
    __typename?: 'AdminInventoryQuery';
    adminInventoryItemFindMany: Array<GqlSAdminInventoryItem>;
    adminInventoryItemFindOne?: Maybe<GqlSAdminInventoryItem>;
    adminInventoryItemUpcomingWarrantyFindMany: Array<GqlSAdminInventoryItem>;
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

export interface GqlSAdminMediaChannel {
    __typename?: 'AdminMediaChannel';
    avatarUrl?: Maybe<Scalars['String']['output']>;
    channelId: Scalars['ID']['output'];
    description?: Maybe<Scalars['String']['output']>;
    handle?: Maybe<Scalars['String']['output']>;
    name: Scalars['String']['output'];
    notes?: Maybe<Scalars['String']['output']>;
    platform: GqlSAdminMediaPlatform;
    priority: Scalars['Int']['output'];
    topics: Array<Scalars['String']['output']>;
    updatedAt: Scalars['DateTime']['output'];
    url: Scalars['String']['output'];
}

export type GqlSAdminMediaChannelInput = {
    avatarUrl?: InputMaybe<Scalars['String']['input']>;
    channelId?: InputMaybe<Scalars['ID']['input']>;
    description?: InputMaybe<Scalars['String']['input']>;
    handle?: InputMaybe<Scalars['String']['input']>;
    name: Scalars['String']['input'];
    notes?: InputMaybe<Scalars['String']['input']>;
    platform: GqlSAdminMediaPlatform;
    topics: Array<Scalars['String']['input']>;
    url: Scalars['String']['input'];
};

export interface GqlSAdminMediaMovie {
    __typename?: 'AdminMediaMovie';
    backdropUrl?: Maybe<Scalars['String']['output']>;
    movieId: Scalars['ID']['output'];
    notes?: Maybe<Scalars['String']['output']>;
    overview?: Maybe<Scalars['String']['output']>;
    posterUrl?: Maybe<Scalars['String']['output']>;
    rating?: Maybe<Scalars['Int']['output']>;
    releaseDate?: Maybe<Scalars['Date']['output']>;
    runtimeMinutes?: Maybe<Scalars['Int']['output']>;
    status: GqlSAdminMediaMovieStatus;
    title: Scalars['String']['output'];
    tmdbId?: Maybe<Scalars['Int']['output']>;
    topics: Array<Scalars['String']['output']>;
    updatedAt: Scalars['DateTime']['output'];
    watchedAt?: Maybe<Scalars['DateTime']['output']>;
}

export type GqlSAdminMediaMovieAddFromTmdbInput = {
    status?: InputMaybe<GqlSAdminMediaMovieStatus>;
    tmdbId: Scalars['Int']['input'];
};

export type GqlSAdminMediaMovieInput = {
    backdropUrl?: InputMaybe<Scalars['String']['input']>;
    movieId?: InputMaybe<Scalars['ID']['input']>;
    notes?: InputMaybe<Scalars['String']['input']>;
    overview?: InputMaybe<Scalars['String']['input']>;
    posterUrl?: InputMaybe<Scalars['String']['input']>;
    rating?: InputMaybe<Scalars['Int']['input']>;
    releaseDate?: InputMaybe<Scalars['Date']['input']>;
    runtimeMinutes?: InputMaybe<Scalars['Int']['input']>;
    status: GqlSAdminMediaMovieStatus;
    title: Scalars['String']['input'];
    tmdbId?: InputMaybe<Scalars['Int']['input']>;
    topics: Array<Scalars['String']['input']>;
    watchedAt?: InputMaybe<Scalars['DateTime']['input']>;
};

export type GqlSAdminMediaMovieStatus = 'dropped' | 'watched' | 'watching' | 'watchlist';

export type GqlSAdminMediaPlatform = 'other' | 'podcast' | 'twitch' | 'youtube';

export interface GqlSAdminMediaQuery {
    __typename?: 'AdminMediaQuery';
    adminMediaChannelFindMany: Array<GqlSAdminMediaChannel>;
    adminMediaMovieFindMany: Array<GqlSAdminMediaMovie>;
    adminMediaShowFindMany: Array<GqlSAdminMediaShow>;
    adminMediaTmdbFindMany: Array<GqlSAdminMediaTmdbMovieResult>;
    adminMediaTmdbTvFindMany: Array<GqlSAdminMediaTmdbTvResult>;
    adminMediaYoutubeFindMany: Array<GqlSAdminMediaYoutubeChannelResult>;
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

export interface GqlSAdminMediaShow {
    __typename?: 'AdminMediaShow';
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
    status: GqlSAdminMediaMovieStatus;
    title: Scalars['String']['output'];
    tmdbId?: Maybe<Scalars['Int']['output']>;
    topics: Array<Scalars['String']['output']>;
    updatedAt: Scalars['DateTime']['output'];
}

export type GqlSAdminMediaShowAddFromTmdbInput = {
    status?: InputMaybe<GqlSAdminMediaMovieStatus>;
    tmdbId: Scalars['Int']['input'];
};

export type GqlSAdminMediaShowInput = {
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
    status: GqlSAdminMediaMovieStatus;
    title: Scalars['String']['input'];
    tmdbId?: InputMaybe<Scalars['Int']['input']>;
    topics: Array<Scalars['String']['input']>;
};

export interface GqlSAdminMediaTmdbMovieResult {
    __typename?: 'AdminMediaTmdbMovieResult';
    overview?: Maybe<Scalars['String']['output']>;
    posterUrl?: Maybe<Scalars['String']['output']>;
    releaseDate?: Maybe<Scalars['Date']['output']>;
    title: Scalars['String']['output'];
    tmdbId: Scalars['Int']['output'];
}

export interface GqlSAdminMediaTmdbTvResult {
    __typename?: 'AdminMediaTmdbTvResult';
    firstAirDate?: Maybe<Scalars['Date']['output']>;
    overview?: Maybe<Scalars['String']['output']>;
    posterUrl?: Maybe<Scalars['String']['output']>;
    title: Scalars['String']['output'];
    tmdbId: Scalars['Int']['output'];
}

export type GqlSAdminMediaTopic =
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

export interface GqlSAdminMediaYoutubeChannelResult {
    __typename?: 'AdminMediaYoutubeChannelResult';
    avatarUrl?: Maybe<Scalars['String']['output']>;
    canonicalUrl: Scalars['String']['output'];
    channelId: Scalars['String']['output'];
    description?: Maybe<Scalars['String']['output']>;
    handle?: Maybe<Scalars['String']['output']>;
    subscriberCount?: Maybe<Scalars['Int']['output']>;
    title: Scalars['String']['output'];
}

export interface GqlSAdminMedicalAppointment {
    __typename?: 'AdminMedicalAppointment';
    appointmentId: Scalars['ID']['output'];
    category: GqlSAdminMedicalCategory;
    completedAt?: Maybe<Scalars['DateTime']['output']>;
    createdAt: Scalars['DateTime']['output'];
    nextDueAt?: Maybe<Scalars['DateTime']['output']>;
    notes?: Maybe<Scalars['String']['output']>;
    providerName?: Maybe<Scalars['String']['output']>;
    scheduledAt: Scalars['DateTime']['output'];
    status: GqlSAdminMedicalAppointmentStatus;
    title: Scalars['String']['output'];
    topics: Array<Scalars['String']['output']>;
    updatedAt: Scalars['DateTime']['output'];
}

export type GqlSAdminMedicalAppointmentInput = {
    appointmentId?: InputMaybe<Scalars['ID']['input']>;
    category: GqlSAdminMedicalCategory;
    completedAt?: InputMaybe<Scalars['DateTime']['input']>;
    nextDueAt?: InputMaybe<Scalars['DateTime']['input']>;
    notes?: InputMaybe<Scalars['String']['input']>;
    providerName?: InputMaybe<Scalars['String']['input']>;
    scheduledAt: Scalars['DateTime']['input'];
    status: GqlSAdminMedicalAppointmentStatus;
    title: Scalars['String']['input'];
    topics: Array<Scalars['String']['input']>;
};

export type GqlSAdminMedicalAppointmentStatus = 'cancelled' | 'completed' | 'missed' | 'scheduled';

export type GqlSAdminMedicalCategory = 'dentist' | 'dermatology' | 'ent' | 'eyes' | 'gp' | 'mentalHealth' | 'other' | 'physio';

export interface GqlSAdminMedicalCategoryOverview {
    __typename?: 'AdminMedicalCategoryOverview';
    category: GqlSAdminMedicalCategory;
    defaultCadenceMonths?: Maybe<Scalars['Int']['output']>;
    isOverdue: Scalars['Boolean']['output'];
    lastCompletedAt?: Maybe<Scalars['DateTime']['output']>;
    nextDueAt?: Maybe<Scalars['DateTime']['output']>;
    recentRecords: Array<GqlSAdminMedicalRecord>;
    upcoming: Array<GqlSAdminMedicalAppointment>;
}

export interface GqlSAdminMedicalQuery {
    __typename?: 'AdminMedicalQuery';
    adminMedicalAppointmentFindMany: Array<GqlSAdminMedicalAppointment>;
    adminMedicalCategoryOverviewFindMany: Array<GqlSAdminMedicalCategoryOverview>;
    adminMedicalRecordFindMany: Array<GqlSAdminMedicalRecord>;
}

export interface GqlSAdminMedicalRecord {
    __typename?: 'AdminMedicalRecord';
    appointmentId?: Maybe<Scalars['ID']['output']>;
    bodyAreas: Array<Scalars['String']['output']>;
    category: GqlSAdminMedicalCategory;
    createdAt: Scalars['DateTime']['output'];
    files: Array<GqlSAdminMedicalRecordFile>;
    occurredAt?: Maybe<Scalars['DateTime']['output']>;
    recordId: Scalars['ID']['output'];
    resolvedAt?: Maybe<Scalars['DateTime']['output']>;
    severity?: Maybe<GqlSAdminMedicalRecordSeverity>;
    summary: Scalars['String']['output'];
    symptoms: Array<Scalars['String']['output']>;
    title: Scalars['String']['output'];
    topics: Array<Scalars['String']['output']>;
    updatedAt: Scalars['DateTime']['output'];
}

export interface GqlSAdminMedicalRecordFile {
    __typename?: 'AdminMedicalRecordFile';
    createdAt: Scalars['DateTime']['output'];
    fileUpload: GqlSFileUpload;
    label?: Maybe<Scalars['String']['output']>;
    pinned: Scalars['Boolean']['output'];
    recordFileId: Scalars['ID']['output'];
    recordId: Scalars['ID']['output'];
    updatedAt: Scalars['DateTime']['output'];
}

export type GqlSAdminMedicalRecordFileAttachInput = {
    fileUploadId: Scalars['ID']['input'];
    label?: InputMaybe<Scalars['String']['input']>;
    pinned?: InputMaybe<Scalars['Boolean']['input']>;
    recordId: Scalars['ID']['input'];
};

export type GqlSAdminMedicalRecordInput = {
    appointmentId?: InputMaybe<Scalars['ID']['input']>;
    bodyAreas: Array<Scalars['String']['input']>;
    category: GqlSAdminMedicalCategory;
    fileUploadIds?: InputMaybe<Array<Scalars['ID']['input']>>;
    occurredAt?: InputMaybe<Scalars['DateTime']['input']>;
    recordId?: InputMaybe<Scalars['ID']['input']>;
    resolvedAt?: InputMaybe<Scalars['DateTime']['input']>;
    severity?: InputMaybe<GqlSAdminMedicalRecordSeverity>;
    summary: Scalars['String']['input'];
    symptoms: Array<Scalars['String']['input']>;
    title: Scalars['String']['input'];
    topics: Array<Scalars['String']['input']>;
};

export type GqlSAdminMedicalRecordSeverity = 'info' | 'mild' | 'moderate' | 'severe';

export interface GqlSAdminMutation {
    __typename?: 'AdminMutation';
    adminFinancesMonthlyNetIncomeSet: GqlSMutationResult;
    adminFinancesRecurringCostsDelete: GqlSMutationResult;
    adminFinancesRecurringCostsUpsert: GqlSMutationResult;
    adminFitnessExercisesDelete: GqlSMutationResult;
    adminFitnessExercisesUpsert: GqlSMutationResult;
    adminFitnessWorkoutRoutineItemsDelete: GqlSMutationResult;
    adminFitnessWorkoutRoutineItemsUpsert: GqlSMutationResult;
    adminFitnessWorkoutRoutinesDelete: GqlSMutationResult;
    adminFitnessWorkoutRoutinesUpsert: GqlSMutationResult;
    adminFitnessWorkoutSessionsDelete: GqlSMutationResult;
    adminFitnessWorkoutSessionsUpsert: GqlSMutationResult;
    adminFitnessWorkoutSetsDelete: GqlSMutationResult;
    adminFitnessWorkoutSetsUpsert: GqlSMutationResult;
    adminInventoryItemFilesAttach: GqlSMutationResult;
    adminInventoryItemFilesDelete: GqlSMutationResult;
    adminInventoryItemFilesUpsert: GqlSMutationResult;
    adminInventoryItemServiceEntriesDelete: GqlSMutationResult;
    adminInventoryItemServiceEntriesUpsert: GqlSMutationResult;
    adminInventoryItemsDelete: GqlSMutationResult;
    adminInventoryItemsReprice: GqlSMutationResult;
    adminInventoryItemsUpsert: GqlSMutationResult;
    adminMediaChannelReorder: GqlSMutationResult;
    adminMediaChannelsDelete: GqlSMutationResult;
    adminMediaChannelsUpsert: GqlSMutationResult;
    adminMediaMoviesAddFromTmdb: GqlSMutationResult;
    adminMediaMoviesDelete: GqlSMutationResult;
    adminMediaMoviesUpsert: GqlSMutationResult;
    adminMediaShowsAddFromTmdb: GqlSMutationResult;
    adminMediaShowsDelete: GqlSMutationResult;
    adminMediaShowsUpsert: GqlSMutationResult;
    adminMedicalAppointmentsDelete: GqlSMutationResult;
    adminMedicalAppointmentsUpsert: GqlSMutationResult;
    adminMedicalRecordFilesAttach: GqlSMutationResult;
    adminMedicalRecordFilesDelete: GqlSMutationResult;
    adminMedicalRecordsDelete: GqlSMutationResult;
    adminMedicalRecordsUpsert: GqlSMutationResult;
    adminNutritionFoodLogEntriesDelete: GqlSMutationResult;
    adminNutritionFoodLogEntriesUpsert: GqlSMutationResult;
    adminNutritionMealPlanEntriesDelete: GqlSMutationResult;
    adminNutritionMealPlanEntriesUpsert: GqlSMutationResult;
    adminNutritionRecipesDelete: GqlSMutationResult;
    adminNutritionRecipesUpsert: GqlSMutationResult;
    adminNutritionSupplementNutrientsReplace: GqlSMutationResult;
    adminNutritionSupplementResearch: GqlSAdminNutritionSupplementResearchResult;
    adminNutritionSupplementsDelete: GqlSMutationResult;
    adminNutritionSupplementsUpsert: GqlSMutationResult;
    adminProjectActivitiesDelete: GqlSMutationResult;
    adminProjectActivitiesUpsert: GqlSMutationResult;
    adminProjectFilesDelete: GqlSMutationResult;
    adminProjectFilesUpsert: GqlSMutationResult;
    adminProjectLinksDelete: GqlSMutationResult;
    adminProjectLinksUpsert: GqlSMutationResult;
    adminProjectReorder: GqlSMutationResult;
    adminProjectRequestArchive: GqlSMutationResult;
    adminProjectRequestDelete: GqlSMutationResult;
    adminProjectTaskReorder: GqlSMutationResult;
    adminProjectTasksDelete: GqlSMutationResult;
    adminProjectTasksUpsert: GqlSMutationResult;
    adminProjectTimersStart: GqlSMutationResult;
    adminProjectTimersStop: GqlSMutationResult;
    adminProjectsDelete: GqlSMutationResult;
    adminProjectsUpsert: GqlSMutationResult;
    adminTaxDocumentsDelete: GqlSMutationResult;
    adminTaxDocumentsUpsert: GqlSMutationResult;
    adminTaxExpensesDelete: GqlSMutationResult;
    adminTaxExpensesUpsert: GqlSMutationResult;
    adminTaxFilesAttach: GqlSMutationResult;
    adminTaxFilesDelete: GqlSMutationResult;
    adminTaxFilesUpsert: GqlSMutationResult;
    adminTaxIncomeSourcesDelete: GqlSMutationResult;
    adminTaxIncomeSourcesUpsert: GqlSMutationResult;
    adminTaxYearsDelete: GqlSMutationResult;
    /** Create or update tax years. Inserting a new year also seeds its default document checklist. */
    adminTaxYearsUpsert: GqlSMutationResult;
    adminTravelTripActivitiesDelete: GqlSMutationResult;
    adminTravelTripActivitiesUpsert: GqlSMutationResult;
    adminTravelTripDaysDelete: GqlSMutationResult;
    adminTravelTripDaysUpsert: GqlSMutationResult;
    adminTravelTripPackingItemsDelete: GqlSMutationResult;
    adminTravelTripPackingItemsUpsert: GqlSMutationResult;
    adminTravelTripsDelete: GqlSMutationResult;
    adminTravelTripsUpsert: GqlSMutationResult;
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
}

export type GqlSAdminMutationAdminFinancesMonthlyNetIncomeSetArgs = {
    amountCents?: InputMaybe<Scalars['Int']['input']>;
};

export type GqlSAdminMutationAdminFinancesRecurringCostsDeleteArgs = {
    costIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationAdminFinancesRecurringCostsUpsertArgs = {
    financeRecurringCosts: Array<GqlSAdminFinancesRecurringCostInput>;
};

export type GqlSAdminMutationAdminFitnessExercisesDeleteArgs = {
    exerciseIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationAdminFitnessExercisesUpsertArgs = {
    exercises: Array<GqlSAdminFitnessExerciseInput>;
};

export type GqlSAdminMutationAdminFitnessWorkoutRoutineItemsDeleteArgs = {
    routineItemIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationAdminFitnessWorkoutRoutineItemsUpsertArgs = {
    workoutRoutineItems: Array<GqlSAdminFitnessWorkoutRoutineItemInput>;
};

export type GqlSAdminMutationAdminFitnessWorkoutRoutinesDeleteArgs = {
    routineIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationAdminFitnessWorkoutRoutinesUpsertArgs = {
    workoutRoutines: Array<GqlSAdminFitnessWorkoutRoutineInput>;
};

export type GqlSAdminMutationAdminFitnessWorkoutSessionsDeleteArgs = {
    sessionIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationAdminFitnessWorkoutSessionsUpsertArgs = {
    workoutSessions: Array<GqlSAdminFitnessWorkoutSessionInput>;
};

export type GqlSAdminMutationAdminFitnessWorkoutSetsDeleteArgs = {
    setIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationAdminFitnessWorkoutSetsUpsertArgs = {
    workoutSets: Array<GqlSAdminFitnessWorkoutSetInput>;
};

export type GqlSAdminMutationAdminInventoryItemFilesAttachArgs = {
    inputs: Array<GqlSAdminInventoryItemFileAttachInput>;
};

export type GqlSAdminMutationAdminInventoryItemFilesDeleteArgs = {
    itemFileIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationAdminInventoryItemFilesUpsertArgs = {
    itemFiles: Array<GqlSAdminInventoryItemFileUpsert>;
};

export type GqlSAdminMutationAdminInventoryItemServiceEntriesDeleteArgs = {
    serviceEntryIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationAdminInventoryItemServiceEntriesUpsertArgs = {
    itemServiceEntries: Array<GqlSAdminInventoryItemServiceEntryInput>;
};

export type GqlSAdminMutationAdminInventoryItemsDeleteArgs = {
    itemIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationAdminInventoryItemsRepriceArgs = {
    inputs: Array<GqlSAdminInventoryItemRepriceInput>;
};

export type GqlSAdminMutationAdminInventoryItemsUpsertArgs = {
    items: Array<GqlSAdminInventoryItemInput>;
};

export type GqlSAdminMutationAdminMediaChannelReorderArgs = {
    orderedIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationAdminMediaChannelsDeleteArgs = {
    channelIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationAdminMediaChannelsUpsertArgs = {
    mediaChannels: Array<GqlSAdminMediaChannelInput>;
};

export type GqlSAdminMutationAdminMediaMoviesAddFromTmdbArgs = {
    inputs: Array<GqlSAdminMediaMovieAddFromTmdbInput>;
};

export type GqlSAdminMutationAdminMediaMoviesDeleteArgs = {
    movieIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationAdminMediaMoviesUpsertArgs = {
    movies: Array<GqlSAdminMediaMovieInput>;
};

export type GqlSAdminMutationAdminMediaShowsAddFromTmdbArgs = {
    inputs: Array<GqlSAdminMediaShowAddFromTmdbInput>;
};

export type GqlSAdminMutationAdminMediaShowsDeleteArgs = {
    showIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationAdminMediaShowsUpsertArgs = {
    shows: Array<GqlSAdminMediaShowInput>;
};

export type GqlSAdminMutationAdminMedicalAppointmentsDeleteArgs = {
    appointmentIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationAdminMedicalAppointmentsUpsertArgs = {
    medicalAppointments: Array<GqlSAdminMedicalAppointmentInput>;
};

export type GqlSAdminMutationAdminMedicalRecordFilesAttachArgs = {
    inputs: Array<GqlSAdminMedicalRecordFileAttachInput>;
};

export type GqlSAdminMutationAdminMedicalRecordFilesDeleteArgs = {
    recordFileIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationAdminMedicalRecordsDeleteArgs = {
    recordIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationAdminMedicalRecordsUpsertArgs = {
    medicalRecords: Array<GqlSAdminMedicalRecordInput>;
};

export type GqlSAdminMutationAdminNutritionFoodLogEntriesDeleteArgs = {
    logIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationAdminNutritionFoodLogEntriesUpsertArgs = {
    foodLogEntries: Array<GqlSAdminNutritionFoodLogEntryInput>;
};

export type GqlSAdminMutationAdminNutritionMealPlanEntriesDeleteArgs = {
    entryIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationAdminNutritionMealPlanEntriesUpsertArgs = {
    mealPlanEntries: Array<GqlSAdminNutritionMealPlanEntryInput>;
};

export type GqlSAdminMutationAdminNutritionRecipesDeleteArgs = {
    recipeIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationAdminNutritionRecipesUpsertArgs = {
    recipes: Array<GqlSAdminNutritionRecipeInput>;
};

export type GqlSAdminMutationAdminNutritionSupplementNutrientsReplaceArgs = {
    nutrients: Array<GqlSAdminNutritionSupplementNutrientInput>;
    supplementId: Scalars['ID']['input'];
};

export type GqlSAdminMutationAdminNutritionSupplementResearchArgs = {
    input: GqlSAdminNutritionSupplementResearchInput;
};

export type GqlSAdminMutationAdminNutritionSupplementsDeleteArgs = {
    supplementIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationAdminNutritionSupplementsUpsertArgs = {
    supplements: Array<GqlSAdminNutritionSupplementInput>;
};

export type GqlSAdminMutationAdminProjectActivitiesDeleteArgs = {
    activityIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationAdminProjectActivitiesUpsertArgs = {
    projectActivities: Array<GqlSAdminProjectActivityCreate>;
};

export type GqlSAdminMutationAdminProjectFilesDeleteArgs = {
    projectFileIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationAdminProjectFilesUpsertArgs = {
    projectFiles: Array<GqlSAdminProjectFileUpsert>;
};

export type GqlSAdminMutationAdminProjectLinksDeleteArgs = {
    projectLinkIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationAdminProjectLinksUpsertArgs = {
    projectLinks: Array<GqlSAdminProjectLinkUpsert>;
};

export type GqlSAdminMutationAdminProjectReorderArgs = {
    orderedIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationAdminProjectRequestArchiveArgs = {
    projectRequestId: Scalars['ID']['input'];
};

export type GqlSAdminMutationAdminProjectRequestDeleteArgs = {
    projectRequestId: Scalars['ID']['input'];
};

export type GqlSAdminMutationAdminProjectTaskReorderArgs = {
    orderedIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationAdminProjectTasksDeleteArgs = {
    taskIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationAdminProjectTasksUpsertArgs = {
    tasks: Array<GqlSAdminProjectTaskCreate>;
};

export type GqlSAdminMutationAdminProjectTimersStartArgs = {
    inputs: Array<GqlSAdminProjectTimerStartInput>;
};

export type GqlSAdminMutationAdminProjectTimersStopArgs = {
    activityIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationAdminProjectsDeleteArgs = {
    projectIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationAdminProjectsUpsertArgs = {
    projects: Array<GqlSAdminProjectCreate>;
};

export type GqlSAdminMutationAdminTaxDocumentsDeleteArgs = {
    documentIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationAdminTaxDocumentsUpsertArgs = {
    taxDocuments: Array<GqlSAdminTaxDocumentInput>;
};

export type GqlSAdminMutationAdminTaxExpensesDeleteArgs = {
    expenseIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationAdminTaxExpensesUpsertArgs = {
    taxExpenses: Array<GqlSAdminTaxExpenseInput>;
};

export type GqlSAdminMutationAdminTaxFilesAttachArgs = {
    inputs: Array<GqlSAdminTaxFileAttachInput>;
};

export type GqlSAdminMutationAdminTaxFilesDeleteArgs = {
    taxFileIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationAdminTaxFilesUpsertArgs = {
    inputs: Array<GqlSAdminTaxFileUpsert>;
};

export type GqlSAdminMutationAdminTaxIncomeSourcesDeleteArgs = {
    incomeSourceIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationAdminTaxIncomeSourcesUpsertArgs = {
    taxIncomeSources: Array<GqlSAdminTaxIncomeSourceInput>;
};

export type GqlSAdminMutationAdminTaxYearsDeleteArgs = {
    taxYearIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationAdminTaxYearsUpsertArgs = {
    taxYears: Array<GqlSAdminTaxYearInput>;
};

export type GqlSAdminMutationAdminTravelTripActivitiesDeleteArgs = {
    tripActivityIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationAdminTravelTripActivitiesUpsertArgs = {
    tripActivities: Array<GqlSAdminTravelTripActivityInput>;
};

export type GqlSAdminMutationAdminTravelTripDaysDeleteArgs = {
    tripDayIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationAdminTravelTripDaysUpsertArgs = {
    tripDays: Array<GqlSAdminTravelTripDayInput>;
};

export type GqlSAdminMutationAdminTravelTripPackingItemsDeleteArgs = {
    tripPackingItemIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationAdminTravelTripPackingItemsUpsertArgs = {
    tripPackingItems: Array<GqlSAdminTravelTripPackingItemInput>;
};

export type GqlSAdminMutationAdminTravelTripsDeleteArgs = {
    tripIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationAdminTravelTripsUpsertArgs = {
    trips: Array<GqlSAdminTravelTripInput>;
};

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

export interface GqlSAdminNutritionFoodLogEntry {
    __typename?: 'AdminNutritionFoodLogEntry';
    consumedAt: Scalars['DateTime']['output'];
    createdAt: Scalars['DateTime']['output'];
    description: Scalars['String']['output'];
    kind: GqlSAdminNutritionFoodLogKind;
    logId: Scalars['ID']['output'];
    mealType: GqlSAdminNutritionMealType;
    notes?: Maybe<Scalars['String']['output']>;
    recipe?: Maybe<GqlSAdminNutritionRecipe>;
    updatedAt: Scalars['DateTime']['output'];
}

export type GqlSAdminNutritionFoodLogEntryInput = {
    consumedAt: Scalars['DateTime']['input'];
    description: Scalars['String']['input'];
    kind: GqlSAdminNutritionFoodLogKind;
    logId?: InputMaybe<Scalars['ID']['input']>;
    mealType: GqlSAdminNutritionMealType;
    notes?: InputMaybe<Scalars['String']['input']>;
    recipeId?: InputMaybe<Scalars['ID']['input']>;
};

export type GqlSAdminNutritionFoodLogKind = 'drink' | 'food';

export interface GqlSAdminNutritionMealPlanEntry {
    __typename?: 'AdminNutritionMealPlanEntry';
    createdAt: Scalars['DateTime']['output'];
    customText?: Maybe<Scalars['String']['output']>;
    date: Scalars['Date']['output'];
    entryId: Scalars['ID']['output'];
    mealType: GqlSAdminNutritionMealType;
    notes?: Maybe<Scalars['String']['output']>;
    recipe?: Maybe<GqlSAdminNutritionRecipe>;
    updatedAt: Scalars['DateTime']['output'];
}

export type GqlSAdminNutritionMealPlanEntryInput = {
    customText?: InputMaybe<Scalars['String']['input']>;
    date: Scalars['Date']['input'];
    entryId?: InputMaybe<Scalars['ID']['input']>;
    mealType: GqlSAdminNutritionMealType;
    notes?: InputMaybe<Scalars['String']['input']>;
    recipeId?: InputMaybe<Scalars['ID']['input']>;
};

export type GqlSAdminNutritionMealType = 'breakfast' | 'dinner' | 'lunch' | 'other' | 'snack';

export interface GqlSAdminNutritionQuery {
    __typename?: 'AdminNutritionQuery';
    adminNutritionFoodLogFindMany: Array<GqlSAdminNutritionFoodLogEntry>;
    adminNutritionMealPlanFindMany: Array<GqlSAdminNutritionMealPlanEntry>;
    adminNutritionRecipeFindMany: Array<GqlSAdminNutritionRecipe>;
    adminNutritionSupplementFindMany: Array<GqlSAdminNutritionSupplement>;
}

export type GqlSAdminNutritionQueryAdminNutritionRecipeFindManyArgs = {
    favorite?: InputMaybe<Scalars['Boolean']['input']>;
    mealType?: InputMaybe<GqlSAdminNutritionMealType>;
};

export interface GqlSAdminNutritionRecipe {
    __typename?: 'AdminNutritionRecipe';
    createdAt: Scalars['DateTime']['output'];
    ingredients: Array<Scalars['String']['output']>;
    isFavorite: Scalars['Boolean']['output'];
    lastMadeAt?: Maybe<Scalars['DateTime']['output']>;
    mealType: GqlSAdminNutritionMealType;
    notes?: Maybe<Scalars['String']['output']>;
    prepTimeMinutes?: Maybe<Scalars['Int']['output']>;
    rating?: Maybe<Scalars['Int']['output']>;
    recipeId: Scalars['ID']['output'];
    servings?: Maybe<Scalars['Int']['output']>;
    sourceUrl?: Maybe<Scalars['String']['output']>;
    steps?: Maybe<Scalars['String']['output']>;
    tags: Array<Scalars['String']['output']>;
    title: Scalars['String']['output'];
    updatedAt: Scalars['DateTime']['output'];
}

export type GqlSAdminNutritionRecipeInput = {
    ingredients?: InputMaybe<Array<Scalars['String']['input']>>;
    isFavorite?: InputMaybe<Scalars['Boolean']['input']>;
    lastMadeAt?: InputMaybe<Scalars['DateTime']['input']>;
    mealType: GqlSAdminNutritionMealType;
    notes?: InputMaybe<Scalars['String']['input']>;
    prepTimeMinutes?: InputMaybe<Scalars['Int']['input']>;
    rating?: InputMaybe<Scalars['Int']['input']>;
    recipeId?: InputMaybe<Scalars['ID']['input']>;
    servings?: InputMaybe<Scalars['Int']['input']>;
    sourceUrl?: InputMaybe<Scalars['String']['input']>;
    steps?: InputMaybe<Scalars['String']['input']>;
    tags?: InputMaybe<Array<Scalars['String']['input']>>;
    title: Scalars['String']['input'];
};

export interface GqlSAdminNutritionSupplement {
    __typename?: 'AdminNutritionSupplement';
    brand?: Maybe<Scalars['String']['output']>;
    createdAt: Scalars['DateTime']['output'];
    name: Scalars['String']['output'];
    notes?: Maybe<Scalars['String']['output']>;
    nutrients: Array<GqlSAdminNutritionSupplementNutrient>;
    researchedAt?: Maybe<Scalars['DateTime']['output']>;
    servingSize?: Maybe<Scalars['String']['output']>;
    servingsPerContainer?: Maybe<Scalars['Int']['output']>;
    sourceUrl?: Maybe<Scalars['String']['output']>;
    supplementId: Scalars['ID']['output'];
    updatedAt: Scalars['DateTime']['output'];
}

export type GqlSAdminNutritionSupplementInput = {
    brand?: InputMaybe<Scalars['String']['input']>;
    name: Scalars['String']['input'];
    notes?: InputMaybe<Scalars['String']['input']>;
    researchedAt?: InputMaybe<Scalars['DateTime']['input']>;
    servingSize?: InputMaybe<Scalars['String']['input']>;
    servingsPerContainer?: InputMaybe<Scalars['Int']['input']>;
    sourceUrl?: InputMaybe<Scalars['String']['input']>;
    supplementId?: InputMaybe<Scalars['ID']['input']>;
};

export interface GqlSAdminNutritionSupplementNutrient {
    __typename?: 'AdminNutritionSupplementNutrient';
    amount?: Maybe<Scalars['String']['output']>;
    name: Scalars['String']['output'];
    nutrientId: Scalars['ID']['output'];
    percentDailyValue?: Maybe<Scalars['Int']['output']>;
    sortOrder: Scalars['Int']['output'];
    unit?: Maybe<Scalars['String']['output']>;
}

export type GqlSAdminNutritionSupplementNutrientInput = {
    amount?: InputMaybe<Scalars['String']['input']>;
    name: Scalars['String']['input'];
    percentDailyValue?: InputMaybe<Scalars['Int']['input']>;
    sortOrder?: InputMaybe<Scalars['Int']['input']>;
    unit?: InputMaybe<Scalars['String']['input']>;
};

export interface GqlSAdminNutritionSupplementNutrientProposal {
    __typename?: 'AdminNutritionSupplementNutrientProposal';
    amount?: Maybe<Scalars['String']['output']>;
    name: Scalars['String']['output'];
    percentDailyValue?: Maybe<Scalars['Int']['output']>;
    unit?: Maybe<Scalars['String']['output']>;
}

export type GqlSAdminNutritionSupplementResearchInput = {
    brand?: InputMaybe<Scalars['String']['input']>;
    name: Scalars['String']['input'];
};

export interface GqlSAdminNutritionSupplementResearchResult {
    __typename?: 'AdminNutritionSupplementResearchResult';
    brand?: Maybe<Scalars['String']['output']>;
    found: Scalars['Boolean']['output'];
    notes?: Maybe<Scalars['String']['output']>;
    nutrients: Array<GqlSAdminNutritionSupplementNutrientProposal>;
    servingSize?: Maybe<Scalars['String']['output']>;
    servingsPerContainer?: Maybe<Scalars['Int']['output']>;
    sourceUrl?: Maybe<Scalars['String']['output']>;
    summary: Scalars['String']['output'];
}

export interface GqlSAdminProject {
    __typename?: 'AdminProject';
    activities: Array<GqlSAdminProjectActivity>;
    completedAt?: Maybe<Scalars['DateTime']['output']>;
    createdAt: Scalars['DateTime']['output'];
    description?: Maybe<Scalars['String']['output']>;
    files: Array<GqlSAdminProjectFile>;
    links: Array<GqlSAdminProjectLink>;
    notes?: Maybe<Scalars['String']['output']>;
    position: Scalars['Int']['output'];
    projectId: Scalars['ID']['output'];
    sourceRequest?: Maybe<GqlSAdminProjectRequest>;
    startedAt?: Maybe<Scalars['DateTime']['output']>;
    status: GqlSAdminProjectStatus;
    tasks: Array<GqlSAdminProjectTask>;
    title: Scalars['String']['output'];
    totalWorkSec: Scalars['Int']['output'];
    updatedAt: Scalars['DateTime']['output'];
}

export interface GqlSAdminProjectActivity {
    __typename?: 'AdminProjectActivity';
    activityId: Scalars['ID']['output'];
    amountCents?: Maybe<Scalars['Int']['output']>;
    channel?: Maybe<GqlSAdminProjectActivityChannel>;
    createdAt: Scalars['DateTime']['output'];
    direction: GqlSAdminProjectActivityDirection;
    durationSec?: Maybe<Scalars['Int']['output']>;
    endedAt?: Maybe<Scalars['DateTime']['output']>;
    files: Array<GqlSAdminProjectFile>;
    kind: GqlSAdminProjectActivityKind;
    links: Array<GqlSAdminProjectLink>;
    notes?: Maybe<Scalars['String']['output']>;
    occurredAt: Scalars['DateTime']['output'];
    offerStatus?: Maybe<GqlSAdminProjectOfferStatus>;
    projectId: Scalars['ID']['output'];
    startedAt?: Maybe<Scalars['DateTime']['output']>;
    taskId?: Maybe<Scalars['ID']['output']>;
    title: Scalars['String']['output'];
    updatedAt: Scalars['DateTime']['output'];
}

export type GqlSAdminProjectActivityChannel = 'aiAssistant' | 'email' | 'inPerson' | 'malt' | 'other' | 'phone' | 'videoCall';

export type GqlSAdminProjectActivityCreate = {
    activityId?: InputMaybe<Scalars['ID']['input']>;
    amountCents?: InputMaybe<Scalars['Int']['input']>;
    attachFileKind?: InputMaybe<GqlSAdminProjectFileKind>;
    attachFileLabel?: InputMaybe<Scalars['String']['input']>;
    attachFilePinned?: InputMaybe<Scalars['Boolean']['input']>;
    attachFileUploadId?: InputMaybe<Scalars['ID']['input']>;
    attachLinkKind?: InputMaybe<GqlSAdminProjectLinkKind>;
    attachLinkLabel?: InputMaybe<Scalars['String']['input']>;
    attachLinkPinned?: InputMaybe<Scalars['Boolean']['input']>;
    attachLinkUrl?: InputMaybe<Scalars['String']['input']>;
    channel?: InputMaybe<GqlSAdminProjectActivityChannel>;
    direction?: InputMaybe<GqlSAdminProjectActivityDirection>;
    durationSec?: InputMaybe<Scalars['Int']['input']>;
    kind: GqlSAdminProjectActivityKind;
    notes?: InputMaybe<Scalars['String']['input']>;
    occurredAt: Scalars['DateTime']['input'];
    offerStatus?: InputMaybe<GqlSAdminProjectOfferStatus>;
    projectId: Scalars['ID']['input'];
    taskId?: InputMaybe<Scalars['ID']['input']>;
    title: Scalars['String']['input'];
};

export type GqlSAdminProjectActivityDirection = 'incoming' | 'internal' | 'outgoing';

export type GqlSAdminProjectActivityKind = 'clientContact' | 'meeting' | 'milestone' | 'note' | 'offer' | 'work';

export type GqlSAdminProjectCreate = {
    completedAt?: InputMaybe<Scalars['DateTime']['input']>;
    description?: InputMaybe<Scalars['String']['input']>;
    notes?: InputMaybe<Scalars['String']['input']>;
    position?: InputMaybe<Scalars['Int']['input']>;
    projectId?: InputMaybe<Scalars['ID']['input']>;
    sourceRequestId?: InputMaybe<Scalars['ID']['input']>;
    startedAt?: InputMaybe<Scalars['DateTime']['input']>;
    status: GqlSAdminProjectStatus;
    title: Scalars['String']['input'];
};

export interface GqlSAdminProjectFile {
    __typename?: 'AdminProjectFile';
    activityId?: Maybe<Scalars['ID']['output']>;
    createdAt: Scalars['DateTime']['output'];
    fileUpload: GqlSFileUpload;
    kind: GqlSAdminProjectFileKind;
    label?: Maybe<Scalars['String']['output']>;
    pinned: Scalars['Boolean']['output'];
    projectFileId: Scalars['ID']['output'];
    projectId: Scalars['ID']['output'];
    updatedAt: Scalars['DateTime']['output'];
}

export type GqlSAdminProjectFileKind = 'contract' | 'invoice' | 'offer' | 'other' | 'screenshot';

export type GqlSAdminProjectFileUpsert = {
    activityId?: InputMaybe<Scalars['ID']['input']>;
    fileUploadId: Scalars['ID']['input'];
    kind: GqlSAdminProjectFileKind;
    label?: InputMaybe<Scalars['String']['input']>;
    pinned?: InputMaybe<Scalars['Boolean']['input']>;
    projectFileId?: InputMaybe<Scalars['ID']['input']>;
    projectId: Scalars['ID']['input'];
};

export interface GqlSAdminProjectLink {
    __typename?: 'AdminProjectLink';
    activityId?: Maybe<Scalars['ID']['output']>;
    createdAt: Scalars['DateTime']['output'];
    kind: GqlSAdminProjectLinkKind;
    label?: Maybe<Scalars['String']['output']>;
    pinned: Scalars['Boolean']['output'];
    projectId: Scalars['ID']['output'];
    projectLinkId: Scalars['ID']['output'];
    updatedAt: Scalars['DateTime']['output'];
    url: Scalars['String']['output'];
}

export type GqlSAdminProjectLinkKind = 'figma' | 'gdrive' | 'github' | 'invoice' | 'malt' | 'notion' | 'offer' | 'other';

export type GqlSAdminProjectLinkUpsert = {
    activityId?: InputMaybe<Scalars['ID']['input']>;
    kind: GqlSAdminProjectLinkKind;
    label?: InputMaybe<Scalars['String']['input']>;
    pinned?: InputMaybe<Scalars['Boolean']['input']>;
    projectId: Scalars['ID']['input'];
    projectLinkId?: InputMaybe<Scalars['ID']['input']>;
    url: Scalars['String']['input'];
};

export type GqlSAdminProjectOfferStatus = 'accepted' | 'rejected' | 'sent' | 'withdrawn';

export interface GqlSAdminProjectRequest {
    __typename?: 'AdminProjectRequest';
    budget?: Maybe<Scalars['String']['output']>;
    chatId?: Maybe<Scalars['ID']['output']>;
    company?: Maybe<Scalars['String']['output']>;
    convertedProject?: Maybe<GqlSAdminProject>;
    createdAt: Scalars['DateTime']['output'];
    description: Scalars['String']['output'];
    email: Scalars['String']['output'];
    name: Scalars['String']['output'];
    projectRequestId: Scalars['ID']['output'];
    projectType: GqlSAdminProjectRequestType;
    status: GqlSAdminProjectRequestStatus;
    timeline?: Maybe<Scalars['String']['output']>;
    updatedAt: Scalars['DateTime']['output'];
    verifiedAt?: Maybe<Scalars['DateTime']['output']>;
}

export type GqlSAdminProjectRequestStatus = 'archived' | 'emailVerified' | 'pendingOtp';

export type GqlSAdminProjectRequestType = 'aiIntegration' | 'consulting' | 'mobile' | 'other' | 'webApp';

export type GqlSAdminProjectStatus = 'active' | 'archived' | 'done' | 'idea' | 'paused' | 'planning';

export interface GqlSAdminProjectTask {
    __typename?: 'AdminProjectTask';
    completedAt?: Maybe<Scalars['DateTime']['output']>;
    createdAt: Scalars['DateTime']['output'];
    dueAt?: Maybe<Scalars['DateTime']['output']>;
    effort?: Maybe<GqlSAdminProjectTaskEffort>;
    notes?: Maybe<Scalars['String']['output']>;
    position: Scalars['Int']['output'];
    projectId?: Maybe<Scalars['ID']['output']>;
    status: GqlSAdminProjectTaskStatus;
    taskId: Scalars['ID']['output'];
    title: Scalars['String']['output'];
    updatedAt: Scalars['DateTime']['output'];
    whenBucket?: Maybe<GqlSAdminProjectTaskWhenBucket>;
}

export type GqlSAdminProjectTaskCreate = {
    completedAt?: InputMaybe<Scalars['DateTime']['input']>;
    dueAt?: InputMaybe<Scalars['DateTime']['input']>;
    effort?: InputMaybe<GqlSAdminProjectTaskEffort>;
    notes?: InputMaybe<Scalars['String']['input']>;
    position: Scalars['Int']['input'];
    projectId?: InputMaybe<Scalars['ID']['input']>;
    status: GqlSAdminProjectTaskStatus;
    taskId?: InputMaybe<Scalars['ID']['input']>;
    title: Scalars['String']['input'];
    whenBucket?: InputMaybe<GqlSAdminProjectTaskWhenBucket>;
};

export type GqlSAdminProjectTaskEffort = 'deep' | 'focused' | 'quick';

export type GqlSAdminProjectTaskStatus = 'doing' | 'done' | 'todo';

export type GqlSAdminProjectTaskWhenBucket = 'someday' | 'today' | 'waiting' | 'week';

export type GqlSAdminProjectTimerStartInput = {
    projectId: Scalars['ID']['input'];
    taskId?: InputMaybe<Scalars['ID']['input']>;
    title?: InputMaybe<Scalars['String']['input']>;
};

export interface GqlSAdminTaxDocument {
    __typename?: 'AdminTaxDocument';
    createdAt: Scalars['DateTime']['output'];
    documentId: Scalars['ID']['output'];
    files: Array<GqlSAdminTaxFile>;
    kind: GqlSAdminTaxDocumentKind;
    notes?: Maybe<Scalars['String']['output']>;
    status: GqlSAdminTaxDocumentStatus;
    title: Scalars['String']['output'];
    updatedAt: Scalars['DateTime']['output'];
}

export type GqlSAdminTaxDocumentInput = {
    /** Omit to create; supply to update (e.g. to flip status to received). */
    documentId?: InputMaybe<Scalars['ID']['input']>;
    kind: GqlSAdminTaxDocumentKind;
    notes?: InputMaybe<Scalars['String']['input']>;
    status?: InputMaybe<GqlSAdminTaxDocumentStatus>;
    taxYearId: Scalars['ID']['input'];
    /** Checklist label, e.g. 'Lohnsteuerbescheinigung 2025'. */
    title: Scalars['String']['input'];
};

export type GqlSAdminTaxDocumentKind =
    'bankStatement' | 'donationReceipt' | 'euer' | 'insuranceStatement' | 'lohnsteuerbescheinigung' | 'minijobConfirmation' | 'other';

export type GqlSAdminTaxDocumentStatus = 'needed' | 'notApplicable' | 'received';

export interface GqlSAdminTaxExpense {
    __typename?: 'AdminTaxExpense';
    amountCents: Scalars['Int']['output'];
    categoryKey: GqlSAdminTaxExpenseCategory;
    createdAt: Scalars['DateTime']['output'];
    deductible: Scalars['Boolean']['output'];
    description: Scalars['String']['output'];
    expenseId: Scalars['ID']['output'];
    files: Array<GqlSAdminTaxFile>;
    incomeSourceId?: Maybe<Scalars['ID']['output']>;
    incurredOn?: Maybe<Scalars['Date']['output']>;
    notes?: Maybe<Scalars['String']['output']>;
    updatedAt: Scalars['DateTime']['output'];
}

export type GqlSAdminTaxExpenseCategory =
    'businessExpense' | 'extraordinary' | 'homeOffice' | 'insurance' | 'other' | 'specialExpenses' | 'workRelated';

export type GqlSAdminTaxExpenseInput = {
    /** Amount in cents (e.g. 89900 for 899,00 €). */
    amountCents: Scalars['Int']['input'];
    /** businessExpense=Betriebsausgabe, workRelated=Werbungskosten, specialExpenses=Sonderausgaben, insurance=Vorsorgeaufwendungen, extraordinary=außergewöhnliche Belastung, homeOffice=Homeoffice-Pauschale. */
    categoryKey: GqlSAdminTaxExpenseCategory;
    /** Whether this counts toward the deductible total. Defaults to true. */
    deductible?: InputMaybe<Scalars['Boolean']['input']>;
    /** What the expense was, e.g. 'MacBook Pro' or 'Fahrtkosten Januar'. */
    description: Scalars['String']['input'];
    /** Omit to create; supply to update. */
    expenseId?: InputMaybe<Scalars['ID']['input']>;
    /** Optional link to the income source this expense offsets (Betriebsausgabe ↔ selfEmployment, Werbungskosten ↔ employment). */
    incomeSourceId?: InputMaybe<Scalars['ID']['input']>;
    /** When the expense was incurred, ISO date (yyyy-mm-dd). */
    incurredOn?: InputMaybe<Scalars['Date']['input']>;
    notes?: InputMaybe<Scalars['String']['input']>;
    taxYearId: Scalars['ID']['input'];
};

export interface GqlSAdminTaxFile {
    __typename?: 'AdminTaxFile';
    createdAt: Scalars['DateTime']['output'];
    documentId?: Maybe<Scalars['ID']['output']>;
    expenseId?: Maybe<Scalars['ID']['output']>;
    fileUpload: GqlSFileUpload;
    kind: GqlSAdminTaxFileKind;
    label?: Maybe<Scalars['String']['output']>;
    pinned: Scalars['Boolean']['output'];
    taxFileId: Scalars['ID']['output'];
    taxYearId: Scalars['ID']['output'];
    updatedAt: Scalars['DateTime']['output'];
}

export type GqlSAdminTaxFileAttachInput = {
    /** Optional: attach as a scan of this checklist document. */
    documentId?: InputMaybe<Scalars['ID']['input']>;
    /** Optional: attach as a receipt for this expense. */
    expenseId?: InputMaybe<Scalars['ID']['input']>;
    fileUploadId: Scalars['ID']['input'];
    kind: GqlSAdminTaxFileKind;
    label?: InputMaybe<Scalars['String']['input']>;
    pinned?: InputMaybe<Scalars['Boolean']['input']>;
    taxYearId: Scalars['ID']['input'];
};

export type GqlSAdminTaxFileKind = 'other' | 'receipt' | 'scan' | 'statement';

export type GqlSAdminTaxFileUpsert = {
    label?: InputMaybe<Scalars['String']['input']>;
    pinned?: InputMaybe<Scalars['Boolean']['input']>;
    taxFileId: Scalars['ID']['input'];
};

export type GqlSAdminTaxIncomeKind = 'business' | 'capital' | 'employment' | 'minijob' | 'other' | 'selfEmployment';

export interface GqlSAdminTaxIncomeSource {
    __typename?: 'AdminTaxIncomeSource';
    createdAt: Scalars['DateTime']['output'];
    grossAmountCents?: Maybe<Scalars['Int']['output']>;
    incomeSourceId: Scalars['ID']['output'];
    kind: GqlSAdminTaxIncomeKind;
    label: Scalars['String']['output'];
    notes?: Maybe<Scalars['String']['output']>;
    updatedAt: Scalars['DateTime']['output'];
}

export type GqlSAdminTaxIncomeSourceInput = {
    /** Gross income in cents (e.g. 4500000 for 45.000 €). Omit if not yet known. */
    grossAmountCents?: InputMaybe<Scalars['Int']['input']>;
    /** Omit to create; supply to update. */
    incomeSourceId?: InputMaybe<Scalars['ID']['input']>;
    /** Which Anlage this income belongs to: employment=Anlage N, selfEmployment=Anlage S, business=Anlage G, minijob=geringfügige Beschäftigung, capital=Anlage KAP. */
    kind: GqlSAdminTaxIncomeKind;
    /** Human label, e.g. 'SAP – Festanstellung' or 'Freelance-Entwicklung'. */
    label: Scalars['String']['input'];
    notes?: InputMaybe<Scalars['String']['input']>;
    taxYearId: Scalars['ID']['input'];
};

export interface GqlSAdminTaxQuery {
    __typename?: 'AdminTaxQuery';
    /** Every tax year with its income sources, expenses, documents, and computed totals, newest year first. */
    adminTaxYearFindMany: Array<GqlSAdminTaxYear>;
}

export interface GqlSAdminTaxYear {
    __typename?: 'AdminTaxYear';
    createdAt: Scalars['DateTime']['output'];
    documents: Array<GqlSAdminTaxDocument>;
    expenses: Array<GqlSAdminTaxExpense>;
    filingDeadline?: Maybe<Scalars['Date']['output']>;
    incomeSources: Array<GqlSAdminTaxIncomeSource>;
    notes?: Maybe<Scalars['String']['output']>;
    status: GqlSAdminTaxYearStatus;
    submittedAt?: Maybe<Scalars['DateTime']['output']>;
    taxYearId: Scalars['ID']['output'];
    /** Sum of `amountCents` across expenses where `deductible` is true. */
    totalDeductibleCents: Scalars['Int']['output'];
    /** Sum of `grossAmountCents` across income sources (nulls treated as 0). */
    totalIncomeCents: Scalars['Int']['output'];
    updatedAt: Scalars['DateTime']['output'];
    year: Scalars['Int']['output'];
}

export type GqlSAdminTaxYearInput = {
    /** Filing deadline as an ISO date (yyyy-mm-dd), e.g. 2026-07-31. */
    filingDeadline?: InputMaybe<Scalars['Date']['input']>;
    notes?: InputMaybe<Scalars['String']['input']>;
    status?: InputMaybe<GqlSAdminTaxYearStatus>;
    /** Omit to create a new year; supply to update an existing one. */
    taxYearId?: InputMaybe<Scalars['ID']['input']>;
    /** The calendar year the return covers, e.g. 2025. Must be unique. */
    year: Scalars['Int']['input'];
};

export type GqlSAdminTaxYearStatus = 'closed' | 'collecting' | 'filing' | 'open' | 'submitted';

export interface GqlSAdminTravelQuery {
    __typename?: 'AdminTravelQuery';
    adminTravelTripFindMany: Array<GqlSAdminTravelTrip>;
    adminTravelTripFindOne?: Maybe<GqlSAdminTravelTrip>;
}

export type GqlSAdminTravelQueryAdminTravelTripFindOneArgs = {
    tripId: Scalars['ID']['input'];
};

export type GqlSAdminTravelTransportMode = 'car' | 'ferry' | 'flight' | 'mixed' | 'train';

export interface GqlSAdminTravelTrip {
    __typename?: 'AdminTravelTrip';
    accommodation?: Maybe<Scalars['String']['output']>;
    createdAt: Scalars['DateTime']['output'];
    days: Array<GqlSAdminTravelTripDay>;
    destination: Scalars['String']['output'];
    endsOn?: Maybe<Scalars['Date']['output']>;
    notes?: Maybe<Scalars['String']['output']>;
    packingItems: Array<GqlSAdminTravelTripPackingItem>;
    startsOn?: Maybe<Scalars['Date']['output']>;
    status: GqlSAdminTravelTripStatus;
    title: Scalars['String']['output'];
    transportMode?: Maybe<GqlSAdminTravelTransportMode>;
    tripId: Scalars['ID']['output'];
    updatedAt: Scalars['DateTime']['output'];
}

export interface GqlSAdminTravelTripActivity {
    __typename?: 'AdminTravelTripActivity';
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

export type GqlSAdminTravelTripActivityInput = {
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

export interface GqlSAdminTravelTripDay {
    __typename?: 'AdminTravelTripDay';
    activities: Array<GqlSAdminTravelTripActivity>;
    createdAt: Scalars['DateTime']['output'];
    date?: Maybe<Scalars['Date']['output']>;
    dayNumber: Scalars['Int']['output'];
    summary?: Maybe<Scalars['String']['output']>;
    title?: Maybe<Scalars['String']['output']>;
    tripDayId: Scalars['ID']['output'];
    tripId: Scalars['ID']['output'];
    updatedAt: Scalars['DateTime']['output'];
}

export type GqlSAdminTravelTripDayInput = {
    date?: InputMaybe<Scalars['Date']['input']>;
    dayNumber: Scalars['Int']['input'];
    summary?: InputMaybe<Scalars['String']['input']>;
    title?: InputMaybe<Scalars['String']['input']>;
    tripDayId?: InputMaybe<Scalars['ID']['input']>;
    tripId: Scalars['ID']['input'];
};

export type GqlSAdminTravelTripInput = {
    accommodation?: InputMaybe<Scalars['String']['input']>;
    destination: Scalars['String']['input'];
    endsOn?: InputMaybe<Scalars['Date']['input']>;
    notes?: InputMaybe<Scalars['String']['input']>;
    startsOn?: InputMaybe<Scalars['Date']['input']>;
    status: GqlSAdminTravelTripStatus;
    title: Scalars['String']['input'];
    transportMode?: InputMaybe<GqlSAdminTravelTransportMode>;
    tripId?: InputMaybe<Scalars['ID']['input']>;
};

export interface GqlSAdminTravelTripPackingItem {
    __typename?: 'AdminTravelTripPackingItem';
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

export type GqlSAdminTravelTripPackingItemInput = {
    category: Scalars['String']['input'];
    label: Scalars['String']['input'];
    notes?: InputMaybe<Scalars['String']['input']>;
    packed?: InputMaybe<Scalars['Boolean']['input']>;
    position?: InputMaybe<Scalars['Int']['input']>;
    quantity?: InputMaybe<Scalars['Int']['input']>;
    tripId: Scalars['ID']['input'];
    tripPackingItemId?: InputMaybe<Scalars['ID']['input']>;
};

export type GqlSAdminTravelTripStatus = 'active' | 'cancelled' | 'completed' | 'draft' | 'planned';

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
    AdminFinancesCadence: GqlSAdminFinancesCadence;
    AdminFinancesQuery: ResolverTypeWrapper<GqlSAdminFinancesQuery>;
    AdminFinancesRecurringCost: ResolverTypeWrapper<GqlSAdminFinancesRecurringCost>;
    AdminFinancesRecurringCostCategory: GqlSAdminFinancesRecurringCostCategory;
    AdminFinancesRecurringCostInput: GqlSAdminFinancesRecurringCostInput;
    AdminFitnessEquipmentType: GqlSAdminFitnessEquipmentType;
    AdminFitnessExercise: ResolverTypeWrapper<GqlSAdminFitnessExercise>;
    AdminFitnessExerciseInput: GqlSAdminFitnessExerciseInput;
    AdminFitnessMuscleGroup: GqlSAdminFitnessMuscleGroup;
    AdminFitnessQuery: ResolverTypeWrapper<GqlSAdminFitnessQuery>;
    AdminFitnessWorkoutRoutine: ResolverTypeWrapper<GqlSAdminFitnessWorkoutRoutine>;
    AdminFitnessWorkoutRoutineInput: GqlSAdminFitnessWorkoutRoutineInput;
    AdminFitnessWorkoutRoutineItem: ResolverTypeWrapper<GqlSAdminFitnessWorkoutRoutineItem>;
    AdminFitnessWorkoutRoutineItemInput: GqlSAdminFitnessWorkoutRoutineItemInput;
    AdminFitnessWorkoutSession: ResolverTypeWrapper<GqlSAdminFitnessWorkoutSession>;
    AdminFitnessWorkoutSessionInput: GqlSAdminFitnessWorkoutSessionInput;
    AdminFitnessWorkoutSet: ResolverTypeWrapper<GqlSAdminFitnessWorkoutSet>;
    AdminFitnessWorkoutSetInput: GqlSAdminFitnessWorkoutSetInput;
    AdminInventoryItem: ResolverTypeWrapper<GqlSAdminInventoryItem>;
    AdminInventoryItemCategory: GqlSAdminInventoryItemCategory;
    AdminInventoryItemCondition: GqlSAdminInventoryItemCondition;
    AdminInventoryItemDisposalState: GqlSAdminInventoryItemDisposalState;
    AdminInventoryItemFile: ResolverTypeWrapper<GqlSAdminInventoryItemFile>;
    AdminInventoryItemFileAttachInput: GqlSAdminInventoryItemFileAttachInput;
    AdminInventoryItemFileKind: GqlSAdminInventoryItemFileKind;
    AdminInventoryItemFileUpsert: GqlSAdminInventoryItemFileUpsert;
    AdminInventoryItemInput: GqlSAdminInventoryItemInput;
    AdminInventoryItemRepriceInput: GqlSAdminInventoryItemRepriceInput;
    AdminInventoryItemServiceEntry: ResolverTypeWrapper<GqlSAdminInventoryItemServiceEntry>;
    AdminInventoryItemServiceEntryInput: GqlSAdminInventoryItemServiceEntryInput;
    AdminInventoryItemServiceKind: GqlSAdminInventoryItemServiceKind;
    AdminInventoryItemValuation: ResolverTypeWrapper<GqlSAdminInventoryItemValuation>;
    AdminInventoryQuery: ResolverTypeWrapper<GqlSAdminInventoryQuery>;
    AdminMediaChannel: ResolverTypeWrapper<GqlSAdminMediaChannel>;
    AdminMediaChannelInput: GqlSAdminMediaChannelInput;
    AdminMediaMovie: ResolverTypeWrapper<GqlSAdminMediaMovie>;
    AdminMediaMovieAddFromTmdbInput: GqlSAdminMediaMovieAddFromTmdbInput;
    AdminMediaMovieInput: GqlSAdminMediaMovieInput;
    AdminMediaMovieStatus: GqlSAdminMediaMovieStatus;
    AdminMediaPlatform: GqlSAdminMediaPlatform;
    AdminMediaQuery: ResolverTypeWrapper<GqlSAdminMediaQuery>;
    AdminMediaShow: ResolverTypeWrapper<GqlSAdminMediaShow>;
    AdminMediaShowAddFromTmdbInput: GqlSAdminMediaShowAddFromTmdbInput;
    AdminMediaShowInput: GqlSAdminMediaShowInput;
    AdminMediaTmdbMovieResult: ResolverTypeWrapper<GqlSAdminMediaTmdbMovieResult>;
    AdminMediaTmdbTvResult: ResolverTypeWrapper<GqlSAdminMediaTmdbTvResult>;
    AdminMediaTopic: GqlSAdminMediaTopic;
    AdminMediaYoutubeChannelResult: ResolverTypeWrapper<GqlSAdminMediaYoutubeChannelResult>;
    AdminMedicalAppointment: ResolverTypeWrapper<GqlSAdminMedicalAppointment>;
    AdminMedicalAppointmentInput: GqlSAdminMedicalAppointmentInput;
    AdminMedicalAppointmentStatus: GqlSAdminMedicalAppointmentStatus;
    AdminMedicalCategory: GqlSAdminMedicalCategory;
    AdminMedicalCategoryOverview: ResolverTypeWrapper<GqlSAdminMedicalCategoryOverview>;
    AdminMedicalQuery: ResolverTypeWrapper<GqlSAdminMedicalQuery>;
    AdminMedicalRecord: ResolverTypeWrapper<GqlSAdminMedicalRecord>;
    AdminMedicalRecordFile: ResolverTypeWrapper<GqlSAdminMedicalRecordFile>;
    AdminMedicalRecordFileAttachInput: GqlSAdminMedicalRecordFileAttachInput;
    AdminMedicalRecordInput: GqlSAdminMedicalRecordInput;
    AdminMedicalRecordSeverity: GqlSAdminMedicalRecordSeverity;
    AdminMutation: ResolverTypeWrapper<GqlSAdminMutation>;
    AdminNutritionFoodLogEntry: ResolverTypeWrapper<GqlSAdminNutritionFoodLogEntry>;
    AdminNutritionFoodLogEntryInput: GqlSAdminNutritionFoodLogEntryInput;
    AdminNutritionFoodLogKind: GqlSAdminNutritionFoodLogKind;
    AdminNutritionMealPlanEntry: ResolverTypeWrapper<GqlSAdminNutritionMealPlanEntry>;
    AdminNutritionMealPlanEntryInput: GqlSAdminNutritionMealPlanEntryInput;
    AdminNutritionMealType: GqlSAdminNutritionMealType;
    AdminNutritionQuery: ResolverTypeWrapper<GqlSAdminNutritionQuery>;
    AdminNutritionRecipe: ResolverTypeWrapper<GqlSAdminNutritionRecipe>;
    AdminNutritionRecipeInput: GqlSAdminNutritionRecipeInput;
    AdminNutritionSupplement: ResolverTypeWrapper<GqlSAdminNutritionSupplement>;
    AdminNutritionSupplementInput: GqlSAdminNutritionSupplementInput;
    AdminNutritionSupplementNutrient: ResolverTypeWrapper<GqlSAdminNutritionSupplementNutrient>;
    AdminNutritionSupplementNutrientInput: GqlSAdminNutritionSupplementNutrientInput;
    AdminNutritionSupplementNutrientProposal: ResolverTypeWrapper<GqlSAdminNutritionSupplementNutrientProposal>;
    AdminNutritionSupplementResearchInput: GqlSAdminNutritionSupplementResearchInput;
    AdminNutritionSupplementResearchResult: ResolverTypeWrapper<GqlSAdminNutritionSupplementResearchResult>;
    AdminProject: ResolverTypeWrapper<GqlSAdminProject>;
    AdminProjectActivity: ResolverTypeWrapper<GqlSAdminProjectActivity>;
    AdminProjectActivityChannel: GqlSAdminProjectActivityChannel;
    AdminProjectActivityCreate: GqlSAdminProjectActivityCreate;
    AdminProjectActivityDirection: GqlSAdminProjectActivityDirection;
    AdminProjectActivityKind: GqlSAdminProjectActivityKind;
    AdminProjectCreate: GqlSAdminProjectCreate;
    AdminProjectFile: ResolverTypeWrapper<GqlSAdminProjectFile>;
    AdminProjectFileKind: GqlSAdminProjectFileKind;
    AdminProjectFileUpsert: GqlSAdminProjectFileUpsert;
    AdminProjectLink: ResolverTypeWrapper<GqlSAdminProjectLink>;
    AdminProjectLinkKind: GqlSAdminProjectLinkKind;
    AdminProjectLinkUpsert: GqlSAdminProjectLinkUpsert;
    AdminProjectOfferStatus: GqlSAdminProjectOfferStatus;
    AdminProjectRequest: ResolverTypeWrapper<GqlSAdminProjectRequest>;
    AdminProjectRequestStatus: GqlSAdminProjectRequestStatus;
    AdminProjectRequestType: GqlSAdminProjectRequestType;
    AdminProjectStatus: GqlSAdminProjectStatus;
    AdminProjectTask: ResolverTypeWrapper<GqlSAdminProjectTask>;
    AdminProjectTaskCreate: GqlSAdminProjectTaskCreate;
    AdminProjectTaskEffort: GqlSAdminProjectTaskEffort;
    AdminProjectTaskStatus: GqlSAdminProjectTaskStatus;
    AdminProjectTaskWhenBucket: GqlSAdminProjectTaskWhenBucket;
    AdminProjectTimerStartInput: GqlSAdminProjectTimerStartInput;
    AdminTaxDocument: ResolverTypeWrapper<GqlSAdminTaxDocument>;
    AdminTaxDocumentInput: GqlSAdminTaxDocumentInput;
    AdminTaxDocumentKind: GqlSAdminTaxDocumentKind;
    AdminTaxDocumentStatus: GqlSAdminTaxDocumentStatus;
    AdminTaxExpense: ResolverTypeWrapper<GqlSAdminTaxExpense>;
    AdminTaxExpenseCategory: GqlSAdminTaxExpenseCategory;
    AdminTaxExpenseInput: GqlSAdminTaxExpenseInput;
    AdminTaxFile: ResolverTypeWrapper<GqlSAdminTaxFile>;
    AdminTaxFileAttachInput: GqlSAdminTaxFileAttachInput;
    AdminTaxFileKind: GqlSAdminTaxFileKind;
    AdminTaxFileUpsert: GqlSAdminTaxFileUpsert;
    AdminTaxIncomeKind: GqlSAdminTaxIncomeKind;
    AdminTaxIncomeSource: ResolverTypeWrapper<GqlSAdminTaxIncomeSource>;
    AdminTaxIncomeSourceInput: GqlSAdminTaxIncomeSourceInput;
    AdminTaxQuery: ResolverTypeWrapper<GqlSAdminTaxQuery>;
    AdminTaxYear: ResolverTypeWrapper<GqlSAdminTaxYear>;
    AdminTaxYearInput: GqlSAdminTaxYearInput;
    AdminTaxYearStatus: GqlSAdminTaxYearStatus;
    AdminTravelQuery: ResolverTypeWrapper<GqlSAdminTravelQuery>;
    AdminTravelTransportMode: GqlSAdminTravelTransportMode;
    AdminTravelTrip: ResolverTypeWrapper<GqlSAdminTravelTrip>;
    AdminTravelTripActivity: ResolverTypeWrapper<GqlSAdminTravelTripActivity>;
    AdminTravelTripActivityInput: GqlSAdminTravelTripActivityInput;
    AdminTravelTripDay: ResolverTypeWrapper<GqlSAdminTravelTripDay>;
    AdminTravelTripDayInput: GqlSAdminTravelTripDayInput;
    AdminTravelTripInput: GqlSAdminTravelTripInput;
    AdminTravelTripPackingItem: ResolverTypeWrapper<GqlSAdminTravelTripPackingItem>;
    AdminTravelTripPackingItemInput: GqlSAdminTravelTripPackingItemInput;
    AdminTravelTripStatus: GqlSAdminTravelTripStatus;
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
    Float: ResolverTypeWrapper<Scalars['Float']['output']>;
    ID: ResolverTypeWrapper<Scalars['ID']['output']>;
    Int: ResolverTypeWrapper<Scalars['Int']['output']>;
    JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
    Log: ResolverTypeWrapper<GqlSLog>;
    LogLevel: GqlSLogLevel;
    Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
    MutationResult: ResolverTypeWrapper<GqlSMutationResult>;
    Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
    Session: ResolverTypeWrapper<
        Omit<GqlSSession, 'user' | 'visitorChatFindMany' | 'visitorChatFindOne'> & {
            user?: Maybe<GqlSResolversTypes['User']>;
            visitorChatFindMany: Array<GqlSResolversTypes['Chat']>;
            visitorChatFindOne: GqlSResolversTypes['Chat'];
        }
    >;
    String: ResolverTypeWrapper<Scalars['String']['output']>;
    Subscription: ResolverTypeWrapper<Record<PropertyKey, never>>;
    User: ResolverTypeWrapper<Omit<GqlSUser, 'admin'> & { admin?: Maybe<GqlSResolversTypes['Admin']> }>;
    UserCreate: GqlSUserCreate;
    UserMutation: ResolverTypeWrapper<GqlSUserMutation>;
    UserUpdate: GqlSUserUpdate;
    VisitorChatQuota: ResolverTypeWrapper<GqlSVisitorChatQuota>;
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
    AdminFinancesRecurringCost: GqlSAdminFinancesRecurringCost;
    AdminFinancesRecurringCostInput: GqlSAdminFinancesRecurringCostInput;
    AdminFitnessExercise: GqlSAdminFitnessExercise;
    AdminFitnessExerciseInput: GqlSAdminFitnessExerciseInput;
    AdminFitnessQuery: GqlSAdminFitnessQuery;
    AdminFitnessWorkoutRoutine: GqlSAdminFitnessWorkoutRoutine;
    AdminFitnessWorkoutRoutineInput: GqlSAdminFitnessWorkoutRoutineInput;
    AdminFitnessWorkoutRoutineItem: GqlSAdminFitnessWorkoutRoutineItem;
    AdminFitnessWorkoutRoutineItemInput: GqlSAdminFitnessWorkoutRoutineItemInput;
    AdminFitnessWorkoutSession: GqlSAdminFitnessWorkoutSession;
    AdminFitnessWorkoutSessionInput: GqlSAdminFitnessWorkoutSessionInput;
    AdminFitnessWorkoutSet: GqlSAdminFitnessWorkoutSet;
    AdminFitnessWorkoutSetInput: GqlSAdminFitnessWorkoutSetInput;
    AdminInventoryItem: GqlSAdminInventoryItem;
    AdminInventoryItemFile: GqlSAdminInventoryItemFile;
    AdminInventoryItemFileAttachInput: GqlSAdminInventoryItemFileAttachInput;
    AdminInventoryItemFileUpsert: GqlSAdminInventoryItemFileUpsert;
    AdminInventoryItemInput: GqlSAdminInventoryItemInput;
    AdminInventoryItemRepriceInput: GqlSAdminInventoryItemRepriceInput;
    AdminInventoryItemServiceEntry: GqlSAdminInventoryItemServiceEntry;
    AdminInventoryItemServiceEntryInput: GqlSAdminInventoryItemServiceEntryInput;
    AdminInventoryItemValuation: GqlSAdminInventoryItemValuation;
    AdminInventoryQuery: GqlSAdminInventoryQuery;
    AdminMediaChannel: GqlSAdminMediaChannel;
    AdminMediaChannelInput: GqlSAdminMediaChannelInput;
    AdminMediaMovie: GqlSAdminMediaMovie;
    AdminMediaMovieAddFromTmdbInput: GqlSAdminMediaMovieAddFromTmdbInput;
    AdminMediaMovieInput: GqlSAdminMediaMovieInput;
    AdminMediaQuery: GqlSAdminMediaQuery;
    AdminMediaShow: GqlSAdminMediaShow;
    AdminMediaShowAddFromTmdbInput: GqlSAdminMediaShowAddFromTmdbInput;
    AdminMediaShowInput: GqlSAdminMediaShowInput;
    AdminMediaTmdbMovieResult: GqlSAdminMediaTmdbMovieResult;
    AdminMediaTmdbTvResult: GqlSAdminMediaTmdbTvResult;
    AdminMediaYoutubeChannelResult: GqlSAdminMediaYoutubeChannelResult;
    AdminMedicalAppointment: GqlSAdminMedicalAppointment;
    AdminMedicalAppointmentInput: GqlSAdminMedicalAppointmentInput;
    AdminMedicalCategoryOverview: GqlSAdminMedicalCategoryOverview;
    AdminMedicalQuery: GqlSAdminMedicalQuery;
    AdminMedicalRecord: GqlSAdminMedicalRecord;
    AdminMedicalRecordFile: GqlSAdminMedicalRecordFile;
    AdminMedicalRecordFileAttachInput: GqlSAdminMedicalRecordFileAttachInput;
    AdminMedicalRecordInput: GqlSAdminMedicalRecordInput;
    AdminMutation: GqlSAdminMutation;
    AdminNutritionFoodLogEntry: GqlSAdminNutritionFoodLogEntry;
    AdminNutritionFoodLogEntryInput: GqlSAdminNutritionFoodLogEntryInput;
    AdminNutritionMealPlanEntry: GqlSAdminNutritionMealPlanEntry;
    AdminNutritionMealPlanEntryInput: GqlSAdminNutritionMealPlanEntryInput;
    AdminNutritionQuery: GqlSAdminNutritionQuery;
    AdminNutritionRecipe: GqlSAdminNutritionRecipe;
    AdminNutritionRecipeInput: GqlSAdminNutritionRecipeInput;
    AdminNutritionSupplement: GqlSAdminNutritionSupplement;
    AdminNutritionSupplementInput: GqlSAdminNutritionSupplementInput;
    AdminNutritionSupplementNutrient: GqlSAdminNutritionSupplementNutrient;
    AdminNutritionSupplementNutrientInput: GqlSAdminNutritionSupplementNutrientInput;
    AdminNutritionSupplementNutrientProposal: GqlSAdminNutritionSupplementNutrientProposal;
    AdminNutritionSupplementResearchInput: GqlSAdminNutritionSupplementResearchInput;
    AdminNutritionSupplementResearchResult: GqlSAdminNutritionSupplementResearchResult;
    AdminProject: GqlSAdminProject;
    AdminProjectActivity: GqlSAdminProjectActivity;
    AdminProjectActivityCreate: GqlSAdminProjectActivityCreate;
    AdminProjectCreate: GqlSAdminProjectCreate;
    AdminProjectFile: GqlSAdminProjectFile;
    AdminProjectFileUpsert: GqlSAdminProjectFileUpsert;
    AdminProjectLink: GqlSAdminProjectLink;
    AdminProjectLinkUpsert: GqlSAdminProjectLinkUpsert;
    AdminProjectRequest: GqlSAdminProjectRequest;
    AdminProjectTask: GqlSAdminProjectTask;
    AdminProjectTaskCreate: GqlSAdminProjectTaskCreate;
    AdminProjectTimerStartInput: GqlSAdminProjectTimerStartInput;
    AdminTaxDocument: GqlSAdminTaxDocument;
    AdminTaxDocumentInput: GqlSAdminTaxDocumentInput;
    AdminTaxExpense: GqlSAdminTaxExpense;
    AdminTaxExpenseInput: GqlSAdminTaxExpenseInput;
    AdminTaxFile: GqlSAdminTaxFile;
    AdminTaxFileAttachInput: GqlSAdminTaxFileAttachInput;
    AdminTaxFileUpsert: GqlSAdminTaxFileUpsert;
    AdminTaxIncomeSource: GqlSAdminTaxIncomeSource;
    AdminTaxIncomeSourceInput: GqlSAdminTaxIncomeSourceInput;
    AdminTaxQuery: GqlSAdminTaxQuery;
    AdminTaxYear: GqlSAdminTaxYear;
    AdminTaxYearInput: GqlSAdminTaxYearInput;
    AdminTravelQuery: GqlSAdminTravelQuery;
    AdminTravelTrip: GqlSAdminTravelTrip;
    AdminTravelTripActivity: GqlSAdminTravelTripActivity;
    AdminTravelTripActivityInput: GqlSAdminTravelTripActivityInput;
    AdminTravelTripDay: GqlSAdminTravelTripDay;
    AdminTravelTripDayInput: GqlSAdminTravelTripDayInput;
    AdminTravelTripInput: GqlSAdminTravelTripInput;
    AdminTravelTripPackingItem: GqlSAdminTravelTripPackingItem;
    AdminTravelTripPackingItemInput: GqlSAdminTravelTripPackingItemInput;
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
    Float: Scalars['Float']['output'];
    ID: Scalars['ID']['output'];
    Int: Scalars['Int']['output'];
    JSON: Scalars['JSON']['output'];
    Log: GqlSLog;
    Mutation: Record<PropertyKey, never>;
    MutationResult: GqlSMutationResult;
    Query: Record<PropertyKey, never>;
    Session: Omit<GqlSSession, 'user' | 'visitorChatFindMany' | 'visitorChatFindOne'> & {
        user?: Maybe<GqlSResolversParentTypes['User']>;
        visitorChatFindMany: Array<GqlSResolversParentTypes['Chat']>;
        visitorChatFindOne: GqlSResolversParentTypes['Chat'];
    };
    String: Scalars['String']['output'];
    Subscription: Record<PropertyKey, never>;
    User: Omit<GqlSUser, 'admin'> & { admin?: Maybe<GqlSResolversParentTypes['Admin']> };
    UserCreate: GqlSUserCreate;
    UserMutation: GqlSUserMutation;
    UserUpdate: GqlSUserUpdate;
    VisitorChatQuota: GqlSVisitorChatQuota;
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
    adminFitnessFindOne?: Resolver<GqlSResolversTypes['AdminFitnessQuery'], ParentType, ContextType>;
    adminInventoryFindOne?: Resolver<GqlSResolversTypes['AdminInventoryQuery'], ParentType, ContextType>;
    adminLogFindMany?: Resolver<Array<GqlSResolversTypes['Log']>, ParentType, ContextType, Partial<GqlSAdminAdminLogFindManyArgs>>;
    adminMediaFindOne?: Resolver<GqlSResolversTypes['AdminMediaQuery'], ParentType, ContextType>;
    adminMedicalFindOne?: Resolver<GqlSResolversTypes['AdminMedicalQuery'], ParentType, ContextType>;
    adminNutritionFindOne?: Resolver<GqlSResolversTypes['AdminNutritionQuery'], ParentType, ContextType>;
    adminProjectActiveTimerFindOne?: Resolver<Maybe<GqlSResolversTypes['AdminProjectActivity']>, ParentType, ContextType>;
    adminProjectFindMany?: Resolver<
        Array<GqlSResolversTypes['AdminProject']>,
        ParentType,
        ContextType,
        Partial<GqlSAdminAdminProjectFindManyArgs>
    >;
    adminProjectFindOne?: Resolver<
        GqlSResolversTypes['AdminProject'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminAdminProjectFindOneArgs, 'projectId'>
    >;
    adminProjectRequestFindMany?: Resolver<
        Array<GqlSResolversTypes['AdminProjectRequest']>,
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
    adminStandaloneTaskFindMany?: Resolver<Array<GqlSResolversTypes['AdminProjectTask']>, ParentType, ContextType>;
    adminStandaloneTaskOpenCount?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    adminTaxFindOne?: Resolver<GqlSResolversTypes['AdminTaxQuery'], ParentType, ContextType>;
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
    adminFinancesRecurringCostFindMany?: Resolver<Array<GqlSResolversTypes['AdminFinancesRecurringCost']>, ParentType, ContextType>;
    adminFinancesYearlyExpensesCentsFindOne?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
}>;

export type GqlSAdminFinancesRecurringCostResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminFinancesRecurringCost'] = GqlSResolversParentTypes['AdminFinancesRecurringCost'],
> = ResolversObject<{
    active?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    amountCents?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    cadence?: Resolver<GqlSResolversTypes['AdminFinancesCadence'], ParentType, ContextType>;
    categoryKey?: Resolver<GqlSResolversTypes['AdminFinancesRecurringCostCategory'], ParentType, ContextType>;
    costId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    currency?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    endsOn?: Resolver<Maybe<GqlSResolversTypes['Date']>, ParentType, ContextType>;
    name?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    notes?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    startsOn?: Resolver<Maybe<GqlSResolversTypes['Date']>, ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSAdminFitnessExerciseResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminFitnessExercise'] = GqlSResolversParentTypes['AdminFitnessExercise'],
> = ResolversObject<{
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    equipment?: Resolver<Maybe<GqlSResolversTypes['AdminFitnessEquipmentType']>, ParentType, ContextType>;
    exerciseId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    muscleGroup?: Resolver<GqlSResolversTypes['AdminFitnessMuscleGroup'], ParentType, ContextType>;
    name?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    notes?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSAdminFitnessQueryResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminFitnessQuery'] = GqlSResolversParentTypes['AdminFitnessQuery'],
> = ResolversObject<{
    adminFitnessExerciseFindMany?: Resolver<Array<GqlSResolversTypes['AdminFitnessExercise']>, ParentType, ContextType>;
    adminFitnessRoutineFindMany?: Resolver<Array<GqlSResolversTypes['AdminFitnessWorkoutRoutine']>, ParentType, ContextType>;
    adminFitnessSessionFindMany?: Resolver<Array<GqlSResolversTypes['AdminFitnessWorkoutSession']>, ParentType, ContextType>;
}>;

export type GqlSAdminFitnessWorkoutRoutineResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminFitnessWorkoutRoutine'] = GqlSResolversParentTypes['AdminFitnessWorkoutRoutine'],
> = ResolversObject<{
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    items?: Resolver<Array<GqlSResolversTypes['AdminFitnessWorkoutRoutineItem']>, ParentType, ContextType>;
    name?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    notes?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    position?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    routineId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSAdminFitnessWorkoutRoutineItemResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminFitnessWorkoutRoutineItem'] =
        GqlSResolversParentTypes['AdminFitnessWorkoutRoutineItem'],
> = ResolversObject<{
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    exercise?: Resolver<GqlSResolversTypes['AdminFitnessExercise'], ParentType, ContextType>;
    notes?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    position?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    routineId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    routineItemId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    targetReps?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    targetSets?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    targetWeight?: Resolver<Maybe<GqlSResolversTypes['Float']>, ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSAdminFitnessWorkoutSessionResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminFitnessWorkoutSession'] = GqlSResolversParentTypes['AdminFitnessWorkoutSession'],
> = ResolversObject<{
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    date?: Resolver<GqlSResolversTypes['Date'], ParentType, ContextType>;
    durationMinutes?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    notes?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    routineId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    sessionId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    sets?: Resolver<Array<GqlSResolversTypes['AdminFitnessWorkoutSet']>, ParentType, ContextType>;
    title?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSAdminFitnessWorkoutSetResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminFitnessWorkoutSet'] = GqlSResolversParentTypes['AdminFitnessWorkoutSet'],
> = ResolversObject<{
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    exercise?: Resolver<GqlSResolversTypes['AdminFitnessExercise'], ParentType, ContextType>;
    isWarmup?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    notes?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    position?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    reps?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    rpe?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    sessionId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    setId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    weight?: Resolver<Maybe<GqlSResolversTypes['Float']>, ParentType, ContextType>;
}>;

export type GqlSAdminInventoryItemResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminInventoryItem'] = GqlSResolversParentTypes['AdminInventoryItem'],
> = ResolversObject<{
    brand?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    categoryKey?: Resolver<GqlSResolversTypes['AdminInventoryItemCategory'], ParentType, ContextType>;
    condition?: Resolver<Maybe<GqlSResolversTypes['AdminInventoryItemCondition']>, ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    currentValueCents?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    disposalState?: Resolver<GqlSResolversTypes['AdminInventoryItemDisposalState'], ParentType, ContextType>;
    disposedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    files?: Resolver<Array<GqlSResolversTypes['AdminInventoryItemFile']>, ParentType, ContextType>;
    itemId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    model?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    name?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    notes?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    purchasePriceCents?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    purchasedAt?: Resolver<Maybe<GqlSResolversTypes['Date']>, ParentType, ContextType>;
    serialNumber?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    serviceEntries?: Resolver<Array<GqlSResolversTypes['AdminInventoryItemServiceEntry']>, ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    valuations?: Resolver<Array<GqlSResolversTypes['AdminInventoryItemValuation']>, ParentType, ContextType>;
    warrantyEndsAt?: Resolver<Maybe<GqlSResolversTypes['Date']>, ParentType, ContextType>;
    warrantyNotes?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    warrantyProvider?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
}>;

export type GqlSAdminInventoryItemFileResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminInventoryItemFile'] = GqlSResolversParentTypes['AdminInventoryItemFile'],
> = ResolversObject<{
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    fileUpload?: Resolver<GqlSResolversTypes['FileUpload'], ParentType, ContextType>;
    itemFileId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    itemId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    kind?: Resolver<GqlSResolversTypes['AdminInventoryItemFileKind'], ParentType, ContextType>;
    label?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    pinned?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    serviceEntryId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSAdminInventoryItemServiceEntryResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminInventoryItemServiceEntry'] =
        GqlSResolversParentTypes['AdminInventoryItemServiceEntry'],
> = ResolversObject<{
    costCents?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    files?: Resolver<Array<GqlSResolversTypes['AdminInventoryItemFile']>, ParentType, ContextType>;
    kind?: Resolver<GqlSResolversTypes['AdminInventoryItemServiceKind'], ParentType, ContextType>;
    nextDueAt?: Resolver<Maybe<GqlSResolversTypes['Date']>, ParentType, ContextType>;
    notes?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    performedAt?: Resolver<GqlSResolversTypes['Date'], ParentType, ContextType>;
    serviceEntryId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    vendor?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
}>;

export type GqlSAdminInventoryItemValuationResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminInventoryItemValuation'] = GqlSResolversParentTypes['AdminInventoryItemValuation'],
> = ResolversObject<{
    note?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    valuationId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    valueCents?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    valuedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSAdminInventoryQueryResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminInventoryQuery'] = GqlSResolversParentTypes['AdminInventoryQuery'],
> = ResolversObject<{
    adminInventoryItemFindMany?: Resolver<
        Array<GqlSResolversTypes['AdminInventoryItem']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminInventoryQueryAdminInventoryItemFindManyArgs, 'includeDisposed'>
    >;
    adminInventoryItemFindOne?: Resolver<
        Maybe<GqlSResolversTypes['AdminInventoryItem']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminInventoryQueryAdminInventoryItemFindOneArgs, 'itemId'>
    >;
    adminInventoryItemUpcomingWarrantyFindMany?: Resolver<
        Array<GqlSResolversTypes['AdminInventoryItem']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminInventoryQueryAdminInventoryItemUpcomingWarrantyFindManyArgs, 'withinDays'>
    >;
    adminInventoryMaterialNetWorthCentsFindOne?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
}>;

export type GqlSAdminMediaChannelResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminMediaChannel'] = GqlSResolversParentTypes['AdminMediaChannel'],
> = ResolversObject<{
    avatarUrl?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    channelId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    description?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    handle?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    name?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    notes?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    platform?: Resolver<GqlSResolversTypes['AdminMediaPlatform'], ParentType, ContextType>;
    priority?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    topics?: Resolver<Array<GqlSResolversTypes['String']>, ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    url?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
}>;

export type GqlSAdminMediaMovieResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminMediaMovie'] = GqlSResolversParentTypes['AdminMediaMovie'],
> = ResolversObject<{
    backdropUrl?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    movieId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    notes?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    overview?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    posterUrl?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    rating?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    releaseDate?: Resolver<Maybe<GqlSResolversTypes['Date']>, ParentType, ContextType>;
    runtimeMinutes?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    status?: Resolver<GqlSResolversTypes['AdminMediaMovieStatus'], ParentType, ContextType>;
    title?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    tmdbId?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    topics?: Resolver<Array<GqlSResolversTypes['String']>, ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    watchedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
}>;

export type GqlSAdminMediaQueryResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminMediaQuery'] = GqlSResolversParentTypes['AdminMediaQuery'],
> = ResolversObject<{
    adminMediaChannelFindMany?: Resolver<
        Array<GqlSResolversTypes['AdminMediaChannel']>,
        ParentType,
        ContextType,
        Partial<GqlSAdminMediaQueryAdminMediaChannelFindManyArgs>
    >;
    adminMediaMovieFindMany?: Resolver<Array<GqlSResolversTypes['AdminMediaMovie']>, ParentType, ContextType>;
    adminMediaShowFindMany?: Resolver<Array<GqlSResolversTypes['AdminMediaShow']>, ParentType, ContextType>;
    adminMediaTmdbFindMany?: Resolver<
        Array<GqlSResolversTypes['AdminMediaTmdbMovieResult']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMediaQueryAdminMediaTmdbFindManyArgs, 'query'>
    >;
    adminMediaTmdbTvFindMany?: Resolver<
        Array<GqlSResolversTypes['AdminMediaTmdbTvResult']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMediaQueryAdminMediaTmdbTvFindManyArgs, 'query'>
    >;
    adminMediaYoutubeFindMany?: Resolver<
        Array<GqlSResolversTypes['AdminMediaYoutubeChannelResult']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMediaQueryAdminMediaYoutubeFindManyArgs, 'query'>
    >;
}>;

export type GqlSAdminMediaShowResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminMediaShow'] = GqlSResolversParentTypes['AdminMediaShow'],
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
    status?: Resolver<GqlSResolversTypes['AdminMediaMovieStatus'], ParentType, ContextType>;
    title?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    tmdbId?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    topics?: Resolver<Array<GqlSResolversTypes['String']>, ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSAdminMediaTmdbMovieResultResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminMediaTmdbMovieResult'] = GqlSResolversParentTypes['AdminMediaTmdbMovieResult'],
> = ResolversObject<{
    overview?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    posterUrl?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    releaseDate?: Resolver<Maybe<GqlSResolversTypes['Date']>, ParentType, ContextType>;
    title?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    tmdbId?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
}>;

export type GqlSAdminMediaTmdbTvResultResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminMediaTmdbTvResult'] = GqlSResolversParentTypes['AdminMediaTmdbTvResult'],
> = ResolversObject<{
    firstAirDate?: Resolver<Maybe<GqlSResolversTypes['Date']>, ParentType, ContextType>;
    overview?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    posterUrl?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    title?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    tmdbId?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
}>;

export type GqlSAdminMediaYoutubeChannelResultResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminMediaYoutubeChannelResult'] =
        GqlSResolversParentTypes['AdminMediaYoutubeChannelResult'],
> = ResolversObject<{
    avatarUrl?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    canonicalUrl?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    channelId?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    description?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    handle?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    subscriberCount?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    title?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
}>;

export type GqlSAdminMedicalAppointmentResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminMedicalAppointment'] = GqlSResolversParentTypes['AdminMedicalAppointment'],
> = ResolversObject<{
    appointmentId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    category?: Resolver<GqlSResolversTypes['AdminMedicalCategory'], ParentType, ContextType>;
    completedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    nextDueAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    notes?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    providerName?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    scheduledAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    status?: Resolver<GqlSResolversTypes['AdminMedicalAppointmentStatus'], ParentType, ContextType>;
    title?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    topics?: Resolver<Array<GqlSResolversTypes['String']>, ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSAdminMedicalCategoryOverviewResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminMedicalCategoryOverview'] = GqlSResolversParentTypes['AdminMedicalCategoryOverview'],
> = ResolversObject<{
    category?: Resolver<GqlSResolversTypes['AdminMedicalCategory'], ParentType, ContextType>;
    defaultCadenceMonths?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    isOverdue?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    lastCompletedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    nextDueAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    recentRecords?: Resolver<Array<GqlSResolversTypes['AdminMedicalRecord']>, ParentType, ContextType>;
    upcoming?: Resolver<Array<GqlSResolversTypes['AdminMedicalAppointment']>, ParentType, ContextType>;
}>;

export type GqlSAdminMedicalQueryResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminMedicalQuery'] = GqlSResolversParentTypes['AdminMedicalQuery'],
> = ResolversObject<{
    adminMedicalAppointmentFindMany?: Resolver<Array<GqlSResolversTypes['AdminMedicalAppointment']>, ParentType, ContextType>;
    adminMedicalCategoryOverviewFindMany?: Resolver<Array<GqlSResolversTypes['AdminMedicalCategoryOverview']>, ParentType, ContextType>;
    adminMedicalRecordFindMany?: Resolver<Array<GqlSResolversTypes['AdminMedicalRecord']>, ParentType, ContextType>;
}>;

export type GqlSAdminMedicalRecordResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminMedicalRecord'] = GqlSResolversParentTypes['AdminMedicalRecord'],
> = ResolversObject<{
    appointmentId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    bodyAreas?: Resolver<Array<GqlSResolversTypes['String']>, ParentType, ContextType>;
    category?: Resolver<GqlSResolversTypes['AdminMedicalCategory'], ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    files?: Resolver<Array<GqlSResolversTypes['AdminMedicalRecordFile']>, ParentType, ContextType>;
    occurredAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    recordId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    resolvedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    severity?: Resolver<Maybe<GqlSResolversTypes['AdminMedicalRecordSeverity']>, ParentType, ContextType>;
    summary?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    symptoms?: Resolver<Array<GqlSResolversTypes['String']>, ParentType, ContextType>;
    title?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    topics?: Resolver<Array<GqlSResolversTypes['String']>, ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSAdminMedicalRecordFileResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminMedicalRecordFile'] = GqlSResolversParentTypes['AdminMedicalRecordFile'],
> = ResolversObject<{
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    fileUpload?: Resolver<GqlSResolversTypes['FileUpload'], ParentType, ContextType>;
    label?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    pinned?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    recordFileId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    recordId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSAdminMutationResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminMutation'] = GqlSResolversParentTypes['AdminMutation'],
> = ResolversObject<{
    adminFinancesMonthlyNetIncomeSet?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        Partial<GqlSAdminMutationAdminFinancesMonthlyNetIncomeSetArgs>
    >;
    adminFinancesRecurringCostsDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminFinancesRecurringCostsDeleteArgs, 'costIds'>
    >;
    adminFinancesRecurringCostsUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminFinancesRecurringCostsUpsertArgs, 'financeRecurringCosts'>
    >;
    adminFitnessExercisesDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminFitnessExercisesDeleteArgs, 'exerciseIds'>
    >;
    adminFitnessExercisesUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminFitnessExercisesUpsertArgs, 'exercises'>
    >;
    adminFitnessWorkoutRoutineItemsDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminFitnessWorkoutRoutineItemsDeleteArgs, 'routineItemIds'>
    >;
    adminFitnessWorkoutRoutineItemsUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminFitnessWorkoutRoutineItemsUpsertArgs, 'workoutRoutineItems'>
    >;
    adminFitnessWorkoutRoutinesDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminFitnessWorkoutRoutinesDeleteArgs, 'routineIds'>
    >;
    adminFitnessWorkoutRoutinesUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminFitnessWorkoutRoutinesUpsertArgs, 'workoutRoutines'>
    >;
    adminFitnessWorkoutSessionsDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminFitnessWorkoutSessionsDeleteArgs, 'sessionIds'>
    >;
    adminFitnessWorkoutSessionsUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminFitnessWorkoutSessionsUpsertArgs, 'workoutSessions'>
    >;
    adminFitnessWorkoutSetsDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminFitnessWorkoutSetsDeleteArgs, 'setIds'>
    >;
    adminFitnessWorkoutSetsUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminFitnessWorkoutSetsUpsertArgs, 'workoutSets'>
    >;
    adminInventoryItemFilesAttach?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminInventoryItemFilesAttachArgs, 'inputs'>
    >;
    adminInventoryItemFilesDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminInventoryItemFilesDeleteArgs, 'itemFileIds'>
    >;
    adminInventoryItemFilesUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminInventoryItemFilesUpsertArgs, 'itemFiles'>
    >;
    adminInventoryItemServiceEntriesDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminInventoryItemServiceEntriesDeleteArgs, 'serviceEntryIds'>
    >;
    adminInventoryItemServiceEntriesUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminInventoryItemServiceEntriesUpsertArgs, 'itemServiceEntries'>
    >;
    adminInventoryItemsDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminInventoryItemsDeleteArgs, 'itemIds'>
    >;
    adminInventoryItemsReprice?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminInventoryItemsRepriceArgs, 'inputs'>
    >;
    adminInventoryItemsUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminInventoryItemsUpsertArgs, 'items'>
    >;
    adminMediaChannelReorder?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminMediaChannelReorderArgs, 'orderedIds'>
    >;
    adminMediaChannelsDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminMediaChannelsDeleteArgs, 'channelIds'>
    >;
    adminMediaChannelsUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminMediaChannelsUpsertArgs, 'mediaChannels'>
    >;
    adminMediaMoviesAddFromTmdb?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminMediaMoviesAddFromTmdbArgs, 'inputs'>
    >;
    adminMediaMoviesDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminMediaMoviesDeleteArgs, 'movieIds'>
    >;
    adminMediaMoviesUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminMediaMoviesUpsertArgs, 'movies'>
    >;
    adminMediaShowsAddFromTmdb?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminMediaShowsAddFromTmdbArgs, 'inputs'>
    >;
    adminMediaShowsDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminMediaShowsDeleteArgs, 'showIds'>
    >;
    adminMediaShowsUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminMediaShowsUpsertArgs, 'shows'>
    >;
    adminMedicalAppointmentsDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminMedicalAppointmentsDeleteArgs, 'appointmentIds'>
    >;
    adminMedicalAppointmentsUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminMedicalAppointmentsUpsertArgs, 'medicalAppointments'>
    >;
    adminMedicalRecordFilesAttach?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminMedicalRecordFilesAttachArgs, 'inputs'>
    >;
    adminMedicalRecordFilesDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminMedicalRecordFilesDeleteArgs, 'recordFileIds'>
    >;
    adminMedicalRecordsDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminMedicalRecordsDeleteArgs, 'recordIds'>
    >;
    adminMedicalRecordsUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminMedicalRecordsUpsertArgs, 'medicalRecords'>
    >;
    adminNutritionFoodLogEntriesDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminNutritionFoodLogEntriesDeleteArgs, 'logIds'>
    >;
    adminNutritionFoodLogEntriesUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminNutritionFoodLogEntriesUpsertArgs, 'foodLogEntries'>
    >;
    adminNutritionMealPlanEntriesDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminNutritionMealPlanEntriesDeleteArgs, 'entryIds'>
    >;
    adminNutritionMealPlanEntriesUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminNutritionMealPlanEntriesUpsertArgs, 'mealPlanEntries'>
    >;
    adminNutritionRecipesDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminNutritionRecipesDeleteArgs, 'recipeIds'>
    >;
    adminNutritionRecipesUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminNutritionRecipesUpsertArgs, 'recipes'>
    >;
    adminNutritionSupplementNutrientsReplace?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminNutritionSupplementNutrientsReplaceArgs, 'nutrients' | 'supplementId'>
    >;
    adminNutritionSupplementResearch?: Resolver<
        GqlSResolversTypes['AdminNutritionSupplementResearchResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminNutritionSupplementResearchArgs, 'input'>
    >;
    adminNutritionSupplementsDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminNutritionSupplementsDeleteArgs, 'supplementIds'>
    >;
    adminNutritionSupplementsUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminNutritionSupplementsUpsertArgs, 'supplements'>
    >;
    adminProjectActivitiesDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminProjectActivitiesDeleteArgs, 'activityIds'>
    >;
    adminProjectActivitiesUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminProjectActivitiesUpsertArgs, 'projectActivities'>
    >;
    adminProjectFilesDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminProjectFilesDeleteArgs, 'projectFileIds'>
    >;
    adminProjectFilesUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminProjectFilesUpsertArgs, 'projectFiles'>
    >;
    adminProjectLinksDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminProjectLinksDeleteArgs, 'projectLinkIds'>
    >;
    adminProjectLinksUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminProjectLinksUpsertArgs, 'projectLinks'>
    >;
    adminProjectReorder?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminProjectReorderArgs, 'orderedIds'>
    >;
    adminProjectRequestArchive?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminProjectRequestArchiveArgs, 'projectRequestId'>
    >;
    adminProjectRequestDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminProjectRequestDeleteArgs, 'projectRequestId'>
    >;
    adminProjectTaskReorder?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminProjectTaskReorderArgs, 'orderedIds'>
    >;
    adminProjectTasksDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminProjectTasksDeleteArgs, 'taskIds'>
    >;
    adminProjectTasksUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminProjectTasksUpsertArgs, 'tasks'>
    >;
    adminProjectTimersStart?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminProjectTimersStartArgs, 'inputs'>
    >;
    adminProjectTimersStop?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminProjectTimersStopArgs, 'activityIds'>
    >;
    adminProjectsDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminProjectsDeleteArgs, 'projectIds'>
    >;
    adminProjectsUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminProjectsUpsertArgs, 'projects'>
    >;
    adminTaxDocumentsDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminTaxDocumentsDeleteArgs, 'documentIds'>
    >;
    adminTaxDocumentsUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminTaxDocumentsUpsertArgs, 'taxDocuments'>
    >;
    adminTaxExpensesDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminTaxExpensesDeleteArgs, 'expenseIds'>
    >;
    adminTaxExpensesUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminTaxExpensesUpsertArgs, 'taxExpenses'>
    >;
    adminTaxFilesAttach?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminTaxFilesAttachArgs, 'inputs'>
    >;
    adminTaxFilesDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminTaxFilesDeleteArgs, 'taxFileIds'>
    >;
    adminTaxFilesUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminTaxFilesUpsertArgs, 'inputs'>
    >;
    adminTaxIncomeSourcesDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminTaxIncomeSourcesDeleteArgs, 'incomeSourceIds'>
    >;
    adminTaxIncomeSourcesUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminTaxIncomeSourcesUpsertArgs, 'taxIncomeSources'>
    >;
    adminTaxYearsDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminTaxYearsDeleteArgs, 'taxYearIds'>
    >;
    adminTaxYearsUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminTaxYearsUpsertArgs, 'taxYears'>
    >;
    adminTravelTripActivitiesDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminTravelTripActivitiesDeleteArgs, 'tripActivityIds'>
    >;
    adminTravelTripActivitiesUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminTravelTripActivitiesUpsertArgs, 'tripActivities'>
    >;
    adminTravelTripDaysDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminTravelTripDaysDeleteArgs, 'tripDayIds'>
    >;
    adminTravelTripDaysUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminTravelTripDaysUpsertArgs, 'tripDays'>
    >;
    adminTravelTripPackingItemsDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminTravelTripPackingItemsDeleteArgs, 'tripPackingItemIds'>
    >;
    adminTravelTripPackingItemsUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminTravelTripPackingItemsUpsertArgs, 'tripPackingItems'>
    >;
    adminTravelTripsDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminTravelTripsDeleteArgs, 'tripIds'>
    >;
    adminTravelTripsUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationAdminTravelTripsUpsertArgs, 'trips'>
    >;
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
}>;

export type GqlSAdminNutritionFoodLogEntryResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminNutritionFoodLogEntry'] = GqlSResolversParentTypes['AdminNutritionFoodLogEntry'],
> = ResolversObject<{
    consumedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    description?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    kind?: Resolver<GqlSResolversTypes['AdminNutritionFoodLogKind'], ParentType, ContextType>;
    logId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    mealType?: Resolver<GqlSResolversTypes['AdminNutritionMealType'], ParentType, ContextType>;
    notes?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    recipe?: Resolver<Maybe<GqlSResolversTypes['AdminNutritionRecipe']>, ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSAdminNutritionMealPlanEntryResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminNutritionMealPlanEntry'] = GqlSResolversParentTypes['AdminNutritionMealPlanEntry'],
> = ResolversObject<{
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    customText?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    date?: Resolver<GqlSResolversTypes['Date'], ParentType, ContextType>;
    entryId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    mealType?: Resolver<GqlSResolversTypes['AdminNutritionMealType'], ParentType, ContextType>;
    notes?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    recipe?: Resolver<Maybe<GqlSResolversTypes['AdminNutritionRecipe']>, ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSAdminNutritionQueryResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminNutritionQuery'] = GqlSResolversParentTypes['AdminNutritionQuery'],
> = ResolversObject<{
    adminNutritionFoodLogFindMany?: Resolver<Array<GqlSResolversTypes['AdminNutritionFoodLogEntry']>, ParentType, ContextType>;
    adminNutritionMealPlanFindMany?: Resolver<Array<GqlSResolversTypes['AdminNutritionMealPlanEntry']>, ParentType, ContextType>;
    adminNutritionRecipeFindMany?: Resolver<
        Array<GqlSResolversTypes['AdminNutritionRecipe']>,
        ParentType,
        ContextType,
        Partial<GqlSAdminNutritionQueryAdminNutritionRecipeFindManyArgs>
    >;
    adminNutritionSupplementFindMany?: Resolver<Array<GqlSResolversTypes['AdminNutritionSupplement']>, ParentType, ContextType>;
}>;

export type GqlSAdminNutritionRecipeResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminNutritionRecipe'] = GqlSResolversParentTypes['AdminNutritionRecipe'],
> = ResolversObject<{
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    ingredients?: Resolver<Array<GqlSResolversTypes['String']>, ParentType, ContextType>;
    isFavorite?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    lastMadeAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    mealType?: Resolver<GqlSResolversTypes['AdminNutritionMealType'], ParentType, ContextType>;
    notes?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    prepTimeMinutes?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    rating?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    recipeId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    servings?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    sourceUrl?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    steps?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    tags?: Resolver<Array<GqlSResolversTypes['String']>, ParentType, ContextType>;
    title?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSAdminNutritionSupplementResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminNutritionSupplement'] = GqlSResolversParentTypes['AdminNutritionSupplement'],
> = ResolversObject<{
    brand?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    name?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    notes?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    nutrients?: Resolver<Array<GqlSResolversTypes['AdminNutritionSupplementNutrient']>, ParentType, ContextType>;
    researchedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    servingSize?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    servingsPerContainer?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    sourceUrl?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    supplementId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSAdminNutritionSupplementNutrientResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminNutritionSupplementNutrient'] =
        GqlSResolversParentTypes['AdminNutritionSupplementNutrient'],
> = ResolversObject<{
    amount?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    name?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    nutrientId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    percentDailyValue?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    sortOrder?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    unit?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
}>;

export type GqlSAdminNutritionSupplementNutrientProposalResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminNutritionSupplementNutrientProposal'] =
        GqlSResolversParentTypes['AdminNutritionSupplementNutrientProposal'],
> = ResolversObject<{
    amount?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    name?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    percentDailyValue?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    unit?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
}>;

export type GqlSAdminNutritionSupplementResearchResultResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminNutritionSupplementResearchResult'] =
        GqlSResolversParentTypes['AdminNutritionSupplementResearchResult'],
> = ResolversObject<{
    brand?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    found?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    notes?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    nutrients?: Resolver<Array<GqlSResolversTypes['AdminNutritionSupplementNutrientProposal']>, ParentType, ContextType>;
    servingSize?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    servingsPerContainer?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    sourceUrl?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    summary?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
}>;

export type GqlSAdminProjectResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminProject'] = GqlSResolversParentTypes['AdminProject'],
> = ResolversObject<{
    activities?: Resolver<Array<GqlSResolversTypes['AdminProjectActivity']>, ParentType, ContextType>;
    completedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    description?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    files?: Resolver<Array<GqlSResolversTypes['AdminProjectFile']>, ParentType, ContextType>;
    links?: Resolver<Array<GqlSResolversTypes['AdminProjectLink']>, ParentType, ContextType>;
    notes?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    position?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    projectId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    sourceRequest?: Resolver<Maybe<GqlSResolversTypes['AdminProjectRequest']>, ParentType, ContextType>;
    startedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    status?: Resolver<GqlSResolversTypes['AdminProjectStatus'], ParentType, ContextType>;
    tasks?: Resolver<Array<GqlSResolversTypes['AdminProjectTask']>, ParentType, ContextType>;
    title?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    totalWorkSec?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSAdminProjectActivityResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminProjectActivity'] = GqlSResolversParentTypes['AdminProjectActivity'],
> = ResolversObject<{
    activityId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    amountCents?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    channel?: Resolver<Maybe<GqlSResolversTypes['AdminProjectActivityChannel']>, ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    direction?: Resolver<GqlSResolversTypes['AdminProjectActivityDirection'], ParentType, ContextType>;
    durationSec?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    endedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    files?: Resolver<Array<GqlSResolversTypes['AdminProjectFile']>, ParentType, ContextType>;
    kind?: Resolver<GqlSResolversTypes['AdminProjectActivityKind'], ParentType, ContextType>;
    links?: Resolver<Array<GqlSResolversTypes['AdminProjectLink']>, ParentType, ContextType>;
    notes?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    occurredAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    offerStatus?: Resolver<Maybe<GqlSResolversTypes['AdminProjectOfferStatus']>, ParentType, ContextType>;
    projectId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    startedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    taskId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    title?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSAdminProjectFileResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminProjectFile'] = GqlSResolversParentTypes['AdminProjectFile'],
> = ResolversObject<{
    activityId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    fileUpload?: Resolver<GqlSResolversTypes['FileUpload'], ParentType, ContextType>;
    kind?: Resolver<GqlSResolversTypes['AdminProjectFileKind'], ParentType, ContextType>;
    label?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    pinned?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    projectFileId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    projectId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSAdminProjectLinkResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminProjectLink'] = GqlSResolversParentTypes['AdminProjectLink'],
> = ResolversObject<{
    activityId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    kind?: Resolver<GqlSResolversTypes['AdminProjectLinkKind'], ParentType, ContextType>;
    label?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    pinned?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    projectId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    projectLinkId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    url?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
}>;

export type GqlSAdminProjectRequestResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminProjectRequest'] = GqlSResolversParentTypes['AdminProjectRequest'],
> = ResolversObject<{
    budget?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    chatId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    company?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    convertedProject?: Resolver<Maybe<GqlSResolversTypes['AdminProject']>, ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    description?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    email?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    name?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    projectRequestId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    projectType?: Resolver<GqlSResolversTypes['AdminProjectRequestType'], ParentType, ContextType>;
    status?: Resolver<GqlSResolversTypes['AdminProjectRequestStatus'], ParentType, ContextType>;
    timeline?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    verifiedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
}>;

export type GqlSAdminProjectTaskResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminProjectTask'] = GqlSResolversParentTypes['AdminProjectTask'],
> = ResolversObject<{
    completedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    dueAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    effort?: Resolver<Maybe<GqlSResolversTypes['AdminProjectTaskEffort']>, ParentType, ContextType>;
    notes?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    position?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    projectId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    status?: Resolver<GqlSResolversTypes['AdminProjectTaskStatus'], ParentType, ContextType>;
    taskId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    title?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    whenBucket?: Resolver<Maybe<GqlSResolversTypes['AdminProjectTaskWhenBucket']>, ParentType, ContextType>;
}>;

export type GqlSAdminTaxDocumentResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminTaxDocument'] = GqlSResolversParentTypes['AdminTaxDocument'],
> = ResolversObject<{
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    documentId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    files?: Resolver<Array<GqlSResolversTypes['AdminTaxFile']>, ParentType, ContextType>;
    kind?: Resolver<GqlSResolversTypes['AdminTaxDocumentKind'], ParentType, ContextType>;
    notes?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    status?: Resolver<GqlSResolversTypes['AdminTaxDocumentStatus'], ParentType, ContextType>;
    title?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSAdminTaxExpenseResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminTaxExpense'] = GqlSResolversParentTypes['AdminTaxExpense'],
> = ResolversObject<{
    amountCents?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    categoryKey?: Resolver<GqlSResolversTypes['AdminTaxExpenseCategory'], ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    deductible?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    description?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    expenseId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    files?: Resolver<Array<GqlSResolversTypes['AdminTaxFile']>, ParentType, ContextType>;
    incomeSourceId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    incurredOn?: Resolver<Maybe<GqlSResolversTypes['Date']>, ParentType, ContextType>;
    notes?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSAdminTaxFileResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminTaxFile'] = GqlSResolversParentTypes['AdminTaxFile'],
> = ResolversObject<{
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    documentId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    expenseId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    fileUpload?: Resolver<GqlSResolversTypes['FileUpload'], ParentType, ContextType>;
    kind?: Resolver<GqlSResolversTypes['AdminTaxFileKind'], ParentType, ContextType>;
    label?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    pinned?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    taxFileId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    taxYearId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSAdminTaxIncomeSourceResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminTaxIncomeSource'] = GqlSResolversParentTypes['AdminTaxIncomeSource'],
> = ResolversObject<{
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    grossAmountCents?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    incomeSourceId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    kind?: Resolver<GqlSResolversTypes['AdminTaxIncomeKind'], ParentType, ContextType>;
    label?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    notes?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSAdminTaxQueryResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminTaxQuery'] = GqlSResolversParentTypes['AdminTaxQuery'],
> = ResolversObject<{
    adminTaxYearFindMany?: Resolver<Array<GqlSResolversTypes['AdminTaxYear']>, ParentType, ContextType>;
}>;

export type GqlSAdminTaxYearResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminTaxYear'] = GqlSResolversParentTypes['AdminTaxYear'],
> = ResolversObject<{
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    documents?: Resolver<Array<GqlSResolversTypes['AdminTaxDocument']>, ParentType, ContextType>;
    expenses?: Resolver<Array<GqlSResolversTypes['AdminTaxExpense']>, ParentType, ContextType>;
    filingDeadline?: Resolver<Maybe<GqlSResolversTypes['Date']>, ParentType, ContextType>;
    incomeSources?: Resolver<Array<GqlSResolversTypes['AdminTaxIncomeSource']>, ParentType, ContextType>;
    notes?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    status?: Resolver<GqlSResolversTypes['AdminTaxYearStatus'], ParentType, ContextType>;
    submittedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    taxYearId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    totalDeductibleCents?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    totalIncomeCents?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    year?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
}>;

export type GqlSAdminTravelQueryResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminTravelQuery'] = GqlSResolversParentTypes['AdminTravelQuery'],
> = ResolversObject<{
    adminTravelTripFindMany?: Resolver<Array<GqlSResolversTypes['AdminTravelTrip']>, ParentType, ContextType>;
    adminTravelTripFindOne?: Resolver<
        Maybe<GqlSResolversTypes['AdminTravelTrip']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminTravelQueryAdminTravelTripFindOneArgs, 'tripId'>
    >;
}>;

export type GqlSAdminTravelTripResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminTravelTrip'] = GqlSResolversParentTypes['AdminTravelTrip'],
> = ResolversObject<{
    accommodation?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    days?: Resolver<Array<GqlSResolversTypes['AdminTravelTripDay']>, ParentType, ContextType>;
    destination?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    endsOn?: Resolver<Maybe<GqlSResolversTypes['Date']>, ParentType, ContextType>;
    notes?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    packingItems?: Resolver<Array<GqlSResolversTypes['AdminTravelTripPackingItem']>, ParentType, ContextType>;
    startsOn?: Resolver<Maybe<GqlSResolversTypes['Date']>, ParentType, ContextType>;
    status?: Resolver<GqlSResolversTypes['AdminTravelTripStatus'], ParentType, ContextType>;
    title?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    transportMode?: Resolver<Maybe<GqlSResolversTypes['AdminTravelTransportMode']>, ParentType, ContextType>;
    tripId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSAdminTravelTripActivityResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminTravelTripActivity'] = GqlSResolversParentTypes['AdminTravelTripActivity'],
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

export type GqlSAdminTravelTripDayResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminTravelTripDay'] = GqlSResolversParentTypes['AdminTravelTripDay'],
> = ResolversObject<{
    activities?: Resolver<Array<GqlSResolversTypes['AdminTravelTripActivity']>, ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    date?: Resolver<Maybe<GqlSResolversTypes['Date']>, ParentType, ContextType>;
    dayNumber?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    summary?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    title?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    tripDayId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    tripId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSAdminTravelTripPackingItemResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminTravelTripPackingItem'] = GqlSResolversParentTypes['AdminTravelTripPackingItem'],
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

export type GqlSResolvers<ContextType = any> = ResolversObject<{
    Admin?: GqlSAdminResolvers<ContextType>;
    AdminChatConfig?: GqlSAdminChatConfigResolvers<ContextType>;
    AdminChatModel?: GqlSAdminChatModelResolvers<ContextType>;
    AdminCompass?: GqlSAdminCompassResolvers<ContextType>;
    AdminFinancesQuery?: GqlSAdminFinancesQueryResolvers<ContextType>;
    AdminFinancesRecurringCost?: GqlSAdminFinancesRecurringCostResolvers<ContextType>;
    AdminFitnessExercise?: GqlSAdminFitnessExerciseResolvers<ContextType>;
    AdminFitnessQuery?: GqlSAdminFitnessQueryResolvers<ContextType>;
    AdminFitnessWorkoutRoutine?: GqlSAdminFitnessWorkoutRoutineResolvers<ContextType>;
    AdminFitnessWorkoutRoutineItem?: GqlSAdminFitnessWorkoutRoutineItemResolvers<ContextType>;
    AdminFitnessWorkoutSession?: GqlSAdminFitnessWorkoutSessionResolvers<ContextType>;
    AdminFitnessWorkoutSet?: GqlSAdminFitnessWorkoutSetResolvers<ContextType>;
    AdminInventoryItem?: GqlSAdminInventoryItemResolvers<ContextType>;
    AdminInventoryItemFile?: GqlSAdminInventoryItemFileResolvers<ContextType>;
    AdminInventoryItemServiceEntry?: GqlSAdminInventoryItemServiceEntryResolvers<ContextType>;
    AdminInventoryItemValuation?: GqlSAdminInventoryItemValuationResolvers<ContextType>;
    AdminInventoryQuery?: GqlSAdminInventoryQueryResolvers<ContextType>;
    AdminMediaChannel?: GqlSAdminMediaChannelResolvers<ContextType>;
    AdminMediaMovie?: GqlSAdminMediaMovieResolvers<ContextType>;
    AdminMediaQuery?: GqlSAdminMediaQueryResolvers<ContextType>;
    AdminMediaShow?: GqlSAdminMediaShowResolvers<ContextType>;
    AdminMediaTmdbMovieResult?: GqlSAdminMediaTmdbMovieResultResolvers<ContextType>;
    AdminMediaTmdbTvResult?: GqlSAdminMediaTmdbTvResultResolvers<ContextType>;
    AdminMediaYoutubeChannelResult?: GqlSAdminMediaYoutubeChannelResultResolvers<ContextType>;
    AdminMedicalAppointment?: GqlSAdminMedicalAppointmentResolvers<ContextType>;
    AdminMedicalCategoryOverview?: GqlSAdminMedicalCategoryOverviewResolvers<ContextType>;
    AdminMedicalQuery?: GqlSAdminMedicalQueryResolvers<ContextType>;
    AdminMedicalRecord?: GqlSAdminMedicalRecordResolvers<ContextType>;
    AdminMedicalRecordFile?: GqlSAdminMedicalRecordFileResolvers<ContextType>;
    AdminMutation?: GqlSAdminMutationResolvers<ContextType>;
    AdminNutritionFoodLogEntry?: GqlSAdminNutritionFoodLogEntryResolvers<ContextType>;
    AdminNutritionMealPlanEntry?: GqlSAdminNutritionMealPlanEntryResolvers<ContextType>;
    AdminNutritionQuery?: GqlSAdminNutritionQueryResolvers<ContextType>;
    AdminNutritionRecipe?: GqlSAdminNutritionRecipeResolvers<ContextType>;
    AdminNutritionSupplement?: GqlSAdminNutritionSupplementResolvers<ContextType>;
    AdminNutritionSupplementNutrient?: GqlSAdminNutritionSupplementNutrientResolvers<ContextType>;
    AdminNutritionSupplementNutrientProposal?: GqlSAdminNutritionSupplementNutrientProposalResolvers<ContextType>;
    AdminNutritionSupplementResearchResult?: GqlSAdminNutritionSupplementResearchResultResolvers<ContextType>;
    AdminProject?: GqlSAdminProjectResolvers<ContextType>;
    AdminProjectActivity?: GqlSAdminProjectActivityResolvers<ContextType>;
    AdminProjectFile?: GqlSAdminProjectFileResolvers<ContextType>;
    AdminProjectLink?: GqlSAdminProjectLinkResolvers<ContextType>;
    AdminProjectRequest?: GqlSAdminProjectRequestResolvers<ContextType>;
    AdminProjectTask?: GqlSAdminProjectTaskResolvers<ContextType>;
    AdminTaxDocument?: GqlSAdminTaxDocumentResolvers<ContextType>;
    AdminTaxExpense?: GqlSAdminTaxExpenseResolvers<ContextType>;
    AdminTaxFile?: GqlSAdminTaxFileResolvers<ContextType>;
    AdminTaxIncomeSource?: GqlSAdminTaxIncomeSourceResolvers<ContextType>;
    AdminTaxQuery?: GqlSAdminTaxQueryResolvers<ContextType>;
    AdminTaxYear?: GqlSAdminTaxYearResolvers<ContextType>;
    AdminTravelQuery?: GqlSAdminTravelQueryResolvers<ContextType>;
    AdminTravelTrip?: GqlSAdminTravelTripResolvers<ContextType>;
    AdminTravelTripActivity?: GqlSAdminTravelTripActivityResolvers<ContextType>;
    AdminTravelTripDay?: GqlSAdminTravelTripDayResolvers<ContextType>;
    AdminTravelTripPackingItem?: GqlSAdminTravelTripPackingItemResolvers<ContextType>;
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
    JSON?: GraphQLScalarType;
    Log?: GqlSLogResolvers<ContextType>;
    Mutation?: GqlSMutationResolvers<ContextType>;
    MutationResult?: GqlSMutationResultResolvers<ContextType>;
    Query?: GqlSQueryResolvers<ContextType>;
    Session?: GqlSSessionResolvers<ContextType>;
    Subscription?: GqlSSubscriptionResolvers<ContextType>;
    User?: GqlSUserResolvers<ContextType>;
    UserMutation?: GqlSUserMutationResolvers<ContextType>;
    VisitorChatQuota?: GqlSVisitorChatQuotaResolvers<ContextType>;
}>;

type Properties<T> = {
    [K in keyof T]: z.ZodType<T[K], T[K] | undefined>;
};

type definedNonNullAny = {};

export const isDefinedNonNullAny = (v: any): v is definedNonNullAny => v !== undefined && v !== null;

export const definedNonNullAnySchema = z.any().refine((v) => isDefinedNonNullAny(v));

export const GqlSAdminFinancesCadenceSchema: z.ZodType<'monthly' | 'yearly', 'monthly' | 'yearly'> = z.enum(['monthly', 'yearly']);

export const GqlSAdminFinancesRecurringCostCategorySchema: z.ZodType<
    | 'connectivity'
    | 'donations'
    | 'household'
    | 'housing'
    | 'insurance'
    | 'memberships'
    | 'other'
    | 'savingsGeneral'
    | 'savingsVacation'
    | 'subscriptionsEntertainment'
    | 'subscriptionsWork'
    | 'transport',
    | 'connectivity'
    | 'donations'
    | 'household'
    | 'housing'
    | 'insurance'
    | 'memberships'
    | 'other'
    | 'savingsGeneral'
    | 'savingsVacation'
    | 'subscriptionsEntertainment'
    | 'subscriptionsWork'
    | 'transport'
> = z.enum([
    'connectivity',
    'donations',
    'household',
    'housing',
    'insurance',
    'memberships',
    'other',
    'savingsGeneral',
    'savingsVacation',
    'subscriptionsEntertainment',
    'subscriptionsWork',
    'transport',
]);

export const GqlSAdminFitnessEquipmentTypeSchema: z.ZodType<
    'barbell' | 'bodyweight' | 'cable' | 'dumbbell' | 'kettlebell' | 'machine' | 'other',
    'barbell' | 'bodyweight' | 'cable' | 'dumbbell' | 'kettlebell' | 'machine' | 'other'
> = z.enum(['barbell', 'bodyweight', 'cable', 'dumbbell', 'kettlebell', 'machine', 'other']);

export const GqlSAdminFitnessMuscleGroupSchema: z.ZodType<
    'arms' | 'back' | 'cardio' | 'chest' | 'core' | 'fullBody' | 'legs' | 'other' | 'shoulders',
    'arms' | 'back' | 'cardio' | 'chest' | 'core' | 'fullBody' | 'legs' | 'other' | 'shoulders'
> = z.enum(['arms', 'back', 'cardio', 'chest', 'core', 'fullBody', 'legs', 'other', 'shoulders']);

export const GqlSAdminInventoryItemCategorySchema: z.ZodType<
    'appliance' | 'clothing' | 'electronics' | 'furniture' | 'kitchen' | 'other' | 'sports' | 'tool' | 'vehicle',
    'appliance' | 'clothing' | 'electronics' | 'furniture' | 'kitchen' | 'other' | 'sports' | 'tool' | 'vehicle'
> = z.enum(['appliance', 'clothing', 'electronics', 'furniture', 'kitchen', 'other', 'sports', 'tool', 'vehicle']);

export const GqlSAdminInventoryItemConditionSchema: z.ZodType<
    'fair' | 'good' | 'likeNew' | 'new' | 'poor',
    'fair' | 'good' | 'likeNew' | 'new' | 'poor'
> = z.enum(['fair', 'good', 'likeNew', 'new', 'poor']);

export const GqlSAdminInventoryItemDisposalStateSchema: z.ZodType<
    'disposed' | 'gifted' | 'lost' | 'owned' | 'sold',
    'disposed' | 'gifted' | 'lost' | 'owned' | 'sold'
> = z.enum(['disposed', 'gifted', 'lost', 'owned', 'sold']);

export const GqlSAdminInventoryItemFileKindSchema: z.ZodType<
    'invoice' | 'manual' | 'other' | 'photo' | 'receipt' | 'warranty',
    'invoice' | 'manual' | 'other' | 'photo' | 'receipt' | 'warranty'
> = z.enum(['invoice', 'manual', 'other', 'photo', 'receipt', 'warranty']);

export const GqlSAdminInventoryItemServiceKindSchema: z.ZodType<
    'other' | 'repair' | 'replacement' | 'service',
    'other' | 'repair' | 'replacement' | 'service'
> = z.enum(['other', 'repair', 'replacement', 'service']);

export const GqlSAdminMediaMovieStatusSchema: z.ZodType<
    'dropped' | 'watched' | 'watching' | 'watchlist',
    'dropped' | 'watched' | 'watching' | 'watchlist'
> = z.enum(['dropped', 'watched', 'watching', 'watchlist']);

export const GqlSAdminMediaPlatformSchema: z.ZodType<
    'other' | 'podcast' | 'twitch' | 'youtube',
    'other' | 'podcast' | 'twitch' | 'youtube'
> = z.enum(['other', 'podcast', 'twitch', 'youtube']);

export const GqlSAdminMediaTopicSchema: z.ZodType<
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

export const GqlSAdminMedicalAppointmentStatusSchema: z.ZodType<
    'cancelled' | 'completed' | 'missed' | 'scheduled',
    'cancelled' | 'completed' | 'missed' | 'scheduled'
> = z.enum(['cancelled', 'completed', 'missed', 'scheduled']);

export const GqlSAdminMedicalCategorySchema: z.ZodType<
    'dentist' | 'dermatology' | 'ent' | 'eyes' | 'gp' | 'mentalHealth' | 'other' | 'physio',
    'dentist' | 'dermatology' | 'ent' | 'eyes' | 'gp' | 'mentalHealth' | 'other' | 'physio'
> = z.enum(['dentist', 'dermatology', 'ent', 'eyes', 'gp', 'mentalHealth', 'other', 'physio']);

export const GqlSAdminMedicalRecordSeveritySchema: z.ZodType<
    'info' | 'mild' | 'moderate' | 'severe',
    'info' | 'mild' | 'moderate' | 'severe'
> = z.enum(['info', 'mild', 'moderate', 'severe']);

export const GqlSAdminNutritionFoodLogKindSchema: z.ZodType<'drink' | 'food', 'drink' | 'food'> = z.enum(['drink', 'food']);

export const GqlSAdminNutritionMealTypeSchema: z.ZodType<
    'breakfast' | 'dinner' | 'lunch' | 'other' | 'snack',
    'breakfast' | 'dinner' | 'lunch' | 'other' | 'snack'
> = z.enum(['breakfast', 'dinner', 'lunch', 'other', 'snack']);

export const GqlSAdminProjectActivityChannelSchema: z.ZodType<
    'aiAssistant' | 'email' | 'inPerson' | 'malt' | 'other' | 'phone' | 'videoCall',
    'aiAssistant' | 'email' | 'inPerson' | 'malt' | 'other' | 'phone' | 'videoCall'
> = z.enum(['aiAssistant', 'email', 'inPerson', 'malt', 'other', 'phone', 'videoCall']);

export const GqlSAdminProjectActivityDirectionSchema: z.ZodType<
    'incoming' | 'internal' | 'outgoing',
    'incoming' | 'internal' | 'outgoing'
> = z.enum(['incoming', 'internal', 'outgoing']);

export const GqlSAdminProjectActivityKindSchema: z.ZodType<
    'clientContact' | 'meeting' | 'milestone' | 'note' | 'offer' | 'work',
    'clientContact' | 'meeting' | 'milestone' | 'note' | 'offer' | 'work'
> = z.enum(['clientContact', 'meeting', 'milestone', 'note', 'offer', 'work']);

export const GqlSAdminProjectFileKindSchema: z.ZodType<
    'contract' | 'invoice' | 'offer' | 'other' | 'screenshot',
    'contract' | 'invoice' | 'offer' | 'other' | 'screenshot'
> = z.enum(['contract', 'invoice', 'offer', 'other', 'screenshot']);

export const GqlSAdminProjectLinkKindSchema: z.ZodType<
    'figma' | 'gdrive' | 'github' | 'invoice' | 'malt' | 'notion' | 'offer' | 'other',
    'figma' | 'gdrive' | 'github' | 'invoice' | 'malt' | 'notion' | 'offer' | 'other'
> = z.enum(['figma', 'gdrive', 'github', 'invoice', 'malt', 'notion', 'offer', 'other']);

export const GqlSAdminProjectOfferStatusSchema: z.ZodType<
    'accepted' | 'rejected' | 'sent' | 'withdrawn',
    'accepted' | 'rejected' | 'sent' | 'withdrawn'
> = z.enum(['accepted', 'rejected', 'sent', 'withdrawn']);

export const GqlSAdminProjectRequestStatusSchema: z.ZodType<
    'archived' | 'emailVerified' | 'pendingOtp',
    'archived' | 'emailVerified' | 'pendingOtp'
> = z.enum(['archived', 'emailVerified', 'pendingOtp']);

export const GqlSAdminProjectRequestTypeSchema: z.ZodType<
    'aiIntegration' | 'consulting' | 'mobile' | 'other' | 'webApp',
    'aiIntegration' | 'consulting' | 'mobile' | 'other' | 'webApp'
> = z.enum(['aiIntegration', 'consulting', 'mobile', 'other', 'webApp']);

export const GqlSAdminProjectStatusSchema: z.ZodType<
    'active' | 'archived' | 'done' | 'idea' | 'paused' | 'planning',
    'active' | 'archived' | 'done' | 'idea' | 'paused' | 'planning'
> = z.enum(['active', 'archived', 'done', 'idea', 'paused', 'planning']);

export const GqlSAdminProjectTaskEffortSchema: z.ZodType<'deep' | 'focused' | 'quick', 'deep' | 'focused' | 'quick'> = z.enum([
    'deep',
    'focused',
    'quick',
]);

export const GqlSAdminProjectTaskStatusSchema: z.ZodType<'doing' | 'done' | 'todo', 'doing' | 'done' | 'todo'> = z.enum([
    'doing',
    'done',
    'todo',
]);

export const GqlSAdminProjectTaskWhenBucketSchema: z.ZodType<
    'someday' | 'today' | 'waiting' | 'week',
    'someday' | 'today' | 'waiting' | 'week'
> = z.enum(['someday', 'today', 'waiting', 'week']);

export const GqlSAdminTaxDocumentKindSchema: z.ZodType<
    'bankStatement' | 'donationReceipt' | 'euer' | 'insuranceStatement' | 'lohnsteuerbescheinigung' | 'minijobConfirmation' | 'other',
    'bankStatement' | 'donationReceipt' | 'euer' | 'insuranceStatement' | 'lohnsteuerbescheinigung' | 'minijobConfirmation' | 'other'
> = z.enum(['bankStatement', 'donationReceipt', 'euer', 'insuranceStatement', 'lohnsteuerbescheinigung', 'minijobConfirmation', 'other']);

export const GqlSAdminTaxDocumentStatusSchema: z.ZodType<'needed' | 'notApplicable' | 'received', 'needed' | 'notApplicable' | 'received'> =
    z.enum(['needed', 'notApplicable', 'received']);

export const GqlSAdminTaxExpenseCategorySchema: z.ZodType<
    'businessExpense' | 'extraordinary' | 'homeOffice' | 'insurance' | 'other' | 'specialExpenses' | 'workRelated',
    'businessExpense' | 'extraordinary' | 'homeOffice' | 'insurance' | 'other' | 'specialExpenses' | 'workRelated'
> = z.enum(['businessExpense', 'extraordinary', 'homeOffice', 'insurance', 'other', 'specialExpenses', 'workRelated']);

export const GqlSAdminTaxFileKindSchema: z.ZodType<'other' | 'receipt' | 'scan' | 'statement', 'other' | 'receipt' | 'scan' | 'statement'> =
    z.enum(['other', 'receipt', 'scan', 'statement']);

export const GqlSAdminTaxIncomeKindSchema: z.ZodType<
    'business' | 'capital' | 'employment' | 'minijob' | 'other' | 'selfEmployment',
    'business' | 'capital' | 'employment' | 'minijob' | 'other' | 'selfEmployment'
> = z.enum(['business', 'capital', 'employment', 'minijob', 'other', 'selfEmployment']);

export const GqlSAdminTaxYearStatusSchema: z.ZodType<
    'closed' | 'collecting' | 'filing' | 'open' | 'submitted',
    'closed' | 'collecting' | 'filing' | 'open' | 'submitted'
> = z.enum(['closed', 'collecting', 'filing', 'open', 'submitted']);

export const GqlSAdminTravelTransportModeSchema: z.ZodType<
    'car' | 'ferry' | 'flight' | 'mixed' | 'train',
    'car' | 'ferry' | 'flight' | 'mixed' | 'train'
> = z.enum(['car', 'ferry', 'flight', 'mixed', 'train']);

export const GqlSAdminTravelTripStatusSchema: z.ZodType<
    'active' | 'cancelled' | 'completed' | 'draft' | 'planned',
    'active' | 'cancelled' | 'completed' | 'draft' | 'planned'
> = z.enum(['active', 'cancelled', 'completed', 'draft', 'planned']);

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

export const GqlSLogLevelSchema: z.ZodType<'debug' | 'error' | 'info' | 'warn', 'debug' | 'error' | 'info' | 'warn'> = z.enum([
    'debug',
    'error',
    'info',
    'warn',
]);

export function GqlSAdminFinancesRecurringCostInputSchema(): z.ZodObject<Properties<GqlSAdminFinancesRecurringCostInput>> {
    return z.object({
        active: z.boolean().nullish(),
        amountCents: z.number(),
        cadence: GqlSAdminFinancesCadenceSchema,
        categoryKey: GqlSAdminFinancesRecurringCostCategorySchema,
        costId: z.string().nullish(),
        currency: z.string().nullish(),
        endsOn: z.string().nullish(),
        name: z.string(),
        notes: z.string().nullish(),
        startsOn: z.string().nullish(),
    });
}

export function GqlSAdminFitnessExerciseInputSchema(): z.ZodObject<Properties<GqlSAdminFitnessExerciseInput>> {
    return z.object({
        equipment: GqlSAdminFitnessEquipmentTypeSchema.nullish(),
        exerciseId: z.string().nullish(),
        muscleGroup: GqlSAdminFitnessMuscleGroupSchema,
        name: z.string(),
        notes: z.string().nullish(),
    });
}

export function GqlSAdminFitnessWorkoutRoutineInputSchema(): z.ZodObject<Properties<GqlSAdminFitnessWorkoutRoutineInput>> {
    return z.object({
        name: z.string(),
        notes: z.string().nullish(),
        position: z.number().nullish(),
        routineId: z.string().nullish(),
    });
}

export function GqlSAdminFitnessWorkoutRoutineItemInputSchema(): z.ZodObject<Properties<GqlSAdminFitnessWorkoutRoutineItemInput>> {
    return z.object({
        exerciseId: z.string(),
        notes: z.string().nullish(),
        position: z.number().nullish(),
        routineId: z.string(),
        routineItemId: z.string().nullish(),
        targetReps: z.number().nullish(),
        targetSets: z.number().nullish(),
        targetWeight: z.number().nullish(),
    });
}

export function GqlSAdminFitnessWorkoutSessionInputSchema(): z.ZodObject<Properties<GqlSAdminFitnessWorkoutSessionInput>> {
    return z.object({
        date: z.string(),
        durationMinutes: z.number().nullish(),
        notes: z.string().nullish(),
        routineId: z.string().nullish(),
        sessionId: z.string().nullish(),
        title: z.string().nullish(),
    });
}

export function GqlSAdminFitnessWorkoutSetInputSchema(): z.ZodObject<Properties<GqlSAdminFitnessWorkoutSetInput>> {
    return z.object({
        exerciseId: z.string(),
        isWarmup: z.boolean().nullish(),
        notes: z.string().nullish(),
        position: z.number().nullish(),
        reps: z.number().nullish(),
        rpe: z.number().nullish(),
        sessionId: z.string(),
        setId: z.string().nullish(),
        weight: z.number().nullish(),
    });
}

export function GqlSAdminInventoryItemFileAttachInputSchema(): z.ZodObject<Properties<GqlSAdminInventoryItemFileAttachInput>> {
    return z.object({
        fileUploadId: z.string(),
        itemId: z.string(),
        kind: GqlSAdminInventoryItemFileKindSchema,
        label: z.string().nullish(),
        pinned: z.boolean().nullish(),
        serviceEntryId: z.string().nullish(),
    });
}

export function GqlSAdminInventoryItemFileUpsertSchema(): z.ZodObject<Properties<GqlSAdminInventoryItemFileUpsert>> {
    return z.object({
        itemFileId: z.string(),
        label: z.string().nullish(),
        pinned: z.boolean().nullish(),
    });
}

export function GqlSAdminInventoryItemInputSchema(): z.ZodObject<Properties<GqlSAdminInventoryItemInput>> {
    return z.object({
        brand: z.string().nullish(),
        categoryKey: GqlSAdminInventoryItemCategorySchema,
        condition: GqlSAdminInventoryItemConditionSchema.nullish(),
        disposalState: GqlSAdminInventoryItemDisposalStateSchema.nullish(),
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

export function GqlSAdminInventoryItemRepriceInputSchema(): z.ZodObject<Properties<GqlSAdminInventoryItemRepriceInput>> {
    return z.object({
        itemId: z.string(),
        note: z.string().nullish(),
        valueCents: z.number(),
        valuedAt: z.date().nullish(),
    });
}

export function GqlSAdminInventoryItemServiceEntryInputSchema(): z.ZodObject<Properties<GqlSAdminInventoryItemServiceEntryInput>> {
    return z.object({
        costCents: z.number().nullish(),
        itemId: z.string(),
        kind: GqlSAdminInventoryItemServiceKindSchema,
        nextDueAt: z.string().nullish(),
        notes: z.string().nullish(),
        performedAt: z.string(),
        serviceEntryId: z.string().nullish(),
        vendor: z.string().nullish(),
    });
}

export function GqlSAdminMediaChannelInputSchema(): z.ZodObject<Properties<GqlSAdminMediaChannelInput>> {
    return z.object({
        avatarUrl: z.string().nullish(),
        channelId: z.string().nullish(),
        description: z.string().nullish(),
        handle: z.string().nullish(),
        name: z.string(),
        notes: z.string().nullish(),
        platform: GqlSAdminMediaPlatformSchema,
        topics: z.array(z.string()),
        url: z.string(),
    });
}

export function GqlSAdminMediaMovieAddFromTmdbInputSchema(): z.ZodObject<Properties<GqlSAdminMediaMovieAddFromTmdbInput>> {
    return z.object({
        status: GqlSAdminMediaMovieStatusSchema.nullish(),
        tmdbId: z.number(),
    });
}

export function GqlSAdminMediaMovieInputSchema(): z.ZodObject<Properties<GqlSAdminMediaMovieInput>> {
    return z.object({
        backdropUrl: z.string().nullish(),
        movieId: z.string().nullish(),
        notes: z.string().nullish(),
        overview: z.string().nullish(),
        posterUrl: z.string().nullish(),
        rating: z.number().nullish(),
        releaseDate: z.string().nullish(),
        runtimeMinutes: z.number().nullish(),
        status: GqlSAdminMediaMovieStatusSchema,
        title: z.string(),
        tmdbId: z.number().nullish(),
        topics: z.array(z.string()),
        watchedAt: z.date().nullish(),
    });
}

export function GqlSAdminMediaShowAddFromTmdbInputSchema(): z.ZodObject<Properties<GqlSAdminMediaShowAddFromTmdbInput>> {
    return z.object({
        status: GqlSAdminMediaMovieStatusSchema.nullish(),
        tmdbId: z.number(),
    });
}

export function GqlSAdminMediaShowInputSchema(): z.ZodObject<Properties<GqlSAdminMediaShowInput>> {
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
        status: GqlSAdminMediaMovieStatusSchema,
        title: z.string(),
        tmdbId: z.number().nullish(),
        topics: z.array(z.string()),
    });
}

export function GqlSAdminMedicalAppointmentInputSchema(): z.ZodObject<Properties<GqlSAdminMedicalAppointmentInput>> {
    return z.object({
        appointmentId: z.string().nullish(),
        category: GqlSAdminMedicalCategorySchema,
        completedAt: z.date().nullish(),
        nextDueAt: z.date().nullish(),
        notes: z.string().nullish(),
        providerName: z.string().nullish(),
        scheduledAt: z.date(),
        status: GqlSAdminMedicalAppointmentStatusSchema,
        title: z.string(),
        topics: z.array(z.string()),
    });
}

export function GqlSAdminMedicalRecordFileAttachInputSchema(): z.ZodObject<Properties<GqlSAdminMedicalRecordFileAttachInput>> {
    return z.object({
        fileUploadId: z.string(),
        label: z.string().nullish(),
        pinned: z.boolean().nullish(),
        recordId: z.string(),
    });
}

export function GqlSAdminMedicalRecordInputSchema(): z.ZodObject<Properties<GqlSAdminMedicalRecordInput>> {
    return z.object({
        appointmentId: z.string().nullish(),
        bodyAreas: z.array(z.string()),
        category: GqlSAdminMedicalCategorySchema,
        fileUploadIds: z.array(z.string()).nullish(),
        occurredAt: z.date().nullish(),
        recordId: z.string().nullish(),
        resolvedAt: z.date().nullish(),
        severity: GqlSAdminMedicalRecordSeveritySchema.nullish(),
        summary: z.string(),
        symptoms: z.array(z.string()),
        title: z.string(),
        topics: z.array(z.string()),
    });
}

export function GqlSAdminNutritionFoodLogEntryInputSchema(): z.ZodObject<Properties<GqlSAdminNutritionFoodLogEntryInput>> {
    return z.object({
        consumedAt: z.date(),
        description: z.string(),
        kind: GqlSAdminNutritionFoodLogKindSchema,
        logId: z.string().nullish(),
        mealType: GqlSAdminNutritionMealTypeSchema,
        notes: z.string().nullish(),
        recipeId: z.string().nullish(),
    });
}

export function GqlSAdminNutritionMealPlanEntryInputSchema(): z.ZodObject<Properties<GqlSAdminNutritionMealPlanEntryInput>> {
    return z.object({
        customText: z.string().nullish(),
        date: z.string(),
        entryId: z.string().nullish(),
        mealType: GqlSAdminNutritionMealTypeSchema,
        notes: z.string().nullish(),
        recipeId: z.string().nullish(),
    });
}

export function GqlSAdminNutritionRecipeInputSchema(): z.ZodObject<Properties<GqlSAdminNutritionRecipeInput>> {
    return z.object({
        ingredients: z.array(z.string()).nullish(),
        isFavorite: z.boolean().nullish(),
        lastMadeAt: z.date().nullish(),
        mealType: GqlSAdminNutritionMealTypeSchema,
        notes: z.string().nullish(),
        prepTimeMinutes: z.number().nullish(),
        rating: z.number().nullish(),
        recipeId: z.string().nullish(),
        servings: z.number().nullish(),
        sourceUrl: z.string().nullish(),
        steps: z.string().nullish(),
        tags: z.array(z.string()).nullish(),
        title: z.string(),
    });
}

export function GqlSAdminNutritionSupplementInputSchema(): z.ZodObject<Properties<GqlSAdminNutritionSupplementInput>> {
    return z.object({
        brand: z.string().nullish(),
        name: z.string(),
        notes: z.string().nullish(),
        researchedAt: z.date().nullish(),
        servingSize: z.string().nullish(),
        servingsPerContainer: z.number().nullish(),
        sourceUrl: z.string().nullish(),
        supplementId: z.string().nullish(),
    });
}

export function GqlSAdminNutritionSupplementNutrientInputSchema(): z.ZodObject<Properties<GqlSAdminNutritionSupplementNutrientInput>> {
    return z.object({
        amount: z.string().nullish(),
        name: z.string(),
        percentDailyValue: z.number().nullish(),
        sortOrder: z.number().nullish(),
        unit: z.string().nullish(),
    });
}

export function GqlSAdminNutritionSupplementResearchInputSchema(): z.ZodObject<Properties<GqlSAdminNutritionSupplementResearchInput>> {
    return z.object({
        brand: z.string().nullish(),
        name: z.string(),
    });
}

export function GqlSAdminProjectActivityCreateSchema(): z.ZodObject<Properties<GqlSAdminProjectActivityCreate>> {
    return z.object({
        activityId: z.string().nullish(),
        amountCents: z.number().nullish(),
        attachFileKind: GqlSAdminProjectFileKindSchema.nullish(),
        attachFileLabel: z.string().nullish(),
        attachFilePinned: z.boolean().nullish(),
        attachFileUploadId: z.string().nullish(),
        attachLinkKind: GqlSAdminProjectLinkKindSchema.nullish(),
        attachLinkLabel: z.string().nullish(),
        attachLinkPinned: z.boolean().nullish(),
        attachLinkUrl: z.string().nullish(),
        channel: GqlSAdminProjectActivityChannelSchema.nullish(),
        direction: GqlSAdminProjectActivityDirectionSchema.nullish(),
        durationSec: z.number().nullish(),
        kind: GqlSAdminProjectActivityKindSchema,
        notes: z.string().nullish(),
        occurredAt: z.date(),
        offerStatus: GqlSAdminProjectOfferStatusSchema.nullish(),
        projectId: z.string(),
        taskId: z.string().nullish(),
        title: z.string(),
    });
}

export function GqlSAdminProjectCreateSchema(): z.ZodObject<Properties<GqlSAdminProjectCreate>> {
    return z.object({
        completedAt: z.date().nullish(),
        description: z.string().nullish(),
        notes: z.string().nullish(),
        position: z.number().nullish(),
        projectId: z.string().nullish(),
        sourceRequestId: z.string().nullish(),
        startedAt: z.date().nullish(),
        status: GqlSAdminProjectStatusSchema,
        title: z.string(),
    });
}

export function GqlSAdminProjectFileUpsertSchema(): z.ZodObject<Properties<GqlSAdminProjectFileUpsert>> {
    return z.object({
        activityId: z.string().nullish(),
        fileUploadId: z.string(),
        kind: GqlSAdminProjectFileKindSchema,
        label: z.string().nullish(),
        pinned: z.boolean().nullish(),
        projectFileId: z.string().nullish(),
        projectId: z.string(),
    });
}

export function GqlSAdminProjectLinkUpsertSchema(): z.ZodObject<Properties<GqlSAdminProjectLinkUpsert>> {
    return z.object({
        activityId: z.string().nullish(),
        kind: GqlSAdminProjectLinkKindSchema,
        label: z.string().nullish(),
        pinned: z.boolean().nullish(),
        projectId: z.string(),
        projectLinkId: z.string().nullish(),
        url: z.string(),
    });
}

export function GqlSAdminProjectTaskCreateSchema(): z.ZodObject<Properties<GqlSAdminProjectTaskCreate>> {
    return z.object({
        completedAt: z.date().nullish(),
        dueAt: z.date().nullish(),
        effort: GqlSAdminProjectTaskEffortSchema.nullish(),
        notes: z.string().nullish(),
        position: z.number(),
        projectId: z.string().nullish(),
        status: GqlSAdminProjectTaskStatusSchema,
        taskId: z.string().nullish(),
        title: z.string(),
        whenBucket: GqlSAdminProjectTaskWhenBucketSchema.nullish(),
    });
}

export function GqlSAdminProjectTimerStartInputSchema(): z.ZodObject<Properties<GqlSAdminProjectTimerStartInput>> {
    return z.object({
        projectId: z.string(),
        taskId: z.string().nullish(),
        title: z.string().nullish(),
    });
}

export function GqlSAdminTaxDocumentInputSchema(): z.ZodObject<Properties<GqlSAdminTaxDocumentInput>> {
    return z.object({
        documentId: z.string().nullish().describe('Omit to create; supply to update (e.g. to flip status to received).'),
        kind: GqlSAdminTaxDocumentKindSchema,
        notes: z.string().nullish(),
        status: GqlSAdminTaxDocumentStatusSchema.nullish(),
        taxYearId: z.string(),
        title: z.string().describe("Checklist label, e.g. 'Lohnsteuerbescheinigung 2025'."),
    });
}

export function GqlSAdminTaxExpenseInputSchema(): z.ZodObject<Properties<GqlSAdminTaxExpenseInput>> {
    return z.object({
        amountCents: z.number().describe('Amount in cents (e.g. 89900 for 899,00 €).'),
        categoryKey: GqlSAdminTaxExpenseCategorySchema.describe(
            'businessExpense=Betriebsausgabe, workRelated=Werbungskosten, specialExpenses=Sonderausgaben, insurance=Vorsorgeaufwendungen, extraordinary=außergewöhnliche Belastung, homeOffice=Homeoffice-Pauschale.',
        ),
        deductible: z.boolean().nullish().describe('Whether this counts toward the deductible total. Defaults to true.'),
        description: z.string().describe("What the expense was, e.g. 'MacBook Pro' or 'Fahrtkosten Januar'."),
        expenseId: z.string().nullish().describe('Omit to create; supply to update.'),
        incomeSourceId: z
            .string()
            .nullish()
            .describe(
                'Optional link to the income source this expense offsets (Betriebsausgabe ↔ selfEmployment, Werbungskosten ↔ employment).',
            ),
        incurredOn: z.string().nullish().describe('When the expense was incurred, ISO date (yyyy-mm-dd).'),
        notes: z.string().nullish(),
        taxYearId: z.string(),
    });
}

export function GqlSAdminTaxFileAttachInputSchema(): z.ZodObject<Properties<GqlSAdminTaxFileAttachInput>> {
    return z.object({
        documentId: z.string().nullish().describe('Optional: attach as a scan of this checklist document.'),
        expenseId: z.string().nullish().describe('Optional: attach as a receipt for this expense.'),
        fileUploadId: z.string(),
        kind: GqlSAdminTaxFileKindSchema,
        label: z.string().nullish(),
        pinned: z.boolean().nullish(),
        taxYearId: z.string(),
    });
}

export function GqlSAdminTaxFileUpsertSchema(): z.ZodObject<Properties<GqlSAdminTaxFileUpsert>> {
    return z.object({
        label: z.string().nullish(),
        pinned: z.boolean().nullish(),
        taxFileId: z.string(),
    });
}

export function GqlSAdminTaxIncomeSourceInputSchema(): z.ZodObject<Properties<GqlSAdminTaxIncomeSourceInput>> {
    return z.object({
        grossAmountCents: z.number().nullish().describe('Gross income in cents (e.g. 4500000 for 45.000 €). Omit if not yet known.'),
        incomeSourceId: z.string().nullish().describe('Omit to create; supply to update.'),
        kind: GqlSAdminTaxIncomeKindSchema.describe(
            'Which Anlage this income belongs to: employment=Anlage N, selfEmployment=Anlage S, business=Anlage G, minijob=geringfügige Beschäftigung, capital=Anlage KAP.',
        ),
        label: z.string().describe("Human label, e.g. 'SAP – Festanstellung' or 'Freelance-Entwicklung'."),
        notes: z.string().nullish(),
        taxYearId: z.string(),
    });
}

export function GqlSAdminTaxYearInputSchema(): z.ZodObject<Properties<GqlSAdminTaxYearInput>> {
    return z.object({
        filingDeadline: z.string().nullish().describe('Filing deadline as an ISO date (yyyy-mm-dd), e.g. 2026-07-31.'),
        notes: z.string().nullish(),
        status: GqlSAdminTaxYearStatusSchema.nullish(),
        taxYearId: z.string().nullish().describe('Omit to create a new year; supply to update an existing one.'),
        year: z.number().describe('The calendar year the return covers, e.g. 2025. Must be unique.'),
    });
}

export function GqlSAdminTravelTripActivityInputSchema(): z.ZodObject<Properties<GqlSAdminTravelTripActivityInput>> {
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

export function GqlSAdminTravelTripDayInputSchema(): z.ZodObject<Properties<GqlSAdminTravelTripDayInput>> {
    return z.object({
        date: z.string().nullish(),
        dayNumber: z.number(),
        summary: z.string().nullish(),
        title: z.string().nullish(),
        tripDayId: z.string().nullish(),
        tripId: z.string(),
    });
}

export function GqlSAdminTravelTripInputSchema(): z.ZodObject<Properties<GqlSAdminTravelTripInput>> {
    return z.object({
        accommodation: z.string().nullish(),
        destination: z.string(),
        endsOn: z.string().nullish(),
        notes: z.string().nullish(),
        startsOn: z.string().nullish(),
        status: GqlSAdminTravelTripStatusSchema,
        title: z.string(),
        transportMode: GqlSAdminTravelTransportModeSchema.nullish(),
        tripId: z.string().nullish(),
    });
}

export function GqlSAdminTravelTripPackingItemInputSchema(): z.ZodObject<Properties<GqlSAdminTravelTripPackingItemInput>> {
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
