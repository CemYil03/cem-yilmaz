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
    activeTimer?: Maybe<GqlSProjectActivity>;
    chat: GqlSChat;
    chatConfig: GqlSAdminChatConfig;
    chats: Array<GqlSChat>;
    logs: Array<GqlSLog>;
    profile: GqlSAdminProfile;
    project: GqlSProject;
    projectRequests: Array<GqlSProjectRequest>;
    projectRequestsInboxCount: Scalars['Int']['output'];
    projects: Array<GqlSProject>;
    publicChat: GqlSChat;
    publicChats: Array<GqlSChat>;
    standaloneTasks: Array<GqlSTask>;
}

export type GqlSAdminChatArgs = {
    chatId: Scalars['ID']['input'];
};

export type GqlSAdminLogsArgs = {
    level?: InputMaybe<GqlSLogLevel>;
    limit?: InputMaybe<Scalars['Int']['input']>;
    search?: InputMaybe<Scalars['String']['input']>;
};

export type GqlSAdminProjectArgs = {
    projectId: Scalars['ID']['input'];
};

export type GqlSAdminProjectRequestsArgs = {
    status?: InputMaybe<GqlSProjectRequestStatus>;
};

export type GqlSAdminProjectsArgs = {
    status?: InputMaybe<GqlSProjectStatus>;
};

export type GqlSAdminPublicChatArgs = {
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

export interface GqlSAdminMutation {
    __typename?: 'AdminMutation';
    chatConfigDefaultModelSet: GqlSMutationResult;
    chatInputCollectionRespond?: Maybe<GqlSChatMessageCreateResult>;
    chatMessageCreate?: Maybe<GqlSChatMessageCreateResult>;
    chatToolApprovalRespond?: Maybe<GqlSChatMessageCreateResult>;
    cvEducationDelete: GqlSMutationResult;
    cvEducationReorder: GqlSMutationResult;
    cvEducationUpsert: GqlSCvEducation;
    cvExperienceDelete: GqlSMutationResult;
    cvExperienceReorder: GqlSMutationResult;
    cvExperienceUpsert: GqlSCvExperience;
    cvHobbyDelete: GqlSMutationResult;
    cvHobbyReorder: GqlSMutationResult;
    cvHobbyUpsert: GqlSCvHobby;
    cvSkillDelete: GqlSMutationResult;
    cvSkillReorder: GqlSMutationResult;
    cvSkillUpsert: GqlSCvSkill;
    profileObservationDismiss: GqlSMutationResult;
    profileSynthesizeRequest: GqlSMutationResult;
    projectActivityDelete: GqlSMutationResult;
    projectActivityUpsert: GqlSProjectActivity;
    projectDelete: GqlSMutationResult;
    projectFileDelete: GqlSMutationResult;
    projectFileTogglePin: GqlSProjectFile;
    projectFileUpsert: GqlSProjectFile;
    projectLinkDelete: GqlSMutationResult;
    projectLinkTogglePin: GqlSProjectLink;
    projectLinkUpsert: GqlSProjectLink;
    projectReorder: GqlSMutationResult;
    projectRequestArchive: GqlSMutationResult;
    projectRequestDelete: GqlSMutationResult;
    projectTimerStart: GqlSProjectActivity;
    projectTimerStop: GqlSProjectActivity;
    projectUpsert: GqlSProject;
    taskDelete: GqlSMutationResult;
    taskReorder: GqlSMutationResult;
    taskUpsert: GqlSTask;
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

export type GqlSAdminMutationCvEducationDeleteArgs = {
    cvEducationId: Scalars['ID']['input'];
};

export type GqlSAdminMutationCvEducationReorderArgs = {
    orderedIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationCvEducationUpsertArgs = {
    input: GqlSCvEducationInput;
};

export type GqlSAdminMutationCvExperienceDeleteArgs = {
    cvExperienceId: Scalars['ID']['input'];
};

export type GqlSAdminMutationCvExperienceReorderArgs = {
    orderedIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationCvExperienceUpsertArgs = {
    input: GqlSCvExperienceInput;
};

export type GqlSAdminMutationCvHobbyDeleteArgs = {
    cvHobbyId: Scalars['ID']['input'];
};

export type GqlSAdminMutationCvHobbyReorderArgs = {
    orderedIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationCvHobbyUpsertArgs = {
    input: GqlSCvHobbyInput;
};

export type GqlSAdminMutationCvSkillDeleteArgs = {
    cvSkillId: Scalars['ID']['input'];
};

export type GqlSAdminMutationCvSkillReorderArgs = {
    orderedIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationCvSkillUpsertArgs = {
    input: GqlSCvSkillInput;
};

export type GqlSAdminMutationProfileObservationDismissArgs = {
    observationId: Scalars['ID']['input'];
};

export type GqlSAdminMutationProjectActivityDeleteArgs = {
    activityId: Scalars['ID']['input'];
};

export type GqlSAdminMutationProjectActivityUpsertArgs = {
    input: GqlSProjectActivityCreate;
};

export type GqlSAdminMutationProjectDeleteArgs = {
    projectId: Scalars['ID']['input'];
};

export type GqlSAdminMutationProjectFileDeleteArgs = {
    projectFileId: Scalars['ID']['input'];
};

export type GqlSAdminMutationProjectFileTogglePinArgs = {
    projectFileId: Scalars['ID']['input'];
};

export type GqlSAdminMutationProjectFileUpsertArgs = {
    input: GqlSProjectFileUpsert;
};

export type GqlSAdminMutationProjectLinkDeleteArgs = {
    projectLinkId: Scalars['ID']['input'];
};

export type GqlSAdminMutationProjectLinkTogglePinArgs = {
    projectLinkId: Scalars['ID']['input'];
};

export type GqlSAdminMutationProjectLinkUpsertArgs = {
    input: GqlSProjectLinkUpsert;
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

export type GqlSAdminMutationProjectTimerStartArgs = {
    projectId: Scalars['ID']['input'];
    taskId?: InputMaybe<Scalars['ID']['input']>;
    title?: InputMaybe<Scalars['String']['input']>;
};

export type GqlSAdminMutationProjectTimerStopArgs = {
    activityId: Scalars['ID']['input'];
};

export type GqlSAdminMutationProjectUpsertArgs = {
    input: GqlSProjectCreate;
};

export type GqlSAdminMutationTaskDeleteArgs = {
    taskId: Scalars['ID']['input'];
};

export type GqlSAdminMutationTaskReorderArgs = {
    orderedIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationTaskUpsertArgs = {
    input: GqlSTaskCreate;
};

export interface GqlSAdminProfile {
    __typename?: 'AdminProfile';
    observations: Array<GqlSProfileObservation>;
    observationsSinceSynthesis: Scalars['Int']['output'];
    prose: Scalars['String']['output'];
    psychProfile: Scalars['String']['output'];
    summary: Scalars['String']['output'];
    synthesisModelId?: Maybe<Scalars['String']['output']>;
    synthesizedAt?: Maybe<Scalars['DateTime']['output']>;
}

export type GqlSAdminProfileObservationsArgs = {
    category?: InputMaybe<GqlSProfileObservationCategory>;
    includeDismissed?: InputMaybe<Scalars['Boolean']['input']>;
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
    createdAt: Scalars['DateTime']['output'];
    profileObservations: Array<GqlSProfileObservation>;
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

export interface GqlSCvEducation {
    __typename?: 'CvEducation';
    cvEducationId: Scalars['ID']['output'];
    degreeDe: Scalars['String']['output'];
    degreeEn: Scalars['String']['output'];
    endDate: Scalars['Date']['output'];
    institutionDe: Scalars['String']['output'];
    institutionEn: Scalars['String']['output'];
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
    institutionDe: Scalars['String']['input'];
    institutionEn: Scalars['String']['input'];
    notesDe: Scalars['String']['input'];
    notesEn: Scalars['String']['input'];
    position: Scalars['Int']['input'];
    startDate?: InputMaybe<Scalars['Date']['input']>;
    subjectDe: Scalars['String']['input'];
    subjectEn: Scalars['String']['input'];
};

export interface GqlSCvExperience {
    __typename?: 'CvExperience';
    companyDe: Scalars['String']['output'];
    companyEn: Scalars['String']['output'];
    cvExperienceId: Scalars['ID']['output'];
    descriptionDe: Scalars['String']['output'];
    descriptionEn: Scalars['String']['output'];
    endDate?: Maybe<Scalars['Date']['output']>;
    managerName?: Maybe<Scalars['String']['output']>;
    position: Scalars['Int']['output'];
    roleDe: Scalars['String']['output'];
    roleEn: Scalars['String']['output'];
    startDate: Scalars['Date']['output'];
    technologies: Array<Scalars['String']['output']>;
}

export type GqlSCvExperienceInput = {
    companyDe: Scalars['String']['input'];
    companyEn: Scalars['String']['input'];
    cvExperienceId?: InputMaybe<Scalars['ID']['input']>;
    descriptionDe: Scalars['String']['input'];
    descriptionEn: Scalars['String']['input'];
    endDate?: InputMaybe<Scalars['Date']['input']>;
    managerName?: InputMaybe<Scalars['String']['input']>;
    position: Scalars['Int']['input'];
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
    education: Array<GqlSCvEducation>;
    experience: Array<GqlSCvExperience>;
    hobbies: Array<GqlSCvHobby>;
    skills: Array<GqlSCvSkill>;
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
    success: Scalars['Boolean']['output'];
}

export interface GqlSProfileObservation {
    __typename?: 'ProfileObservation';
    analyzerModelId?: Maybe<Scalars['String']['output']>;
    category: GqlSProfileObservationCategory;
    confidence?: Maybe<Scalars['Int']['output']>;
    content: Scalars['String']['output'];
    createdAt: Scalars['DateTime']['output'];
    dismissedAt?: Maybe<Scalars['DateTime']['output']>;
    observationId: Scalars['ID']['output'];
    sourceChatId?: Maybe<Scalars['ID']['output']>;
    sourceChatMessageId?: Maybe<Scalars['ID']['output']>;
}

export type GqlSProfileObservationCategory = 'behavioral' | 'factual' | 'psychological';

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

export interface GqlSQuery {
    __typename?: 'Query';
    currentSession: GqlSSession;
    cv: GqlSCvQuery;
}

export interface GqlSSession {
    __typename?: 'Session';
    sessionId: Scalars['ID']['output'];
    user?: Maybe<GqlSUser>;
    visitorChat: GqlSChat;
    visitorChatQuota: GqlSVisitorChatQuota;
    visitorChats: Array<GqlSChat>;
}

export type GqlSSessionVisitorChatArgs = {
    chatId: Scalars['ID']['input'];
};

export interface GqlSSubscription {
    __typename?: 'Subscription';
    chatUpdates: GqlSChatUpdate;
    userUpdates: GqlSUser;
}

export type GqlSSubscriptionChatUpdatesArgs = {
    generationId: Scalars['ID']['input'];
};

export interface GqlSTask {
    __typename?: 'Task';
    completedAt?: Maybe<Scalars['DateTime']['output']>;
    createdAt: Scalars['DateTime']['output'];
    dueAt?: Maybe<Scalars['DateTime']['output']>;
    notes?: Maybe<Scalars['String']['output']>;
    position: Scalars['Int']['output'];
    projectId?: Maybe<Scalars['ID']['output']>;
    status: GqlSTaskStatus;
    taskId: Scalars['ID']['output'];
    title: Scalars['String']['output'];
    updatedAt: Scalars['DateTime']['output'];
}

export type GqlSTaskCreate = {
    completedAt?: InputMaybe<Scalars['DateTime']['input']>;
    dueAt?: InputMaybe<Scalars['DateTime']['input']>;
    notes?: InputMaybe<Scalars['String']['input']>;
    position: Scalars['Int']['input'];
    projectId?: InputMaybe<Scalars['ID']['input']>;
    status: GqlSTaskStatus;
    taskId?: InputMaybe<Scalars['ID']['input']>;
    title: Scalars['String']['input'];
};

export type GqlSTaskStatus = 'doing' | 'done' | 'todo';

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
    terminateSessions: GqlSMutationResult;
    userUpdate: GqlSMutationResult;
}

export type GqlSUserMutationTerminateSessionsArgs = {
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
    | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
    | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

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
}>;

/** Mapping between all available schema types and the resolvers types */
export type GqlSResolversTypes = ResolversObject<{
    Admin: ResolverTypeWrapper<
        Omit<GqlSAdmin, 'chat' | 'chats' | 'publicChat' | 'publicChats'> & {
            chat: GqlSResolversTypes['Chat'];
            chats: Array<GqlSResolversTypes['Chat']>;
            publicChat: GqlSResolversTypes['Chat'];
            publicChats: Array<GqlSResolversTypes['Chat']>;
        }
    >;
    AdminChatConfig: ResolverTypeWrapper<GqlSAdminChatConfig>;
    AdminChatModel: ResolverTypeWrapper<GqlSAdminChatModel>;
    AdminMutation: ResolverTypeWrapper<GqlSAdminMutation>;
    AdminProfile: ResolverTypeWrapper<GqlSAdminProfile>;
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
    ID: ResolverTypeWrapper<Scalars['ID']['output']>;
    Int: ResolverTypeWrapper<Scalars['Int']['output']>;
    JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
    Log: ResolverTypeWrapper<GqlSLog>;
    LogLevel: GqlSLogLevel;
    Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
    MutationResult: ResolverTypeWrapper<GqlSMutationResult>;
    ProfileObservation: ResolverTypeWrapper<GqlSProfileObservation>;
    ProfileObservationCategory: GqlSProfileObservationCategory;
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
    Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
    Session: ResolverTypeWrapper<
        Omit<GqlSSession, 'user' | 'visitorChat' | 'visitorChats'> & {
            user?: Maybe<GqlSResolversTypes['User']>;
            visitorChat: GqlSResolversTypes['Chat'];
            visitorChats: Array<GqlSResolversTypes['Chat']>;
        }
    >;
    String: ResolverTypeWrapper<Scalars['String']['output']>;
    Subscription: ResolverTypeWrapper<Record<PropertyKey, never>>;
    Task: ResolverTypeWrapper<GqlSTask>;
    TaskCreate: GqlSTaskCreate;
    TaskStatus: GqlSTaskStatus;
    User: ResolverTypeWrapper<Omit<GqlSUser, 'admin'> & { admin?: Maybe<GqlSResolversTypes['Admin']> }>;
    UserCreate: GqlSUserCreate;
    UserMutation: ResolverTypeWrapper<GqlSUserMutation>;
    UserUpdate: GqlSUserUpdate;
    VisitorChatQuota: ResolverTypeWrapper<GqlSVisitorChatQuota>;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type GqlSResolversParentTypes = ResolversObject<{
    Admin: Omit<GqlSAdmin, 'chat' | 'chats' | 'publicChat' | 'publicChats'> & {
        chat: GqlSResolversParentTypes['Chat'];
        chats: Array<GqlSResolversParentTypes['Chat']>;
        publicChat: GqlSResolversParentTypes['Chat'];
        publicChats: Array<GqlSResolversParentTypes['Chat']>;
    };
    AdminChatConfig: GqlSAdminChatConfig;
    AdminChatModel: GqlSAdminChatModel;
    AdminMutation: GqlSAdminMutation;
    AdminProfile: GqlSAdminProfile;
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
    ID: Scalars['ID']['output'];
    Int: Scalars['Int']['output'];
    JSON: Scalars['JSON']['output'];
    Log: GqlSLog;
    Mutation: Record<PropertyKey, never>;
    MutationResult: GqlSMutationResult;
    ProfileObservation: GqlSProfileObservation;
    Project: GqlSProject;
    ProjectActivity: GqlSProjectActivity;
    ProjectActivityCreate: GqlSProjectActivityCreate;
    ProjectCreate: GqlSProjectCreate;
    ProjectFile: GqlSProjectFile;
    ProjectFileUpsert: GqlSProjectFileUpsert;
    ProjectLink: GqlSProjectLink;
    ProjectLinkUpsert: GqlSProjectLinkUpsert;
    ProjectRequest: GqlSProjectRequest;
    Query: Record<PropertyKey, never>;
    Session: Omit<GqlSSession, 'user' | 'visitorChat' | 'visitorChats'> & {
        user?: Maybe<GqlSResolversParentTypes['User']>;
        visitorChat: GqlSResolversParentTypes['Chat'];
        visitorChats: Array<GqlSResolversParentTypes['Chat']>;
    };
    String: Scalars['String']['output'];
    Subscription: Record<PropertyKey, never>;
    Task: GqlSTask;
    TaskCreate: GqlSTaskCreate;
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
    activeTimer?: Resolver<Maybe<GqlSResolversTypes['ProjectActivity']>, ParentType, ContextType>;
    chat?: Resolver<GqlSResolversTypes['Chat'], ParentType, ContextType, RequireFields<GqlSAdminChatArgs, 'chatId'>>;
    chatConfig?: Resolver<GqlSResolversTypes['AdminChatConfig'], ParentType, ContextType>;
    chats?: Resolver<Array<GqlSResolversTypes['Chat']>, ParentType, ContextType>;
    logs?: Resolver<Array<GqlSResolversTypes['Log']>, ParentType, ContextType, Partial<GqlSAdminLogsArgs>>;
    profile?: Resolver<GqlSResolversTypes['AdminProfile'], ParentType, ContextType>;
    project?: Resolver<GqlSResolversTypes['Project'], ParentType, ContextType, RequireFields<GqlSAdminProjectArgs, 'projectId'>>;
    projectRequests?: Resolver<Array<GqlSResolversTypes['ProjectRequest']>, ParentType, ContextType, Partial<GqlSAdminProjectRequestsArgs>>;
    projectRequestsInboxCount?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    projects?: Resolver<Array<GqlSResolversTypes['Project']>, ParentType, ContextType, Partial<GqlSAdminProjectsArgs>>;
    publicChat?: Resolver<GqlSResolversTypes['Chat'], ParentType, ContextType, RequireFields<GqlSAdminPublicChatArgs, 'chatId'>>;
    publicChats?: Resolver<Array<GqlSResolversTypes['Chat']>, ParentType, ContextType>;
    standaloneTasks?: Resolver<Array<GqlSResolversTypes['Task']>, ParentType, ContextType>;
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
    cvEducationDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationCvEducationDeleteArgs, 'cvEducationId'>
    >;
    cvEducationReorder?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationCvEducationReorderArgs, 'orderedIds'>
    >;
    cvEducationUpsert?: Resolver<
        GqlSResolversTypes['CvEducation'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationCvEducationUpsertArgs, 'input'>
    >;
    cvExperienceDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationCvExperienceDeleteArgs, 'cvExperienceId'>
    >;
    cvExperienceReorder?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationCvExperienceReorderArgs, 'orderedIds'>
    >;
    cvExperienceUpsert?: Resolver<
        GqlSResolversTypes['CvExperience'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationCvExperienceUpsertArgs, 'input'>
    >;
    cvHobbyDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationCvHobbyDeleteArgs, 'cvHobbyId'>
    >;
    cvHobbyReorder?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationCvHobbyReorderArgs, 'orderedIds'>
    >;
    cvHobbyUpsert?: Resolver<
        GqlSResolversTypes['CvHobby'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationCvHobbyUpsertArgs, 'input'>
    >;
    cvSkillDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationCvSkillDeleteArgs, 'cvSkillId'>
    >;
    cvSkillReorder?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationCvSkillReorderArgs, 'orderedIds'>
    >;
    cvSkillUpsert?: Resolver<
        GqlSResolversTypes['CvSkill'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationCvSkillUpsertArgs, 'input'>
    >;
    profileObservationDismiss?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationProfileObservationDismissArgs, 'observationId'>
    >;
    profileSynthesizeRequest?: Resolver<GqlSResolversTypes['MutationResult'], ParentType, ContextType>;
    projectActivityDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationProjectActivityDeleteArgs, 'activityId'>
    >;
    projectActivityUpsert?: Resolver<
        GqlSResolversTypes['ProjectActivity'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationProjectActivityUpsertArgs, 'input'>
    >;
    projectDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationProjectDeleteArgs, 'projectId'>
    >;
    projectFileDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationProjectFileDeleteArgs, 'projectFileId'>
    >;
    projectFileTogglePin?: Resolver<
        GqlSResolversTypes['ProjectFile'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationProjectFileTogglePinArgs, 'projectFileId'>
    >;
    projectFileUpsert?: Resolver<
        GqlSResolversTypes['ProjectFile'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationProjectFileUpsertArgs, 'input'>
    >;
    projectLinkDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationProjectLinkDeleteArgs, 'projectLinkId'>
    >;
    projectLinkTogglePin?: Resolver<
        GqlSResolversTypes['ProjectLink'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationProjectLinkTogglePinArgs, 'projectLinkId'>
    >;
    projectLinkUpsert?: Resolver<
        GqlSResolversTypes['ProjectLink'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationProjectLinkUpsertArgs, 'input'>
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
    projectTimerStart?: Resolver<
        GqlSResolversTypes['ProjectActivity'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationProjectTimerStartArgs, 'projectId'>
    >;
    projectTimerStop?: Resolver<
        GqlSResolversTypes['ProjectActivity'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationProjectTimerStopArgs, 'activityId'>
    >;
    projectUpsert?: Resolver<
        GqlSResolversTypes['Project'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationProjectUpsertArgs, 'input'>
    >;
    taskDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationTaskDeleteArgs, 'taskId'>
    >;
    taskReorder?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationTaskReorderArgs, 'orderedIds'>
    >;
    taskUpsert?: Resolver<GqlSResolversTypes['Task'], ParentType, ContextType, RequireFields<GqlSAdminMutationTaskUpsertArgs, 'input'>>;
}>;

export type GqlSAdminProfileResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminProfile'] = GqlSResolversParentTypes['AdminProfile'],
> = ResolversObject<{
    observations?: Resolver<
        Array<GqlSResolversTypes['ProfileObservation']>,
        ParentType,
        ContextType,
        Partial<GqlSAdminProfileObservationsArgs>
    >;
    observationsSinceSynthesis?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    prose?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    psychProfile?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    summary?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    synthesisModelId?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    synthesizedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
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
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    profileObservations?: Resolver<Array<GqlSResolversTypes['ProfileObservation']>, ParentType, ContextType>;
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

export type GqlSCvEducationResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['CvEducation'] = GqlSResolversParentTypes['CvEducation'],
> = ResolversObject<{
    cvEducationId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    degreeDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    degreeEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    endDate?: Resolver<GqlSResolversTypes['Date'], ParentType, ContextType>;
    institutionDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    institutionEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
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
    companyDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    companyEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    cvExperienceId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    descriptionDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    descriptionEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    endDate?: Resolver<Maybe<GqlSResolversTypes['Date']>, ParentType, ContextType>;
    managerName?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    position?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
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
    education?: Resolver<Array<GqlSResolversTypes['CvEducation']>, ParentType, ContextType>;
    experience?: Resolver<Array<GqlSResolversTypes['CvExperience']>, ParentType, ContextType>;
    hobbies?: Resolver<Array<GqlSResolversTypes['CvHobby']>, ParentType, ContextType>;
    skills?: Resolver<Array<GqlSResolversTypes['CvSkill']>, ParentType, ContextType>;
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
    success?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
}>;

export type GqlSProfileObservationResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ProfileObservation'] = GqlSResolversParentTypes['ProfileObservation'],
> = ResolversObject<{
    analyzerModelId?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    category?: Resolver<GqlSResolversTypes['ProfileObservationCategory'], ParentType, ContextType>;
    confidence?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    content?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    dismissedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    observationId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    sourceChatId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    sourceChatMessageId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
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
    currentSession?: Resolver<GqlSResolversTypes['Session'], ParentType, ContextType>;
    cv?: Resolver<GqlSResolversTypes['CvQuery'], ParentType, ContextType>;
}>;

export type GqlSSessionResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['Session'] = GqlSResolversParentTypes['Session'],
> = ResolversObject<{
    sessionId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    user?: Resolver<Maybe<GqlSResolversTypes['User']>, ParentType, ContextType>;
    visitorChat?: Resolver<GqlSResolversTypes['Chat'], ParentType, ContextType, RequireFields<GqlSSessionVisitorChatArgs, 'chatId'>>;
    visitorChatQuota?: Resolver<GqlSResolversTypes['VisitorChatQuota'], ParentType, ContextType>;
    visitorChats?: Resolver<Array<GqlSResolversTypes['Chat']>, ParentType, ContextType>;
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
    userUpdates?: SubscriptionResolver<GqlSResolversTypes['User'], 'userUpdates', ParentType, ContextType>;
}>;

export type GqlSTaskResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['Task'] = GqlSResolversParentTypes['Task'],
> = ResolversObject<{
    completedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    dueAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    notes?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    position?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    projectId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    status?: Resolver<GqlSResolversTypes['TaskStatus'], ParentType, ContextType>;
    taskId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    title?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
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
    terminateSessions?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSUserMutationTerminateSessionsArgs, 'sessionIds'>
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
    AdminMutation?: GqlSAdminMutationResolvers<ContextType>;
    AdminProfile?: GqlSAdminProfileResolvers<ContextType>;
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
    ProfileObservation?: GqlSProfileObservationResolvers<ContextType>;
    Project?: GqlSProjectResolvers<ContextType>;
    ProjectActivity?: GqlSProjectActivityResolvers<ContextType>;
    ProjectFile?: GqlSProjectFileResolvers<ContextType>;
    ProjectLink?: GqlSProjectLinkResolvers<ContextType>;
    ProjectRequest?: GqlSProjectRequestResolvers<ContextType>;
    Query?: GqlSQueryResolvers<ContextType>;
    Session?: GqlSSessionResolvers<ContextType>;
    Subscription?: GqlSSubscriptionResolvers<ContextType>;
    Task?: GqlSTaskResolvers<ContextType>;
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

export const GqlSChatAssistantInputValueKindSchema: z.ZodType<
    'Boolean' | 'Date' | 'DateRange' | 'DateTime' | 'String' | 'StringList' | 'Time',
    'Boolean' | 'Date' | 'DateRange' | 'DateTime' | 'String' | 'StringList' | 'Time'
> = z.enum(['Boolean', 'Date', 'DateRange', 'DateTime', 'String', 'StringList', 'Time']);

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

export const GqlSProfileObservationCategorySchema: z.ZodType<
    'behavioral' | 'factual' | 'psychological',
    'behavioral' | 'factual' | 'psychological'
> = z.enum(['behavioral', 'factual', 'psychological']);

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

export const GqlSTaskStatusSchema: z.ZodType<'doing' | 'done' | 'todo', 'doing' | 'done' | 'todo'> = z.enum(['doing', 'done', 'todo']);

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
        institutionDe: z.string(),
        institutionEn: z.string(),
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
        companyDe: z.string(),
        companyEn: z.string(),
        cvExperienceId: z.string().nullish(),
        descriptionDe: z.string(),
        descriptionEn: z.string(),
        endDate: z.string().nullish(),
        managerName: z.string().nullish(),
        position: z.number(),
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

export function GqlSTaskCreateSchema(): z.ZodObject<Properties<GqlSTaskCreate>> {
    return z.object({
        completedAt: z.date().nullish(),
        dueAt: z.date().nullish(),
        notes: z.string().nullish(),
        position: z.number(),
        projectId: z.string().nullish(),
        status: GqlSTaskStatusSchema,
        taskId: z.string().nullish(),
        title: z.string(),
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
