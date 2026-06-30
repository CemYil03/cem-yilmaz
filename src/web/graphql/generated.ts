/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type * as Schema from './generated';

import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
    ID: { input: string; output: string };
    String: { input: string; output: string };
    Boolean: { input: boolean; output: boolean };
    Int: { input: number; output: number };
    Float: { input: number; output: number };
    Date: { input: string; output: string };
    DateTime: { input: string; output: string };
    JSON: { input: unknown; output: unknown };
};

export interface GqlCAdmin {
    __typename?: 'Admin';
    activeTimer?: Maybe<GqlCProjectActivity>;
    chat: GqlCChat;
    chatConfig: GqlCAdminChatConfig;
    chats: Array<GqlCChat>;
    profile: GqlCAdminProfile;
    project: GqlCProject;
    projectRequests: Array<GqlCProjectRequest>;
    projectRequestsInboxCount: Scalars['Int']['output'];
    projects: Array<GqlCProject>;
    publicChat: GqlCChat;
    publicChats: Array<GqlCChat>;
    standaloneTasks: Array<GqlCTask>;
}

export type GqlCAdminChatArgs = {
    chatId: Scalars['ID']['input'];
};

export type GqlCAdminProjectArgs = {
    projectId: Scalars['ID']['input'];
};

export type GqlCAdminProjectRequestsArgs = {
    status?: InputMaybe<GqlCProjectRequestStatus>;
};

export type GqlCAdminProjectsArgs = {
    status?: InputMaybe<GqlCProjectStatus>;
};

export type GqlCAdminPublicChatArgs = {
    chatId: Scalars['ID']['input'];
};

export interface GqlCAdminChatConfig {
    __typename?: 'AdminChatConfig';
    availableModels: Array<GqlCAdminChatModel>;
    defaultModelId: Scalars['String']['output'];
}

export interface GqlCAdminChatModel {
    __typename?: 'AdminChatModel';
    label: Scalars['String']['output'];
    modelId: Scalars['String']['output'];
    supportedMediaTypes: Array<Scalars['String']['output']>;
}

export interface GqlCAdminMutation {
    __typename?: 'AdminMutation';
    chatConfigDefaultModelSet: GqlCMutationResult;
    chatInputCollectionRespond?: Maybe<GqlCChatMessageCreateResult>;
    chatMessageCreate?: Maybe<GqlCChatMessageCreateResult>;
    chatToolApprovalRespond?: Maybe<GqlCChatMessageCreateResult>;
    cvEducationDelete: GqlCMutationResult;
    cvEducationReorder: GqlCMutationResult;
    cvEducationUpsert: GqlCCvEducation;
    cvExperienceDelete: GqlCMutationResult;
    cvExperienceReorder: GqlCMutationResult;
    cvExperienceUpsert: GqlCCvExperience;
    cvHobbyDelete: GqlCMutationResult;
    cvHobbyReorder: GqlCMutationResult;
    cvHobbyUpsert: GqlCCvHobby;
    cvSkillDelete: GqlCMutationResult;
    cvSkillReorder: GqlCMutationResult;
    cvSkillUpsert: GqlCCvSkill;
    profileObservationDismiss: GqlCMutationResult;
    profileSynthesizeRequest: GqlCMutationResult;
    projectActivityDelete: GqlCMutationResult;
    projectActivityUpsert: GqlCProjectActivity;
    projectDelete: GqlCMutationResult;
    projectFileDelete: GqlCMutationResult;
    projectFileTogglePin: GqlCProjectFile;
    projectFileUpsert: GqlCProjectFile;
    projectLinkDelete: GqlCMutationResult;
    projectLinkTogglePin: GqlCProjectLink;
    projectLinkUpsert: GqlCProjectLink;
    projectReorder: GqlCMutationResult;
    projectRequestArchive: GqlCMutationResult;
    projectRequestDelete: GqlCMutationResult;
    projectTimerStart: GqlCProjectActivity;
    projectTimerStop: GqlCProjectActivity;
    projectUpsert: GqlCProject;
    taskDelete: GqlCMutationResult;
    taskReorder: GqlCMutationResult;
    taskUpsert: GqlCTask;
}

export type GqlCAdminMutationChatConfigDefaultModelSetArgs = {
    modelId: Scalars['String']['input'];
};

export type GqlCAdminMutationChatInputCollectionRespondArgs = {
    answers: Array<GqlCChatMessageUserInputAnswerCreate>;
    assistantOptions: GqlCChatAssistantOptions;
    collectionMessageId: Scalars['ID']['input'];
};

export type GqlCAdminMutationChatMessageCreateArgs = {
    assistantOptions: GqlCChatAssistantOptions;
    chatId?: InputMaybe<Scalars['ID']['input']>;
    fileUploadIds?: InputMaybe<Array<Scalars['ID']['input']>>;
    message: Scalars['String']['input'];
};

export type GqlCAdminMutationChatToolApprovalRespondArgs = {
    approvalId: Scalars['String']['input'];
    approved: Scalars['Boolean']['input'];
    assistantOptions: GqlCChatAssistantOptions;
    reason?: InputMaybe<Scalars['String']['input']>;
};

export type GqlCAdminMutationCvEducationDeleteArgs = {
    cvEducationId: Scalars['ID']['input'];
};

export type GqlCAdminMutationCvEducationReorderArgs = {
    orderedIds: Array<Scalars['ID']['input']>;
};

export type GqlCAdminMutationCvEducationUpsertArgs = {
    input: GqlCCvEducationInput;
};

export type GqlCAdminMutationCvExperienceDeleteArgs = {
    cvExperienceId: Scalars['ID']['input'];
};

export type GqlCAdminMutationCvExperienceReorderArgs = {
    orderedIds: Array<Scalars['ID']['input']>;
};

export type GqlCAdminMutationCvExperienceUpsertArgs = {
    input: GqlCCvExperienceInput;
};

export type GqlCAdminMutationCvHobbyDeleteArgs = {
    cvHobbyId: Scalars['ID']['input'];
};

export type GqlCAdminMutationCvHobbyReorderArgs = {
    orderedIds: Array<Scalars['ID']['input']>;
};

export type GqlCAdminMutationCvHobbyUpsertArgs = {
    input: GqlCCvHobbyInput;
};

export type GqlCAdminMutationCvSkillDeleteArgs = {
    cvSkillId: Scalars['ID']['input'];
};

export type GqlCAdminMutationCvSkillReorderArgs = {
    orderedIds: Array<Scalars['ID']['input']>;
};

export type GqlCAdminMutationCvSkillUpsertArgs = {
    input: GqlCCvSkillInput;
};

export type GqlCAdminMutationProfileObservationDismissArgs = {
    observationId: Scalars['ID']['input'];
};

export type GqlCAdminMutationProjectActivityDeleteArgs = {
    activityId: Scalars['ID']['input'];
};

export type GqlCAdminMutationProjectActivityUpsertArgs = {
    input: GqlCProjectActivityCreate;
};

export type GqlCAdminMutationProjectDeleteArgs = {
    projectId: Scalars['ID']['input'];
};

export type GqlCAdminMutationProjectFileDeleteArgs = {
    projectFileId: Scalars['ID']['input'];
};

export type GqlCAdminMutationProjectFileTogglePinArgs = {
    projectFileId: Scalars['ID']['input'];
};

export type GqlCAdminMutationProjectFileUpsertArgs = {
    input: GqlCProjectFileUpsert;
};

export type GqlCAdminMutationProjectLinkDeleteArgs = {
    projectLinkId: Scalars['ID']['input'];
};

export type GqlCAdminMutationProjectLinkTogglePinArgs = {
    projectLinkId: Scalars['ID']['input'];
};

export type GqlCAdminMutationProjectLinkUpsertArgs = {
    input: GqlCProjectLinkUpsert;
};

export type GqlCAdminMutationProjectReorderArgs = {
    orderedIds: Array<Scalars['ID']['input']>;
};

export type GqlCAdminMutationProjectRequestArchiveArgs = {
    projectRequestId: Scalars['ID']['input'];
};

export type GqlCAdminMutationProjectRequestDeleteArgs = {
    projectRequestId: Scalars['ID']['input'];
};

export type GqlCAdminMutationProjectTimerStartArgs = {
    projectId: Scalars['ID']['input'];
    taskId?: InputMaybe<Scalars['ID']['input']>;
    title?: InputMaybe<Scalars['String']['input']>;
};

export type GqlCAdminMutationProjectTimerStopArgs = {
    activityId: Scalars['ID']['input'];
};

export type GqlCAdminMutationProjectUpsertArgs = {
    input: GqlCProjectCreate;
};

export type GqlCAdminMutationTaskDeleteArgs = {
    taskId: Scalars['ID']['input'];
};

export type GqlCAdminMutationTaskReorderArgs = {
    orderedIds: Array<Scalars['ID']['input']>;
};

export type GqlCAdminMutationTaskUpsertArgs = {
    input: GqlCTaskCreate;
};

export interface GqlCAdminProfile {
    __typename?: 'AdminProfile';
    observations: Array<GqlCProfileObservation>;
    observationsSinceSynthesis: Scalars['Int']['output'];
    prose: Scalars['String']['output'];
    psychProfile: Scalars['String']['output'];
    summary: Scalars['String']['output'];
    synthesisModelId?: Maybe<Scalars['String']['output']>;
    synthesizedAt?: Maybe<Scalars['DateTime']['output']>;
}

export type GqlCAdminProfileObservationsArgs = {
    category?: InputMaybe<GqlCProfileObservationCategory>;
    includeDismissed?: InputMaybe<Scalars['Boolean']['input']>;
};

export interface GqlCChat {
    __typename?: 'Chat';
    chatId: Scalars['ID']['output'];
    lastModifiedAt: Scalars['DateTime']['output'];
    messages: Array<GqlCChatMessage>;
    title: Scalars['String']['output'];
}

export type GqlCChatAssistantInput =
    | GqlCChatAssistantInputBoolean
    | GqlCChatAssistantInputDate
    | GqlCChatAssistantInputDateRange
    | GqlCChatAssistantInputDateTime
    | GqlCChatAssistantInputMultiSelect
    | GqlCChatAssistantInputOtp
    | GqlCChatAssistantInputSingleSelect
    | GqlCChatAssistantInputText
    | GqlCChatAssistantInputTime;

export interface GqlCChatAssistantInputBoolean {
    __typename?: 'ChatAssistantInputBoolean';
    inputId: Scalars['ID']['output'];
    prompt: Scalars['String']['output'];
}

export interface GqlCChatAssistantInputDate {
    __typename?: 'ChatAssistantInputDate';
    inputId: Scalars['ID']['output'];
    prompt: Scalars['String']['output'];
}

export interface GqlCChatAssistantInputDateRange {
    __typename?: 'ChatAssistantInputDateRange';
    inputId: Scalars['ID']['output'];
    prompt: Scalars['String']['output'];
}

export interface GqlCChatAssistantInputDateTime {
    __typename?: 'ChatAssistantInputDateTime';
    inputId: Scalars['ID']['output'];
    prompt: Scalars['String']['output'];
}

export interface GqlCChatAssistantInputMultiSelect {
    __typename?: 'ChatAssistantInputMultiSelect';
    inputId: Scalars['ID']['output'];
    options: Array<Scalars['String']['output']>;
    prompt: Scalars['String']['output'];
}

export interface GqlCChatAssistantInputOtp {
    __typename?: 'ChatAssistantInputOtp';
    inputId: Scalars['ID']['output'];
    prompt: Scalars['String']['output'];
}

export interface GqlCChatAssistantInputSingleSelect {
    __typename?: 'ChatAssistantInputSingleSelect';
    inputId: Scalars['ID']['output'];
    options: Array<Scalars['String']['output']>;
    prompt: Scalars['String']['output'];
}

export interface GqlCChatAssistantInputText {
    __typename?: 'ChatAssistantInputText';
    inputId: Scalars['ID']['output'];
    prompt: Scalars['String']['output'];
}

export interface GqlCChatAssistantInputTime {
    __typename?: 'ChatAssistantInputTime';
    inputId: Scalars['ID']['output'];
    prompt: Scalars['String']['output'];
}

export type GqlCChatAssistantInputValue =
    | GqlCChatAssistantInputValueBoolean
    | GqlCChatAssistantInputValueDate
    | GqlCChatAssistantInputValueDateRange
    | GqlCChatAssistantInputValueDateTime
    | GqlCChatAssistantInputValueString
    | GqlCChatAssistantInputValueStringList
    | GqlCChatAssistantInputValueTime;

export interface GqlCChatAssistantInputValueBoolean {
    __typename?: 'ChatAssistantInputValueBoolean';
    boolean: Scalars['Boolean']['output'];
}

export interface GqlCChatAssistantInputValueDate {
    __typename?: 'ChatAssistantInputValueDate';
    date: Scalars['Date']['output'];
}

export interface GqlCChatAssistantInputValueDateRange {
    __typename?: 'ChatAssistantInputValueDateRange';
    from: Scalars['Date']['output'];
    to: Scalars['Date']['output'];
}

export interface GqlCChatAssistantInputValueDateTime {
    __typename?: 'ChatAssistantInputValueDateTime';
    dateTime: Scalars['DateTime']['output'];
}

export type GqlCChatAssistantInputValueKind = 'Boolean' | 'Date' | 'DateRange' | 'DateTime' | 'String' | 'StringList' | 'Time';

export interface GqlCChatAssistantInputValueString {
    __typename?: 'ChatAssistantInputValueString';
    value: Scalars['String']['output'];
}

export interface GqlCChatAssistantInputValueStringList {
    __typename?: 'ChatAssistantInputValueStringList';
    values: Array<Scalars['String']['output']>;
}

export interface GqlCChatAssistantInputValueTime {
    __typename?: 'ChatAssistantInputValueTime';
    time: Scalars['String']['output'];
}

export type GqlCChatAssistantOptions = {
    generationId?: InputMaybe<Scalars['ID']['input']>;
    modelId?: InputMaybe<Scalars['String']['input']>;
    requireToolCallApprovals: Scalars['Boolean']['input'];
};

export type GqlCChatMessage =
    | GqlCChatMessageAssistantInputCollection
    | GqlCChatMessageAssistantText
    | GqlCChatMessageToolApprovalRequest
    | GqlCChatMessageToolApprovalResponse
    | GqlCChatMessageToolCall
    | GqlCChatMessageUser
    | GqlCChatMessageUserInput;

export interface GqlCChatMessageAssistantInputCollection {
    __typename?: 'ChatMessageAssistantInputCollection';
    chatMessageId: Scalars['ID']['output'];
    createdAt: Scalars['DateTime']['output'];
    generation?: Maybe<GqlCChatMessageGeneration>;
    inputs: Array<GqlCChatAssistantInput>;
    mode: Scalars['String']['output'];
    prompt: Scalars['String']['output'];
}

export interface GqlCChatMessageAssistantText {
    __typename?: 'ChatMessageAssistantText';
    body: Scalars['String']['output'];
    chatMessageId: Scalars['ID']['output'];
    createdAt: Scalars['DateTime']['output'];
    generation?: Maybe<GqlCChatMessageGeneration>;
}

export interface GqlCChatMessageCreateResult {
    __typename?: 'ChatMessageCreateResult';
    chatId: Scalars['ID']['output'];
    chatMessageId: Scalars['ID']['output'];
}

export interface GqlCChatMessageGeneration {
    __typename?: 'ChatMessageGeneration';
    cachedInputTokens?: Maybe<Scalars['Int']['output']>;
    inputTokens?: Maybe<Scalars['Int']['output']>;
    modelId: Scalars['String']['output'];
    outputTokens?: Maybe<Scalars['Int']['output']>;
    reasoningTokens?: Maybe<Scalars['Int']['output']>;
    totalTokens?: Maybe<Scalars['Int']['output']>;
}

export interface GqlCChatMessageToolApprovalRequest {
    __typename?: 'ChatMessageToolApprovalRequest';
    approvalId: Scalars['String']['output'];
    args: Scalars['JSON']['output'];
    chatMessageId: Scalars['ID']['output'];
    createdAt: Scalars['DateTime']['output'];
    generation?: Maybe<GqlCChatMessageGeneration>;
    toolName: Scalars['String']['output'];
}

export interface GqlCChatMessageToolApprovalResponse {
    __typename?: 'ChatMessageToolApprovalResponse';
    approvalId: Scalars['String']['output'];
    approved: Scalars['Boolean']['output'];
    chatMessageId: Scalars['ID']['output'];
    createdAt: Scalars['DateTime']['output'];
    reason?: Maybe<Scalars['String']['output']>;
}

export interface GqlCChatMessageToolCall {
    __typename?: 'ChatMessageToolCall';
    args: Scalars['JSON']['output'];
    chatMessageId: Scalars['ID']['output'];
    createdAt: Scalars['DateTime']['output'];
    generation?: Maybe<GqlCChatMessageGeneration>;
    parentChatMessageId?: Maybe<Scalars['ID']['output']>;
    toolName: Scalars['String']['output'];
}

export interface GqlCChatMessageUser {
    __typename?: 'ChatMessageUser';
    attachments: Array<GqlCFileUpload>;
    author?: Maybe<GqlCUser>;
    body: Scalars['String']['output'];
    chatMessageId: Scalars['ID']['output'];
    createdAt: Scalars['DateTime']['output'];
    profileObservations: Array<GqlCProfileObservation>;
}

export interface GqlCChatMessageUserInput {
    __typename?: 'ChatMessageUserInput';
    answers: Array<GqlCChatMessageUserInputAnswer>;
    author?: Maybe<GqlCUser>;
    chatMessageId: Scalars['ID']['output'];
    collectionMessageId: Scalars['ID']['output'];
    createdAt: Scalars['DateTime']['output'];
}

export interface GqlCChatMessageUserInputAnswer {
    __typename?: 'ChatMessageUserInputAnswer';
    inputId: Scalars['ID']['output'];
    value: GqlCChatAssistantInputValue;
}

export type GqlCChatMessageUserInputAnswerCreate = {
    boolean?: InputMaybe<Scalars['Boolean']['input']>;
    date?: InputMaybe<Scalars['Date']['input']>;
    dateRangeFrom?: InputMaybe<Scalars['Date']['input']>;
    dateRangeTo?: InputMaybe<Scalars['Date']['input']>;
    dateTime?: InputMaybe<Scalars['DateTime']['input']>;
    inputId: Scalars['ID']['input'];
    kind: GqlCChatAssistantInputValueKind;
    string?: InputMaybe<Scalars['String']['input']>;
    stringList?: InputMaybe<Array<Scalars['String']['input']>>;
    time?: InputMaybe<Scalars['String']['input']>;
};

export type GqlCChatUpdate = GqlCChatUpdateAssistantTextChunk | GqlCChatUpdateMessageAppended | GqlCChatUpdateTurnEnded;

export interface GqlCChatUpdateAssistantTextChunk {
    __typename?: 'ChatUpdateAssistantTextChunk';
    chatMessageId: Scalars['ID']['output'];
    delta: Scalars['String']['output'];
}

export interface GqlCChatUpdateMessageAppended {
    __typename?: 'ChatUpdateMessageAppended';
    message: GqlCChatMessage;
}

export interface GqlCChatUpdateTurnEnded {
    __typename?: 'ChatUpdateTurnEnded';
    generationId: Scalars['ID']['output'];
}

export interface GqlCCvEducation {
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

export type GqlCCvEducationInput = {
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

export interface GqlCCvExperience {
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

export type GqlCCvExperienceInput = {
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

export interface GqlCCvHobby {
    __typename?: 'CvHobby';
    cvHobbyId: Scalars['ID']['output'];
    position: Scalars['Int']['output'];
    since?: Maybe<Scalars['Int']['output']>;
    textDe: Scalars['String']['output'];
    textEn: Scalars['String']['output'];
}

export type GqlCCvHobbyInput = {
    cvHobbyId?: InputMaybe<Scalars['ID']['input']>;
    position: Scalars['Int']['input'];
    since?: InputMaybe<Scalars['Int']['input']>;
    textDe: Scalars['String']['input'];
    textEn: Scalars['String']['input'];
};

export interface GqlCCvQuery {
    __typename?: 'CvQuery';
    education: Array<GqlCCvEducation>;
    experience: Array<GqlCCvExperience>;
    hobbies: Array<GqlCCvHobby>;
    skills: Array<GqlCCvSkill>;
}

export interface GqlCCvSkill {
    __typename?: 'CvSkill';
    category: GqlCCvSkillCategory;
    cvSkillId: Scalars['ID']['output'];
    label: Scalars['String']['output'];
    position: Scalars['Int']['output'];
}

export type GqlCCvSkillCategory = 'capabilities' | 'frameworks' | 'languages' | 'services' | 'tools';

export type GqlCCvSkillInput = {
    category: GqlCCvSkillCategory;
    cvSkillId?: InputMaybe<Scalars['ID']['input']>;
    label: Scalars['String']['input'];
    position: Scalars['Int']['input'];
};

export interface GqlCFileUpload {
    __typename?: 'FileUpload';
    fileUploadId: Scalars['ID']['output'];
    filename: Scalars['String']['output'];
    mediaType: Scalars['String']['output'];
    size: Scalars['Int']['output'];
    url: Scalars['String']['output'];
}

export interface GqlCMutation {
    __typename?: 'Mutation';
    admin: GqlCAdminMutation;
    chatInputCollectionRespond?: Maybe<GqlCChatMessageCreateResult>;
    chatMessageCreate?: Maybe<GqlCChatMessageCreateResult>;
    chatToolApprovalRespond?: Maybe<GqlCChatMessageCreateResult>;
    user: GqlCUserMutation;
    userCreate: GqlCMutationResult;
}

export type GqlCMutationChatInputCollectionRespondArgs = {
    answers: Array<GqlCChatMessageUserInputAnswerCreate>;
    assistantOptions: GqlCChatAssistantOptions;
    collectionMessageId: Scalars['ID']['input'];
};

export type GqlCMutationChatMessageCreateArgs = {
    assistantOptions: GqlCChatAssistantOptions;
    chatId?: InputMaybe<Scalars['ID']['input']>;
    fileUploadIds?: InputMaybe<Array<Scalars['ID']['input']>>;
    message: Scalars['String']['input'];
};

export type GqlCMutationChatToolApprovalRespondArgs = {
    approvalId: Scalars['String']['input'];
    approved: Scalars['Boolean']['input'];
    assistantOptions: GqlCChatAssistantOptions;
    reason?: InputMaybe<Scalars['String']['input']>;
};

export type GqlCMutationUserCreateArgs = {
    user: GqlCUserCreate;
};

export interface GqlCMutationResult {
    __typename?: 'MutationResult';
    referenceId?: Maybe<Scalars['ID']['output']>;
    success: Scalars['Boolean']['output'];
}

export interface GqlCProfileObservation {
    __typename?: 'ProfileObservation';
    analyzerModelId?: Maybe<Scalars['String']['output']>;
    category: GqlCProfileObservationCategory;
    confidence?: Maybe<Scalars['Int']['output']>;
    content: Scalars['String']['output'];
    createdAt: Scalars['DateTime']['output'];
    dismissedAt?: Maybe<Scalars['DateTime']['output']>;
    observationId: Scalars['ID']['output'];
    sourceChatId?: Maybe<Scalars['ID']['output']>;
    sourceChatMessageId?: Maybe<Scalars['ID']['output']>;
}

export type GqlCProfileObservationCategory = 'behavioral' | 'factual' | 'psychological';

export interface GqlCProject {
    __typename?: 'Project';
    activities: Array<GqlCProjectActivity>;
    completedAt?: Maybe<Scalars['DateTime']['output']>;
    createdAt: Scalars['DateTime']['output'];
    description?: Maybe<Scalars['String']['output']>;
    files: Array<GqlCProjectFile>;
    links: Array<GqlCProjectLink>;
    notes?: Maybe<Scalars['String']['output']>;
    position: Scalars['Int']['output'];
    projectId: Scalars['ID']['output'];
    sourceRequest?: Maybe<GqlCProjectRequest>;
    startedAt?: Maybe<Scalars['DateTime']['output']>;
    status: GqlCProjectStatus;
    tasks: Array<GqlCTask>;
    title: Scalars['String']['output'];
    totalWorkSec: Scalars['Int']['output'];
    updatedAt: Scalars['DateTime']['output'];
}

export interface GqlCProjectActivity {
    __typename?: 'ProjectActivity';
    activityId: Scalars['ID']['output'];
    amountCents?: Maybe<Scalars['Int']['output']>;
    channel?: Maybe<GqlCProjectActivityChannel>;
    createdAt: Scalars['DateTime']['output'];
    durationSec?: Maybe<Scalars['Int']['output']>;
    endedAt?: Maybe<Scalars['DateTime']['output']>;
    files: Array<GqlCProjectFile>;
    kind: GqlCProjectActivityKind;
    links: Array<GqlCProjectLink>;
    notes?: Maybe<Scalars['String']['output']>;
    occurredAt: Scalars['DateTime']['output'];
    offerStatus?: Maybe<GqlCProjectOfferStatus>;
    projectId: Scalars['ID']['output'];
    startedAt?: Maybe<Scalars['DateTime']['output']>;
    taskId?: Maybe<Scalars['ID']['output']>;
    title: Scalars['String']['output'];
    updatedAt: Scalars['DateTime']['output'];
}

export type GqlCProjectActivityChannel = 'aiAssistant' | 'email' | 'inPerson' | 'malt' | 'other' | 'phone' | 'videoCall';

export type GqlCProjectActivityCreate = {
    activityId?: InputMaybe<Scalars['ID']['input']>;
    amountCents?: InputMaybe<Scalars['Int']['input']>;
    attachFileKind?: InputMaybe<GqlCProjectFileKind>;
    attachFileLabel?: InputMaybe<Scalars['String']['input']>;
    attachFilePinned?: InputMaybe<Scalars['Boolean']['input']>;
    attachFileUploadId?: InputMaybe<Scalars['ID']['input']>;
    attachLinkKind?: InputMaybe<GqlCProjectLinkKind>;
    attachLinkLabel?: InputMaybe<Scalars['String']['input']>;
    attachLinkPinned?: InputMaybe<Scalars['Boolean']['input']>;
    attachLinkUrl?: InputMaybe<Scalars['String']['input']>;
    channel?: InputMaybe<GqlCProjectActivityChannel>;
    durationSec?: InputMaybe<Scalars['Int']['input']>;
    kind: GqlCProjectActivityKind;
    notes?: InputMaybe<Scalars['String']['input']>;
    occurredAt: Scalars['DateTime']['input'];
    offerStatus?: InputMaybe<GqlCProjectOfferStatus>;
    projectId: Scalars['ID']['input'];
    taskId?: InputMaybe<Scalars['ID']['input']>;
    title: Scalars['String']['input'];
};

export type GqlCProjectActivityKind = 'clientContact' | 'meeting' | 'milestone' | 'note' | 'offer' | 'work';

export type GqlCProjectCreate = {
    completedAt?: InputMaybe<Scalars['DateTime']['input']>;
    description?: InputMaybe<Scalars['String']['input']>;
    notes?: InputMaybe<Scalars['String']['input']>;
    position?: InputMaybe<Scalars['Int']['input']>;
    projectId?: InputMaybe<Scalars['ID']['input']>;
    sourceRequestId?: InputMaybe<Scalars['ID']['input']>;
    startedAt?: InputMaybe<Scalars['DateTime']['input']>;
    status: GqlCProjectStatus;
    title: Scalars['String']['input'];
};

export interface GqlCProjectFile {
    __typename?: 'ProjectFile';
    activityId?: Maybe<Scalars['ID']['output']>;
    createdAt: Scalars['DateTime']['output'];
    fileUpload: GqlCFileUpload;
    kind: GqlCProjectFileKind;
    label?: Maybe<Scalars['String']['output']>;
    pinned: Scalars['Boolean']['output'];
    projectFileId: Scalars['ID']['output'];
    projectId: Scalars['ID']['output'];
    updatedAt: Scalars['DateTime']['output'];
}

export type GqlCProjectFileKind = 'contract' | 'invoice' | 'offer' | 'other' | 'screenshot';

export type GqlCProjectFileUpsert = {
    activityId?: InputMaybe<Scalars['ID']['input']>;
    fileUploadId: Scalars['ID']['input'];
    kind: GqlCProjectFileKind;
    label?: InputMaybe<Scalars['String']['input']>;
    pinned?: InputMaybe<Scalars['Boolean']['input']>;
    projectFileId?: InputMaybe<Scalars['ID']['input']>;
    projectId: Scalars['ID']['input'];
};

export interface GqlCProjectLink {
    __typename?: 'ProjectLink';
    activityId?: Maybe<Scalars['ID']['output']>;
    createdAt: Scalars['DateTime']['output'];
    kind: GqlCProjectLinkKind;
    label?: Maybe<Scalars['String']['output']>;
    pinned: Scalars['Boolean']['output'];
    projectId: Scalars['ID']['output'];
    projectLinkId: Scalars['ID']['output'];
    updatedAt: Scalars['DateTime']['output'];
    url: Scalars['String']['output'];
}

export type GqlCProjectLinkKind = 'figma' | 'gdrive' | 'github' | 'invoice' | 'malt' | 'notion' | 'offer' | 'other';

export type GqlCProjectLinkUpsert = {
    activityId?: InputMaybe<Scalars['ID']['input']>;
    kind: GqlCProjectLinkKind;
    label?: InputMaybe<Scalars['String']['input']>;
    pinned?: InputMaybe<Scalars['Boolean']['input']>;
    projectId: Scalars['ID']['input'];
    projectLinkId?: InputMaybe<Scalars['ID']['input']>;
    url: Scalars['String']['input'];
};

export type GqlCProjectOfferStatus = 'accepted' | 'rejected' | 'sent' | 'withdrawn';

export interface GqlCProjectRequest {
    __typename?: 'ProjectRequest';
    budget?: Maybe<Scalars['String']['output']>;
    chatId?: Maybe<Scalars['ID']['output']>;
    company?: Maybe<Scalars['String']['output']>;
    convertedProject?: Maybe<GqlCProject>;
    createdAt: Scalars['DateTime']['output'];
    description: Scalars['String']['output'];
    email: Scalars['String']['output'];
    name: Scalars['String']['output'];
    projectRequestId: Scalars['ID']['output'];
    projectType: GqlCProjectRequestType;
    status: GqlCProjectRequestStatus;
    timeline?: Maybe<Scalars['String']['output']>;
    updatedAt: Scalars['DateTime']['output'];
    verifiedAt?: Maybe<Scalars['DateTime']['output']>;
}

export type GqlCProjectRequestStatus = 'archived' | 'emailVerified' | 'pendingOtp';

export type GqlCProjectRequestType = 'aiIntegration' | 'consulting' | 'mobile' | 'other' | 'webApp';

export type GqlCProjectStatus = 'active' | 'archived' | 'done' | 'idea' | 'paused' | 'planning';

export interface GqlCQuery {
    __typename?: 'Query';
    admin: GqlCAdmin;
    chat: GqlCChat;
    currentSession: GqlCSession;
    cv: GqlCCvQuery;
}

export type GqlCQueryChatArgs = {
    chatId: Scalars['ID']['input'];
};

export interface GqlCSession {
    __typename?: 'Session';
    sessionId: Scalars['ID']['output'];
    user?: Maybe<GqlCUser>;
    visitorChatQuota: GqlCVisitorChatQuota;
    visitorChats: Array<GqlCChat>;
}

export interface GqlCSubscription {
    __typename?: 'Subscription';
    chatUpdates: GqlCChatUpdate;
    userUpdates: GqlCUser;
}

export type GqlCSubscriptionChatUpdatesArgs = {
    generationId: Scalars['ID']['input'];
};

export interface GqlCTask {
    __typename?: 'Task';
    completedAt?: Maybe<Scalars['DateTime']['output']>;
    createdAt: Scalars['DateTime']['output'];
    dueAt?: Maybe<Scalars['DateTime']['output']>;
    notes?: Maybe<Scalars['String']['output']>;
    position: Scalars['Int']['output'];
    projectId?: Maybe<Scalars['ID']['output']>;
    status: GqlCTaskStatus;
    taskId: Scalars['ID']['output'];
    title: Scalars['String']['output'];
    updatedAt: Scalars['DateTime']['output'];
}

export type GqlCTaskCreate = {
    completedAt?: InputMaybe<Scalars['DateTime']['input']>;
    dueAt?: InputMaybe<Scalars['DateTime']['input']>;
    notes?: InputMaybe<Scalars['String']['input']>;
    position: Scalars['Int']['input'];
    projectId?: InputMaybe<Scalars['ID']['input']>;
    status: GqlCTaskStatus;
    taskId?: InputMaybe<Scalars['ID']['input']>;
    title: Scalars['String']['input'];
};

export type GqlCTaskStatus = 'doing' | 'done' | 'todo';

export interface GqlCUser {
    __typename?: 'User';
    name: Scalars['String']['output'];
    userId: Scalars['ID']['output'];
}

export type GqlCUserCreate = {
    name: Scalars['String']['input'];
};

export interface GqlCUserMutation {
    __typename?: 'UserMutation';
    terminateSessions: GqlCMutationResult;
    userUpdate: GqlCMutationResult;
}

export type GqlCUserMutationTerminateSessionsArgs = {
    sessionIds: Array<Scalars['ID']['input']>;
};

export type GqlCUserMutationUserUpdateArgs = {
    user: GqlCUserUpdate;
};

export type GqlCUserUpdate = {
    name: Scalars['String']['input'];
};

export interface GqlCVisitorChatQuota {
    __typename?: 'VisitorChatQuota';
    limit: Scalars['Int']['output'];
    resetsAt?: Maybe<Scalars['DateTime']['output']>;
    used: Scalars['Int']['output'];
}

export type GqlCCvPageQueryVariables = Exact<{ [key: string]: never }>;

export type GqlCCvPageQuery = {
    cv: {
        experience: Array<{
            cvExperienceId: string;
            roleDe: string;
            roleEn: string;
            companyDe: string;
            companyEn: string;
            startDate: string;
            endDate: string | null;
            descriptionDe: string;
            descriptionEn: string;
            technologies: Array<string>;
            managerName: string | null;
            position: number;
        }>;
        education: Array<{
            cvEducationId: string;
            degreeDe: string;
            degreeEn: string;
            institutionDe: string;
            institutionEn: string;
            subjectDe: string;
            subjectEn: string;
            startDate: string | null;
            endDate: string;
            notesDe: string;
            notesEn: string;
            position: number;
        }>;
    };
};

export type GqlCAboutPageQueryVariables = Exact<{ [key: string]: never }>;

export type GqlCAboutPageQuery = {
    cv: {
        skills: Array<{ cvSkillId: string; category: Schema.GqlCCvSkillCategory; label: string; position: number }>;
        hobbies: Array<{ cvHobbyId: string; textDe: string; textEn: string; since: number | null; position: number }>;
    };
};

export type GqlCHomePageQueryVariables = Exact<{ [key: string]: never }>;

export type GqlCHomePageQuery = { currentSession: { sessionId: string; user: { name: string } | null } };

export type GqlCWorkspaceVisitorChatsQueryVariables = Exact<{ [key: string]: never }>;

export type GqlCWorkspaceVisitorChatsQuery = {
    currentSession: { sessionId: string };
    admin: { publicChats: Array<{ chatId: string; title: string; lastModifiedAt: string }> };
};

export type GqlCWorkspaceVisitorChatQueryVariables = Exact<{
    chatId: string;
}>;

export type GqlCWorkspaceVisitorChatQuery = {
    currentSession: { sessionId: string };
    admin: {
        publicChat: {
            chatId: string;
            title: string;
            lastModifiedAt: string;
            messages: Array<
                | {
                      __typename: 'ChatMessageAssistantInputCollection';
                      chatMessageId: string;
                      prompt: string;
                      mode: string;
                      createdAt: string;
                      generation: {
                          modelId: string;
                          inputTokens: number | null;
                          outputTokens: number | null;
                          totalTokens: number | null;
                          reasoningTokens: number | null;
                          cachedInputTokens: number | null;
                      } | null;
                      inputs: Array<
                          | { __typename: 'ChatAssistantInputBoolean'; inputId: string; prompt: string }
                          | { __typename: 'ChatAssistantInputDate'; inputId: string; prompt: string }
                          | { __typename: 'ChatAssistantInputDateRange'; inputId: string; prompt: string }
                          | { __typename: 'ChatAssistantInputDateTime'; inputId: string; prompt: string }
                          | { __typename: 'ChatAssistantInputMultiSelect'; inputId: string; prompt: string; options: Array<string> }
                          | { __typename: 'ChatAssistantInputOtp'; inputId: string; prompt: string }
                          | { __typename: 'ChatAssistantInputSingleSelect'; inputId: string; prompt: string; options: Array<string> }
                          | { __typename: 'ChatAssistantInputText'; inputId: string; prompt: string }
                          | { __typename: 'ChatAssistantInputTime'; inputId: string; prompt: string }
                      >;
                  }
                | {
                      __typename: 'ChatMessageAssistantText';
                      chatMessageId: string;
                      body: string;
                      createdAt: string;
                      generation: {
                          modelId: string;
                          inputTokens: number | null;
                          outputTokens: number | null;
                          totalTokens: number | null;
                          reasoningTokens: number | null;
                          cachedInputTokens: number | null;
                      } | null;
                  }
                | {
                      __typename: 'ChatMessageToolApprovalRequest';
                      chatMessageId: string;
                      approvalId: string;
                      toolName: string;
                      args: unknown;
                      createdAt: string;
                      generation: {
                          modelId: string;
                          inputTokens: number | null;
                          outputTokens: number | null;
                          totalTokens: number | null;
                          reasoningTokens: number | null;
                          cachedInputTokens: number | null;
                      } | null;
                  }
                | {
                      __typename: 'ChatMessageToolApprovalResponse';
                      chatMessageId: string;
                      approvalId: string;
                      approved: boolean;
                      reason: string | null;
                      createdAt: string;
                  }
                | {
                      __typename: 'ChatMessageToolCall';
                      chatMessageId: string;
                      toolName: string;
                      args: unknown;
                      parentChatMessageId: string | null;
                      createdAt: string;
                  }
                | {
                      __typename: 'ChatMessageUser';
                      chatMessageId: string;
                      body: string;
                      createdAt: string;
                      author: { userId: string; name: string } | null;
                      attachments: Array<{ fileUploadId: string; filename: string; mediaType: string; size: number; url: string }>;
                      profileObservations: Array<{
                          observationId: string;
                          category: Schema.GqlCProfileObservationCategory;
                          content: string;
                          confidence: number | null;
                          createdAt: string;
                      }>;
                  }
                | {
                      __typename: 'ChatMessageUserInput';
                      chatMessageId: string;
                      collectionMessageId: string;
                      createdAt: string;
                      author: { userId: string; name: string } | null;
                      answers: Array<{
                          inputId: string;
                          value:
                              | { __typename: 'ChatAssistantInputValueBoolean'; boolean: boolean }
                              | { __typename: 'ChatAssistantInputValueDate'; date: string }
                              | { __typename: 'ChatAssistantInputValueDateRange'; from: string; to: string }
                              | { __typename: 'ChatAssistantInputValueDateTime'; dateTime: string }
                              | { __typename: 'ChatAssistantInputValueString'; value: string }
                              | { __typename: 'ChatAssistantInputValueStringList'; values: Array<string> }
                              | { __typename: 'ChatAssistantInputValueTime'; time: string };
                      }>;
                  }
            >;
        };
    };
};

export type GqlCWorkspaceChatMessageGenerationFragment = {
    modelId: string;
    inputTokens: number | null;
    outputTokens: number | null;
    totalTokens: number | null;
    reasoningTokens: number | null;
    cachedInputTokens: number | null;
};

type GqlCWorkspaceChatMessageFields_ChatMessageAssistantInputCollection_Fragment = {
    __typename: 'ChatMessageAssistantInputCollection';
    chatMessageId: string;
    prompt: string;
    mode: string;
    createdAt: string;
    generation: {
        modelId: string;
        inputTokens: number | null;
        outputTokens: number | null;
        totalTokens: number | null;
        reasoningTokens: number | null;
        cachedInputTokens: number | null;
    } | null;
    inputs: Array<
        | { __typename: 'ChatAssistantInputBoolean'; inputId: string; prompt: string }
        | { __typename: 'ChatAssistantInputDate'; inputId: string; prompt: string }
        | { __typename: 'ChatAssistantInputDateRange'; inputId: string; prompt: string }
        | { __typename: 'ChatAssistantInputDateTime'; inputId: string; prompt: string }
        | { __typename: 'ChatAssistantInputMultiSelect'; inputId: string; prompt: string; options: Array<string> }
        | { __typename: 'ChatAssistantInputOtp'; inputId: string; prompt: string }
        | { __typename: 'ChatAssistantInputSingleSelect'; inputId: string; prompt: string; options: Array<string> }
        | { __typename: 'ChatAssistantInputText'; inputId: string; prompt: string }
        | { __typename: 'ChatAssistantInputTime'; inputId: string; prompt: string }
    >;
};

type GqlCWorkspaceChatMessageFields_ChatMessageAssistantText_Fragment = {
    __typename: 'ChatMessageAssistantText';
    chatMessageId: string;
    body: string;
    createdAt: string;
    generation: {
        modelId: string;
        inputTokens: number | null;
        outputTokens: number | null;
        totalTokens: number | null;
        reasoningTokens: number | null;
        cachedInputTokens: number | null;
    } | null;
};

type GqlCWorkspaceChatMessageFields_ChatMessageToolApprovalRequest_Fragment = {
    __typename: 'ChatMessageToolApprovalRequest';
    chatMessageId: string;
    approvalId: string;
    toolName: string;
    args: unknown;
    createdAt: string;
    generation: {
        modelId: string;
        inputTokens: number | null;
        outputTokens: number | null;
        totalTokens: number | null;
        reasoningTokens: number | null;
        cachedInputTokens: number | null;
    } | null;
};

type GqlCWorkspaceChatMessageFields_ChatMessageToolApprovalResponse_Fragment = {
    __typename: 'ChatMessageToolApprovalResponse';
    chatMessageId: string;
    approvalId: string;
    approved: boolean;
    reason: string | null;
    createdAt: string;
};

type GqlCWorkspaceChatMessageFields_ChatMessageToolCall_Fragment = {
    __typename: 'ChatMessageToolCall';
    chatMessageId: string;
    toolName: string;
    args: unknown;
    parentChatMessageId: string | null;
    createdAt: string;
};

type GqlCWorkspaceChatMessageFields_ChatMessageUser_Fragment = {
    __typename: 'ChatMessageUser';
    chatMessageId: string;
    body: string;
    createdAt: string;
    author: { userId: string; name: string } | null;
    attachments: Array<{ fileUploadId: string; filename: string; mediaType: string; size: number; url: string }>;
    profileObservations: Array<{
        observationId: string;
        category: Schema.GqlCProfileObservationCategory;
        content: string;
        confidence: number | null;
        createdAt: string;
    }>;
};

type GqlCWorkspaceChatMessageFields_ChatMessageUserInput_Fragment = {
    __typename: 'ChatMessageUserInput';
    chatMessageId: string;
    collectionMessageId: string;
    createdAt: string;
    author: { userId: string; name: string } | null;
    answers: Array<{
        inputId: string;
        value:
            | { __typename: 'ChatAssistantInputValueBoolean'; boolean: boolean }
            | { __typename: 'ChatAssistantInputValueDate'; date: string }
            | { __typename: 'ChatAssistantInputValueDateRange'; from: string; to: string }
            | { __typename: 'ChatAssistantInputValueDateTime'; dateTime: string }
            | { __typename: 'ChatAssistantInputValueString'; value: string }
            | { __typename: 'ChatAssistantInputValueStringList'; values: Array<string> }
            | { __typename: 'ChatAssistantInputValueTime'; time: string };
    }>;
};

export type GqlCWorkspaceChatMessageFieldsFragment =
    | GqlCWorkspaceChatMessageFields_ChatMessageAssistantInputCollection_Fragment
    | GqlCWorkspaceChatMessageFields_ChatMessageAssistantText_Fragment
    | GqlCWorkspaceChatMessageFields_ChatMessageToolApprovalRequest_Fragment
    | GqlCWorkspaceChatMessageFields_ChatMessageToolApprovalResponse_Fragment
    | GqlCWorkspaceChatMessageFields_ChatMessageToolCall_Fragment
    | GqlCWorkspaceChatMessageFields_ChatMessageUser_Fragment
    | GqlCWorkspaceChatMessageFields_ChatMessageUserInput_Fragment;

export type GqlCWorkspaceChatListItemFragment = { chatId: string; title: string; lastModifiedAt: string };

export type GqlCWorkspaceAssistantChatsQueryVariables = Exact<{ [key: string]: never }>;

export type GqlCWorkspaceAssistantChatsQuery = { admin: { chats: Array<{ chatId: string; title: string; lastModifiedAt: string }> } };

export type GqlCWorkspaceChatPageQueryVariables = Exact<{
    chatId: string;
}>;

export type GqlCWorkspaceChatPageQuery = {
    currentSession: { sessionId: string; user: { userId: string; name: string } | null };
    admin: {
        chat: {
            chatId: string;
            title: string;
            lastModifiedAt: string;
            messages: Array<
                | {
                      __typename: 'ChatMessageAssistantInputCollection';
                      chatMessageId: string;
                      prompt: string;
                      mode: string;
                      createdAt: string;
                      generation: {
                          modelId: string;
                          inputTokens: number | null;
                          outputTokens: number | null;
                          totalTokens: number | null;
                          reasoningTokens: number | null;
                          cachedInputTokens: number | null;
                      } | null;
                      inputs: Array<
                          | { __typename: 'ChatAssistantInputBoolean'; inputId: string; prompt: string }
                          | { __typename: 'ChatAssistantInputDate'; inputId: string; prompt: string }
                          | { __typename: 'ChatAssistantInputDateRange'; inputId: string; prompt: string }
                          | { __typename: 'ChatAssistantInputDateTime'; inputId: string; prompt: string }
                          | { __typename: 'ChatAssistantInputMultiSelect'; inputId: string; prompt: string; options: Array<string> }
                          | { __typename: 'ChatAssistantInputOtp'; inputId: string; prompt: string }
                          | { __typename: 'ChatAssistantInputSingleSelect'; inputId: string; prompt: string; options: Array<string> }
                          | { __typename: 'ChatAssistantInputText'; inputId: string; prompt: string }
                          | { __typename: 'ChatAssistantInputTime'; inputId: string; prompt: string }
                      >;
                  }
                | {
                      __typename: 'ChatMessageAssistantText';
                      chatMessageId: string;
                      body: string;
                      createdAt: string;
                      generation: {
                          modelId: string;
                          inputTokens: number | null;
                          outputTokens: number | null;
                          totalTokens: number | null;
                          reasoningTokens: number | null;
                          cachedInputTokens: number | null;
                      } | null;
                  }
                | {
                      __typename: 'ChatMessageToolApprovalRequest';
                      chatMessageId: string;
                      approvalId: string;
                      toolName: string;
                      args: unknown;
                      createdAt: string;
                      generation: {
                          modelId: string;
                          inputTokens: number | null;
                          outputTokens: number | null;
                          totalTokens: number | null;
                          reasoningTokens: number | null;
                          cachedInputTokens: number | null;
                      } | null;
                  }
                | {
                      __typename: 'ChatMessageToolApprovalResponse';
                      chatMessageId: string;
                      approvalId: string;
                      approved: boolean;
                      reason: string | null;
                      createdAt: string;
                  }
                | {
                      __typename: 'ChatMessageToolCall';
                      chatMessageId: string;
                      toolName: string;
                      args: unknown;
                      parentChatMessageId: string | null;
                      createdAt: string;
                  }
                | {
                      __typename: 'ChatMessageUser';
                      chatMessageId: string;
                      body: string;
                      createdAt: string;
                      author: { userId: string; name: string } | null;
                      attachments: Array<{ fileUploadId: string; filename: string; mediaType: string; size: number; url: string }>;
                      profileObservations: Array<{
                          observationId: string;
                          category: Schema.GqlCProfileObservationCategory;
                          content: string;
                          confidence: number | null;
                          createdAt: string;
                      }>;
                  }
                | {
                      __typename: 'ChatMessageUserInput';
                      chatMessageId: string;
                      collectionMessageId: string;
                      createdAt: string;
                      author: { userId: string; name: string } | null;
                      answers: Array<{
                          inputId: string;
                          value:
                              | { __typename: 'ChatAssistantInputValueBoolean'; boolean: boolean }
                              | { __typename: 'ChatAssistantInputValueDate'; date: string }
                              | { __typename: 'ChatAssistantInputValueDateRange'; from: string; to: string }
                              | { __typename: 'ChatAssistantInputValueDateTime'; dateTime: string }
                              | { __typename: 'ChatAssistantInputValueString'; value: string }
                              | { __typename: 'ChatAssistantInputValueStringList'; values: Array<string> }
                              | { __typename: 'ChatAssistantInputValueTime'; time: string };
                      }>;
                  }
            >;
        };
    };
};

export type GqlCWorkspaceChatMessageCreateMutationVariables = Exact<{
    chatId?: string | null | undefined;
    message: string;
    fileUploadIds?: Array<string> | string | null | undefined;
    generationId?: string | null | undefined;
    requireToolCallApprovals: boolean;
    modelId?: string | null | undefined;
}>;

export type GqlCWorkspaceChatMessageCreateMutation = { admin: { chatMessageCreate: { chatId: string; chatMessageId: string } | null } };

export type GqlCWorkspaceChatInputCollectionRespondMutationVariables = Exact<{
    collectionMessageId: string;
    answers: Array<Schema.GqlCChatMessageUserInputAnswerCreate> | Schema.GqlCChatMessageUserInputAnswerCreate;
    generationId?: string | null | undefined;
    requireToolCallApprovals: boolean;
    modelId?: string | null | undefined;
}>;

export type GqlCWorkspaceChatInputCollectionRespondMutation = {
    admin: { chatInputCollectionRespond: { chatId: string; chatMessageId: string } | null };
};

export type GqlCWorkspaceChatToolApprovalRespondMutationVariables = Exact<{
    approvalId: string;
    approved: boolean;
    reason?: string | null | undefined;
    generationId?: string | null | undefined;
    requireToolCallApprovals: boolean;
    modelId?: string | null | undefined;
}>;

export type GqlCWorkspaceChatToolApprovalRespondMutation = {
    admin: { chatToolApprovalRespond: { chatId: string; chatMessageId: string } | null };
};

export type GqlCWorkspaceChatConfigQueryVariables = Exact<{ [key: string]: never }>;

export type GqlCWorkspaceChatConfigQuery = {
    admin: {
        chatConfig: {
            defaultModelId: string;
            availableModels: Array<{ modelId: string; label: string; supportedMediaTypes: Array<string> }>;
        };
    };
};

export type GqlCWorkspaceChatConfigDefaultModelSetMutationVariables = Exact<{
    modelId: string;
}>;

export type GqlCWorkspaceChatConfigDefaultModelSetMutation = {
    admin: { chatConfigDefaultModelSet: { success: boolean; referenceId: string | null } };
};

export type GqlCWorkspaceProfileObservationFragment = {
    observationId: string;
    category: Schema.GqlCProfileObservationCategory;
    content: string;
    confidence: number | null;
    sourceChatId: string | null;
    sourceChatMessageId: string | null;
    analyzerModelId: string | null;
    dismissedAt: string | null;
    createdAt: string;
};

export type GqlCWorkspaceProfilePageQueryVariables = Exact<{
    category?: Schema.GqlCProfileObservationCategory | null | undefined;
    includeDismissed?: boolean | null | undefined;
}>;

export type GqlCWorkspaceProfilePageQuery = {
    admin: {
        profile: {
            summary: string;
            prose: string;
            psychProfile: string;
            synthesizedAt: string | null;
            synthesisModelId: string | null;
            observationsSinceSynthesis: number;
            observations: Array<{
                observationId: string;
                category: Schema.GqlCProfileObservationCategory;
                content: string;
                confidence: number | null;
                sourceChatId: string | null;
                sourceChatMessageId: string | null;
                analyzerModelId: string | null;
                dismissedAt: string | null;
                createdAt: string;
            }>;
        };
    };
};

export type GqlCWorkspaceProfileObservationDismissMutationVariables = Exact<{
    observationId: string;
}>;

export type GqlCWorkspaceProfileObservationDismissMutation = { admin: { profileObservationDismiss: { success: boolean } } };

export type GqlCWorkspaceProfileSynthesizeRequestMutationVariables = Exact<{ [key: string]: never }>;

export type GqlCWorkspaceProfileSynthesizeRequestMutation = {
    admin: { profileSynthesizeRequest: { success: boolean; referenceId: string | null } };
};

export type GqlCWorkspaceCvPageQueryVariables = Exact<{ [key: string]: never }>;

export type GqlCWorkspaceCvPageQuery = {
    cv: {
        experience: Array<{
            cvExperienceId: string;
            roleDe: string;
            roleEn: string;
            companyDe: string;
            companyEn: string;
            startDate: string;
            endDate: string | null;
            descriptionDe: string;
            descriptionEn: string;
            technologies: Array<string>;
            managerName: string | null;
            position: number;
        }>;
        education: Array<{
            cvEducationId: string;
            degreeDe: string;
            degreeEn: string;
            institutionDe: string;
            institutionEn: string;
            subjectDe: string;
            subjectEn: string;
            startDate: string | null;
            endDate: string;
            notesDe: string;
            notesEn: string;
            position: number;
        }>;
        skills: Array<{ cvSkillId: string; category: Schema.GqlCCvSkillCategory; label: string; position: number }>;
        hobbies: Array<{ cvHobbyId: string; textDe: string; textEn: string; since: number | null; position: number }>;
    };
};

export type GqlCWorkspaceCvExperienceUpsertMutationVariables = Exact<{
    cvExperienceId?: string | null | undefined;
    roleDe: string;
    roleEn: string;
    companyDe: string;
    companyEn: string;
    startDate: string;
    endDate?: string | null | undefined;
    descriptionDe: string;
    descriptionEn: string;
    technologies: Array<string> | string;
    managerName?: string | null | undefined;
    position: number;
}>;

export type GqlCWorkspaceCvExperienceUpsertMutation = { admin: { cvExperienceUpsert: { cvExperienceId: string } } };

export type GqlCWorkspaceCvExperienceDeleteMutationVariables = Exact<{
    cvExperienceId: string;
}>;

export type GqlCWorkspaceCvExperienceDeleteMutation = { admin: { cvExperienceDelete: { success: boolean } } };

export type GqlCWorkspaceCvEducationUpsertMutationVariables = Exact<{
    cvEducationId?: string | null | undefined;
    degreeDe: string;
    degreeEn: string;
    institutionDe: string;
    institutionEn: string;
    subjectDe: string;
    subjectEn: string;
    startDate?: string | null | undefined;
    endDate: string;
    notesDe: string;
    notesEn: string;
    position: number;
}>;

export type GqlCWorkspaceCvEducationUpsertMutation = { admin: { cvEducationUpsert: { cvEducationId: string } } };

export type GqlCWorkspaceCvEducationDeleteMutationVariables = Exact<{
    cvEducationId: string;
}>;

export type GqlCWorkspaceCvEducationDeleteMutation = { admin: { cvEducationDelete: { success: boolean } } };

export type GqlCWorkspaceCvSkillUpsertMutationVariables = Exact<{
    cvSkillId?: string | null | undefined;
    category: Schema.GqlCCvSkillCategory;
    label: string;
    position: number;
}>;

export type GqlCWorkspaceCvSkillUpsertMutation = { admin: { cvSkillUpsert: { cvSkillId: string } } };

export type GqlCWorkspaceCvSkillDeleteMutationVariables = Exact<{
    cvSkillId: string;
}>;

export type GqlCWorkspaceCvSkillDeleteMutation = { admin: { cvSkillDelete: { success: boolean } } };

export type GqlCWorkspaceCvHobbyUpsertMutationVariables = Exact<{
    cvHobbyId?: string | null | undefined;
    textDe: string;
    textEn: string;
    since?: number | null | undefined;
    position: number;
}>;

export type GqlCWorkspaceCvHobbyUpsertMutation = { admin: { cvHobbyUpsert: { cvHobbyId: string } } };

export type GqlCWorkspaceCvHobbyDeleteMutationVariables = Exact<{
    cvHobbyId: string;
}>;

export type GqlCWorkspaceCvHobbyDeleteMutation = { admin: { cvHobbyDelete: { success: boolean } } };

export type GqlCWorkspaceCvExperienceReorderMutationVariables = Exact<{
    orderedIds: Array<string> | string;
}>;

export type GqlCWorkspaceCvExperienceReorderMutation = { admin: { cvExperienceReorder: { success: boolean } } };

export type GqlCWorkspaceCvEducationReorderMutationVariables = Exact<{
    orderedIds: Array<string> | string;
}>;

export type GqlCWorkspaceCvEducationReorderMutation = { admin: { cvEducationReorder: { success: boolean } } };

export type GqlCWorkspaceCvSkillReorderMutationVariables = Exact<{
    orderedIds: Array<string> | string;
}>;

export type GqlCWorkspaceCvSkillReorderMutation = { admin: { cvSkillReorder: { success: boolean } } };

export type GqlCWorkspaceCvHobbyReorderMutationVariables = Exact<{
    orderedIds: Array<string> | string;
}>;

export type GqlCWorkspaceCvHobbyReorderMutation = { admin: { cvHobbyReorder: { success: boolean } } };

export type GqlCWorkspaceHubQueryVariables = Exact<{ [key: string]: never }>;

export type GqlCWorkspaceHubQuery = { admin: { projectRequestsInboxCount: number } };

export type GqlCWorkspaceProjectsPageQueryVariables = Exact<{ [key: string]: never }>;

export type GqlCWorkspaceProjectsPageQuery = {
    admin: {
        projectRequests: Array<{
            projectRequestId: string;
            chatId: string | null;
            name: string;
            email: string;
            company: string | null;
            projectType: Schema.GqlCProjectRequestType;
            description: string;
            budget: string | null;
            timeline: string | null;
            status: Schema.GqlCProjectRequestStatus;
            verifiedAt: string | null;
            createdAt: string;
            convertedProject: { projectId: string; title: string; status: Schema.GqlCProjectStatus } | null;
        }>;
        projects: Array<{
            projectId: string;
            title: string;
            description: string | null;
            notes: string | null;
            status: Schema.GqlCProjectStatus;
            position: number;
            startedAt: string | null;
            completedAt: string | null;
            createdAt: string;
            updatedAt: string;
            totalWorkSec: number;
            sourceRequest: {
                projectRequestId: string;
                name: string;
                email: string;
                company: string | null;
                projectType: Schema.GqlCProjectRequestType;
            } | null;
            tasks: Array<{
                taskId: string;
                projectId: string | null;
                title: string;
                notes: string | null;
                status: Schema.GqlCTaskStatus;
                position: number;
                dueAt: string | null;
                completedAt: string | null;
            }>;
            activities: Array<{
                activityId: string;
                projectId: string;
                taskId: string | null;
                kind: Schema.GqlCProjectActivityKind;
                channel: Schema.GqlCProjectActivityChannel | null;
                title: string;
                notes: string | null;
                occurredAt: string;
                startedAt: string | null;
                endedAt: string | null;
                durationSec: number | null;
                createdAt: string;
            }>;
        }>;
        standaloneTasks: Array<{
            taskId: string;
            projectId: string | null;
            title: string;
            notes: string | null;
            status: Schema.GqlCTaskStatus;
            position: number;
            dueAt: string | null;
            completedAt: string | null;
        }>;
        activeTimer: {
            activityId: string;
            projectId: string;
            taskId: string | null;
            kind: Schema.GqlCProjectActivityKind;
            title: string;
            occurredAt: string;
            startedAt: string | null;
            endedAt: string | null;
            durationSec: number | null;
        } | null;
    };
};

export type GqlCWorkspaceProjectRequestArchiveMutationVariables = Exact<{
    projectRequestId: string;
}>;

export type GqlCWorkspaceProjectRequestArchiveMutation = { admin: { projectRequestArchive: { success: boolean } } };

export type GqlCWorkspaceProjectRequestDeleteMutationVariables = Exact<{
    projectRequestId: string;
}>;

export type GqlCWorkspaceProjectRequestDeleteMutation = { admin: { projectRequestDelete: { success: boolean } } };

export type GqlCWorkspaceProjectUpsertMutationVariables = Exact<{
    projectId?: string | null | undefined;
    title: string;
    description?: string | null | undefined;
    notes?: string | null | undefined;
    status: Schema.GqlCProjectStatus;
    position?: number | null | undefined;
    sourceRequestId?: string | null | undefined;
    startedAt?: string | null | undefined;
    completedAt?: string | null | undefined;
}>;

export type GqlCWorkspaceProjectUpsertMutation = { admin: { projectUpsert: { projectId: string } } };

export type GqlCWorkspaceProjectDeleteMutationVariables = Exact<{
    projectId: string;
}>;

export type GqlCWorkspaceProjectDeleteMutation = { admin: { projectDelete: { success: boolean } } };

export type GqlCWorkspaceProjectReorderMutationVariables = Exact<{
    orderedIds: Array<string> | string;
}>;

export type GqlCWorkspaceProjectReorderMutation = { admin: { projectReorder: { success: boolean } } };

export type GqlCWorkspaceTaskUpsertMutationVariables = Exact<{
    taskId?: string | null | undefined;
    projectId?: string | null | undefined;
    title: string;
    notes?: string | null | undefined;
    status: Schema.GqlCTaskStatus;
    position: number;
    dueAt?: string | null | undefined;
    completedAt?: string | null | undefined;
}>;

export type GqlCWorkspaceTaskUpsertMutation = { admin: { taskUpsert: { taskId: string } } };

export type GqlCWorkspaceTaskDeleteMutationVariables = Exact<{
    taskId: string;
}>;

export type GqlCWorkspaceTaskDeleteMutation = { admin: { taskDelete: { success: boolean } } };

export type GqlCWorkspaceTaskReorderMutationVariables = Exact<{
    orderedIds: Array<string> | string;
}>;

export type GqlCWorkspaceTaskReorderMutation = { admin: { taskReorder: { success: boolean } } };

export type GqlCWorkspaceProjectActivityUpsertMutationVariables = Exact<{
    activityId?: string | null | undefined;
    projectId: string;
    taskId?: string | null | undefined;
    kind: Schema.GqlCProjectActivityKind;
    channel?: Schema.GqlCProjectActivityChannel | null | undefined;
    title: string;
    notes?: string | null | undefined;
    occurredAt: string;
    durationSec?: number | null | undefined;
}>;

export type GqlCWorkspaceProjectActivityUpsertMutation = { admin: { projectActivityUpsert: { activityId: string } } };

export type GqlCWorkspaceProjectActivityDeleteMutationVariables = Exact<{
    activityId: string;
}>;

export type GqlCWorkspaceProjectActivityDeleteMutation = { admin: { projectActivityDelete: { success: boolean } } };

export type GqlCWorkspaceProjectTimerStartMutationVariables = Exact<{
    projectId: string;
    taskId?: string | null | undefined;
    title?: string | null | undefined;
}>;

export type GqlCWorkspaceProjectTimerStartMutation = {
    admin: { projectTimerStart: { activityId: string; projectId: string; startedAt: string | null } };
};

export type GqlCWorkspaceProjectTimerStopMutationVariables = Exact<{
    activityId: string;
}>;

export type GqlCWorkspaceProjectTimerStopMutation = {
    admin: { projectTimerStop: { activityId: string; endedAt: string | null; durationSec: number | null } };
};

export type GqlCWorkspaceProjectDetailQueryVariables = Exact<{
    projectId: string;
}>;

export type GqlCWorkspaceProjectDetailQuery = {
    admin: {
        activeTimer: {
            activityId: string;
            projectId: string;
            taskId: string | null;
            kind: Schema.GqlCProjectActivityKind;
            title: string;
            occurredAt: string;
            startedAt: string | null;
            endedAt: string | null;
            durationSec: number | null;
        } | null;
        project: {
            projectId: string;
            title: string;
            description: string | null;
            notes: string | null;
            status: Schema.GqlCProjectStatus;
            position: number;
            startedAt: string | null;
            completedAt: string | null;
            createdAt: string;
            updatedAt: string;
            totalWorkSec: number;
            sourceRequest: {
                projectRequestId: string;
                name: string;
                email: string;
                company: string | null;
                projectType: Schema.GqlCProjectRequestType;
                description: string;
                budget: string | null;
                timeline: string | null;
            } | null;
            tasks: Array<{
                taskId: string;
                projectId: string | null;
                title: string;
                notes: string | null;
                status: Schema.GqlCTaskStatus;
                position: number;
                dueAt: string | null;
                completedAt: string | null;
            }>;
            activities: Array<{
                activityId: string;
                projectId: string;
                taskId: string | null;
                kind: Schema.GqlCProjectActivityKind;
                channel: Schema.GqlCProjectActivityChannel | null;
                title: string;
                notes: string | null;
                occurredAt: string;
                startedAt: string | null;
                endedAt: string | null;
                durationSec: number | null;
                amountCents: number | null;
                offerStatus: Schema.GqlCProjectOfferStatus | null;
                createdAt: string;
                links: Array<{
                    projectLinkId: string;
                    url: string;
                    label: string | null;
                    kind: Schema.GqlCProjectLinkKind;
                    pinned: boolean;
                }>;
                files: Array<{
                    projectFileId: string;
                    label: string | null;
                    kind: Schema.GqlCProjectFileKind;
                    pinned: boolean;
                    fileUpload: { fileUploadId: string; filename: string; mediaType: string; size: number; url: string };
                }>;
            }>;
            links: Array<{
                projectLinkId: string;
                projectId: string;
                activityId: string | null;
                url: string;
                label: string | null;
                kind: Schema.GqlCProjectLinkKind;
                pinned: boolean;
                createdAt: string;
                updatedAt: string;
            }>;
            files: Array<{
                projectFileId: string;
                projectId: string;
                activityId: string | null;
                label: string | null;
                kind: Schema.GqlCProjectFileKind;
                pinned: boolean;
                createdAt: string;
                updatedAt: string;
                fileUpload: { fileUploadId: string; filename: string; mediaType: string; size: number; url: string };
            }>;
        };
    };
};

export type GqlCWorkspaceProjectDetailUpsertProjectMutationVariables = Exact<{
    projectId?: string | null | undefined;
    title: string;
    description?: string | null | undefined;
    notes?: string | null | undefined;
    status: Schema.GqlCProjectStatus;
    position?: number | null | undefined;
    startedAt?: string | null | undefined;
    completedAt?: string | null | undefined;
}>;

export type GqlCWorkspaceProjectDetailUpsertProjectMutation = { admin: { projectUpsert: { projectId: string } } };

export type GqlCWorkspaceProjectDetailDeleteProjectMutationVariables = Exact<{
    projectId: string;
}>;

export type GqlCWorkspaceProjectDetailDeleteProjectMutation = { admin: { projectDelete: { success: boolean } } };

export type GqlCWorkspaceProjectDetailUpsertTaskMutationVariables = Exact<{
    taskId?: string | null | undefined;
    projectId?: string | null | undefined;
    title: string;
    notes?: string | null | undefined;
    status: Schema.GqlCTaskStatus;
    position: number;
    dueAt?: string | null | undefined;
    completedAt?: string | null | undefined;
}>;

export type GqlCWorkspaceProjectDetailUpsertTaskMutation = { admin: { taskUpsert: { taskId: string } } };

export type GqlCWorkspaceProjectDetailDeleteTaskMutationVariables = Exact<{
    taskId: string;
}>;

export type GqlCWorkspaceProjectDetailDeleteTaskMutation = { admin: { taskDelete: { success: boolean } } };

export type GqlCWorkspaceProjectDetailUpsertActivityMutationVariables = Exact<{
    activityId?: string | null | undefined;
    projectId: string;
    taskId?: string | null | undefined;
    kind: Schema.GqlCProjectActivityKind;
    channel?: Schema.GqlCProjectActivityChannel | null | undefined;
    title: string;
    notes?: string | null | undefined;
    occurredAt: string;
    durationSec?: number | null | undefined;
    amountCents?: number | null | undefined;
    offerStatus?: Schema.GqlCProjectOfferStatus | null | undefined;
    attachLinkUrl?: string | null | undefined;
    attachLinkKind?: Schema.GqlCProjectLinkKind | null | undefined;
    attachLinkLabel?: string | null | undefined;
    attachLinkPinned?: boolean | null | undefined;
    attachFileUploadId?: string | null | undefined;
    attachFileKind?: Schema.GqlCProjectFileKind | null | undefined;
    attachFileLabel?: string | null | undefined;
    attachFilePinned?: boolean | null | undefined;
}>;

export type GqlCWorkspaceProjectDetailUpsertActivityMutation = { admin: { projectActivityUpsert: { activityId: string } } };

export type GqlCWorkspaceProjectDetailDeleteActivityMutationVariables = Exact<{
    activityId: string;
}>;

export type GqlCWorkspaceProjectDetailDeleteActivityMutation = { admin: { projectActivityDelete: { success: boolean } } };

export type GqlCWorkspaceProjectDetailTimerStartMutationVariables = Exact<{
    projectId: string;
    taskId?: string | null | undefined;
    title?: string | null | undefined;
}>;

export type GqlCWorkspaceProjectDetailTimerStartMutation = {
    admin: { projectTimerStart: { activityId: string; projectId: string; startedAt: string | null } };
};

export type GqlCWorkspaceProjectDetailTimerStopMutationVariables = Exact<{
    activityId: string;
}>;

export type GqlCWorkspaceProjectDetailTimerStopMutation = {
    admin: { projectTimerStop: { activityId: string; endedAt: string | null; durationSec: number | null } };
};

export type GqlCWorkspaceProjectLinkUpsertMutationVariables = Exact<{
    projectLinkId?: string | null | undefined;
    projectId: string;
    activityId?: string | null | undefined;
    url: string;
    label?: string | null | undefined;
    kind: Schema.GqlCProjectLinkKind;
    pinned?: boolean | null | undefined;
}>;

export type GqlCWorkspaceProjectLinkUpsertMutation = { admin: { projectLinkUpsert: { projectLinkId: string } } };

export type GqlCWorkspaceProjectLinkDeleteMutationVariables = Exact<{
    projectLinkId: string;
}>;

export type GqlCWorkspaceProjectLinkDeleteMutation = { admin: { projectLinkDelete: { success: boolean } } };

export type GqlCWorkspaceProjectLinkTogglePinMutationVariables = Exact<{
    projectLinkId: string;
}>;

export type GqlCWorkspaceProjectLinkTogglePinMutation = { admin: { projectLinkTogglePin: { projectLinkId: string; pinned: boolean } } };

export type GqlCWorkspaceProjectFileUpsertMutationVariables = Exact<{
    projectFileId?: string | null | undefined;
    projectId: string;
    activityId?: string | null | undefined;
    fileUploadId: string;
    label?: string | null | undefined;
    kind: Schema.GqlCProjectFileKind;
    pinned?: boolean | null | undefined;
}>;

export type GqlCWorkspaceProjectFileUpsertMutation = { admin: { projectFileUpsert: { projectFileId: string } } };

export type GqlCWorkspaceProjectFileDeleteMutationVariables = Exact<{
    projectFileId: string;
}>;

export type GqlCWorkspaceProjectFileDeleteMutation = { admin: { projectFileDelete: { success: boolean } } };

export type GqlCWorkspaceProjectFileTogglePinMutationVariables = Exact<{
    projectFileId: string;
}>;

export type GqlCWorkspaceProjectFileTogglePinMutation = { admin: { projectFileTogglePin: { projectFileId: string; pinned: boolean } } };

export type GqlCChatMessageGenerationFragment = {
    modelId: string;
    inputTokens: number | null;
    outputTokens: number | null;
    totalTokens: number | null;
    reasoningTokens: number | null;
    cachedInputTokens: number | null;
};

type GqlCChatMessageFields_ChatMessageAssistantInputCollection_Fragment = {
    __typename: 'ChatMessageAssistantInputCollection';
    chatMessageId: string;
    prompt: string;
    mode: string;
    createdAt: string;
    generation: {
        modelId: string;
        inputTokens: number | null;
        outputTokens: number | null;
        totalTokens: number | null;
        reasoningTokens: number | null;
        cachedInputTokens: number | null;
    } | null;
    inputs: Array<
        | { __typename: 'ChatAssistantInputBoolean'; inputId: string; prompt: string }
        | { __typename: 'ChatAssistantInputDate'; inputId: string; prompt: string }
        | { __typename: 'ChatAssistantInputDateRange'; inputId: string; prompt: string }
        | { __typename: 'ChatAssistantInputDateTime'; inputId: string; prompt: string }
        | { __typename: 'ChatAssistantInputMultiSelect'; inputId: string; prompt: string; options: Array<string> }
        | { __typename: 'ChatAssistantInputOtp'; inputId: string; prompt: string }
        | { __typename: 'ChatAssistantInputSingleSelect'; inputId: string; prompt: string; options: Array<string> }
        | { __typename: 'ChatAssistantInputText'; inputId: string; prompt: string }
        | { __typename: 'ChatAssistantInputTime'; inputId: string; prompt: string }
    >;
};

type GqlCChatMessageFields_ChatMessageAssistantText_Fragment = {
    __typename: 'ChatMessageAssistantText';
    chatMessageId: string;
    body: string;
    createdAt: string;
    generation: {
        modelId: string;
        inputTokens: number | null;
        outputTokens: number | null;
        totalTokens: number | null;
        reasoningTokens: number | null;
        cachedInputTokens: number | null;
    } | null;
};

type GqlCChatMessageFields_ChatMessageToolApprovalRequest_Fragment = {
    __typename: 'ChatMessageToolApprovalRequest';
    chatMessageId: string;
    approvalId: string;
    toolName: string;
    args: unknown;
    createdAt: string;
    generation: {
        modelId: string;
        inputTokens: number | null;
        outputTokens: number | null;
        totalTokens: number | null;
        reasoningTokens: number | null;
        cachedInputTokens: number | null;
    } | null;
};

type GqlCChatMessageFields_ChatMessageToolApprovalResponse_Fragment = {
    __typename: 'ChatMessageToolApprovalResponse';
    chatMessageId: string;
    approvalId: string;
    approved: boolean;
    reason: string | null;
    createdAt: string;
};

type GqlCChatMessageFields_ChatMessageToolCall_Fragment = {
    __typename: 'ChatMessageToolCall';
    chatMessageId: string;
    toolName: string;
    args: unknown;
    parentChatMessageId: string | null;
    createdAt: string;
};

type GqlCChatMessageFields_ChatMessageUser_Fragment = {
    __typename: 'ChatMessageUser';
    chatMessageId: string;
    body: string;
    createdAt: string;
    author: { userId: string; name: string } | null;
    attachments: Array<{ fileUploadId: string; filename: string; mediaType: string; size: number; url: string }>;
    profileObservations: Array<{
        observationId: string;
        category: Schema.GqlCProfileObservationCategory;
        content: string;
        confidence: number | null;
        createdAt: string;
    }>;
};

type GqlCChatMessageFields_ChatMessageUserInput_Fragment = {
    __typename: 'ChatMessageUserInput';
    chatMessageId: string;
    collectionMessageId: string;
    createdAt: string;
    author: { userId: string; name: string } | null;
    answers: Array<{
        inputId: string;
        value:
            | { __typename: 'ChatAssistantInputValueBoolean'; boolean: boolean }
            | { __typename: 'ChatAssistantInputValueDate'; date: string }
            | { __typename: 'ChatAssistantInputValueDateRange'; from: string; to: string }
            | { __typename: 'ChatAssistantInputValueDateTime'; dateTime: string }
            | { __typename: 'ChatAssistantInputValueString'; value: string }
            | { __typename: 'ChatAssistantInputValueStringList'; values: Array<string> }
            | { __typename: 'ChatAssistantInputValueTime'; time: string };
    }>;
};

export type GqlCChatMessageFieldsFragment =
    | GqlCChatMessageFields_ChatMessageAssistantInputCollection_Fragment
    | GqlCChatMessageFields_ChatMessageAssistantText_Fragment
    | GqlCChatMessageFields_ChatMessageToolApprovalRequest_Fragment
    | GqlCChatMessageFields_ChatMessageToolApprovalResponse_Fragment
    | GqlCChatMessageFields_ChatMessageToolCall_Fragment
    | GqlCChatMessageFields_ChatMessageUser_Fragment
    | GqlCChatMessageFields_ChatMessageUserInput_Fragment;

export type GqlCChatPageQueryVariables = Exact<{
    chatId: string;
}>;

export type GqlCChatPageQuery = {
    currentSession: { sessionId: string; user: { userId: string; name: string } | null };
    chat: {
        chatId: string;
        title: string;
        lastModifiedAt: string;
        messages: Array<
            | {
                  __typename: 'ChatMessageAssistantInputCollection';
                  chatMessageId: string;
                  prompt: string;
                  mode: string;
                  createdAt: string;
                  generation: {
                      modelId: string;
                      inputTokens: number | null;
                      outputTokens: number | null;
                      totalTokens: number | null;
                      reasoningTokens: number | null;
                      cachedInputTokens: number | null;
                  } | null;
                  inputs: Array<
                      | { __typename: 'ChatAssistantInputBoolean'; inputId: string; prompt: string }
                      | { __typename: 'ChatAssistantInputDate'; inputId: string; prompt: string }
                      | { __typename: 'ChatAssistantInputDateRange'; inputId: string; prompt: string }
                      | { __typename: 'ChatAssistantInputDateTime'; inputId: string; prompt: string }
                      | { __typename: 'ChatAssistantInputMultiSelect'; inputId: string; prompt: string; options: Array<string> }
                      | { __typename: 'ChatAssistantInputOtp'; inputId: string; prompt: string }
                      | { __typename: 'ChatAssistantInputSingleSelect'; inputId: string; prompt: string; options: Array<string> }
                      | { __typename: 'ChatAssistantInputText'; inputId: string; prompt: string }
                      | { __typename: 'ChatAssistantInputTime'; inputId: string; prompt: string }
                  >;
              }
            | {
                  __typename: 'ChatMessageAssistantText';
                  chatMessageId: string;
                  body: string;
                  createdAt: string;
                  generation: {
                      modelId: string;
                      inputTokens: number | null;
                      outputTokens: number | null;
                      totalTokens: number | null;
                      reasoningTokens: number | null;
                      cachedInputTokens: number | null;
                  } | null;
              }
            | {
                  __typename: 'ChatMessageToolApprovalRequest';
                  chatMessageId: string;
                  approvalId: string;
                  toolName: string;
                  args: unknown;
                  createdAt: string;
                  generation: {
                      modelId: string;
                      inputTokens: number | null;
                      outputTokens: number | null;
                      totalTokens: number | null;
                      reasoningTokens: number | null;
                      cachedInputTokens: number | null;
                  } | null;
              }
            | {
                  __typename: 'ChatMessageToolApprovalResponse';
                  chatMessageId: string;
                  approvalId: string;
                  approved: boolean;
                  reason: string | null;
                  createdAt: string;
              }
            | {
                  __typename: 'ChatMessageToolCall';
                  chatMessageId: string;
                  toolName: string;
                  args: unknown;
                  parentChatMessageId: string | null;
                  createdAt: string;
              }
            | {
                  __typename: 'ChatMessageUser';
                  chatMessageId: string;
                  body: string;
                  createdAt: string;
                  author: { userId: string; name: string } | null;
                  attachments: Array<{ fileUploadId: string; filename: string; mediaType: string; size: number; url: string }>;
                  profileObservations: Array<{
                      observationId: string;
                      category: Schema.GqlCProfileObservationCategory;
                      content: string;
                      confidence: number | null;
                      createdAt: string;
                  }>;
              }
            | {
                  __typename: 'ChatMessageUserInput';
                  chatMessageId: string;
                  collectionMessageId: string;
                  createdAt: string;
                  author: { userId: string; name: string } | null;
                  answers: Array<{
                      inputId: string;
                      value:
                          | { __typename: 'ChatAssistantInputValueBoolean'; boolean: boolean }
                          | { __typename: 'ChatAssistantInputValueDate'; date: string }
                          | { __typename: 'ChatAssistantInputValueDateRange'; from: string; to: string }
                          | { __typename: 'ChatAssistantInputValueDateTime'; dateTime: string }
                          | { __typename: 'ChatAssistantInputValueString'; value: string }
                          | { __typename: 'ChatAssistantInputValueStringList'; values: Array<string> }
                          | { __typename: 'ChatAssistantInputValueTime'; time: string };
                  }>;
              }
        >;
    };
};

export type GqlCChatMessageCreateMutationVariables = Exact<{
    chatId?: string | null | undefined;
    message: string;
    fileUploadIds?: Array<string> | string | null | undefined;
    generationId?: string | null | undefined;
    requireToolCallApprovals: boolean;
}>;

export type GqlCChatMessageCreateMutation = { chatMessageCreate: { chatId: string; chatMessageId: string } | null };

export type GqlCChatInputCollectionRespondMutationVariables = Exact<{
    collectionMessageId: string;
    answers: Array<Schema.GqlCChatMessageUserInputAnswerCreate> | Schema.GqlCChatMessageUserInputAnswerCreate;
    generationId?: string | null | undefined;
    requireToolCallApprovals: boolean;
}>;

export type GqlCChatInputCollectionRespondMutation = { chatInputCollectionRespond: { chatId: string; chatMessageId: string } | null };

export type GqlCChatToolApprovalRespondMutationVariables = Exact<{
    approvalId: string;
    approved: boolean;
    reason?: string | null | undefined;
    generationId?: string | null | undefined;
    requireToolCallApprovals: boolean;
}>;

export type GqlCChatToolApprovalRespondMutation = { chatToolApprovalRespond: { chatId: string; chatMessageId: string } | null };

export type GqlCChatUpdatesSubscriptionVariables = Exact<{
    generationId: string;
}>;

export type GqlCChatUpdatesSubscription = {
    chatUpdates:
        | { __typename: 'ChatUpdateAssistantTextChunk'; chatMessageId: string; delta: string }
        | {
              __typename: 'ChatUpdateMessageAppended';
              message:
                  | {
                        __typename: 'ChatMessageAssistantInputCollection';
                        chatMessageId: string;
                        prompt: string;
                        mode: string;
                        createdAt: string;
                        generation: {
                            modelId: string;
                            inputTokens: number | null;
                            outputTokens: number | null;
                            totalTokens: number | null;
                            reasoningTokens: number | null;
                            cachedInputTokens: number | null;
                        } | null;
                        inputs: Array<
                            | { __typename: 'ChatAssistantInputBoolean'; inputId: string; prompt: string }
                            | { __typename: 'ChatAssistantInputDate'; inputId: string; prompt: string }
                            | { __typename: 'ChatAssistantInputDateRange'; inputId: string; prompt: string }
                            | { __typename: 'ChatAssistantInputDateTime'; inputId: string; prompt: string }
                            | { __typename: 'ChatAssistantInputMultiSelect'; inputId: string; prompt: string; options: Array<string> }
                            | { __typename: 'ChatAssistantInputOtp'; inputId: string; prompt: string }
                            | { __typename: 'ChatAssistantInputSingleSelect'; inputId: string; prompt: string; options: Array<string> }
                            | { __typename: 'ChatAssistantInputText'; inputId: string; prompt: string }
                            | { __typename: 'ChatAssistantInputTime'; inputId: string; prompt: string }
                        >;
                    }
                  | {
                        __typename: 'ChatMessageAssistantText';
                        chatMessageId: string;
                        body: string;
                        createdAt: string;
                        generation: {
                            modelId: string;
                            inputTokens: number | null;
                            outputTokens: number | null;
                            totalTokens: number | null;
                            reasoningTokens: number | null;
                            cachedInputTokens: number | null;
                        } | null;
                    }
                  | {
                        __typename: 'ChatMessageToolApprovalRequest';
                        chatMessageId: string;
                        approvalId: string;
                        toolName: string;
                        args: unknown;
                        createdAt: string;
                        generation: {
                            modelId: string;
                            inputTokens: number | null;
                            outputTokens: number | null;
                            totalTokens: number | null;
                            reasoningTokens: number | null;
                            cachedInputTokens: number | null;
                        } | null;
                    }
                  | {
                        __typename: 'ChatMessageToolApprovalResponse';
                        chatMessageId: string;
                        approvalId: string;
                        approved: boolean;
                        reason: string | null;
                        createdAt: string;
                    }
                  | {
                        __typename: 'ChatMessageToolCall';
                        chatMessageId: string;
                        toolName: string;
                        args: unknown;
                        parentChatMessageId: string | null;
                        createdAt: string;
                    }
                  | {
                        __typename: 'ChatMessageUser';
                        chatMessageId: string;
                        body: string;
                        createdAt: string;
                        author: { userId: string; name: string } | null;
                        attachments: Array<{ fileUploadId: string; filename: string; mediaType: string; size: number; url: string }>;
                        profileObservations: Array<{
                            observationId: string;
                            category: Schema.GqlCProfileObservationCategory;
                            content: string;
                            confidence: number | null;
                            createdAt: string;
                        }>;
                    }
                  | {
                        __typename: 'ChatMessageUserInput';
                        chatMessageId: string;
                        collectionMessageId: string;
                        createdAt: string;
                        author: { userId: string; name: string } | null;
                        answers: Array<{
                            inputId: string;
                            value:
                                | { __typename: 'ChatAssistantInputValueBoolean'; boolean: boolean }
                                | { __typename: 'ChatAssistantInputValueDate'; date: string }
                                | { __typename: 'ChatAssistantInputValueDateRange'; from: string; to: string }
                                | { __typename: 'ChatAssistantInputValueDateTime'; dateTime: string }
                                | { __typename: 'ChatAssistantInputValueString'; value: string }
                                | { __typename: 'ChatAssistantInputValueStringList'; values: Array<string> }
                                | { __typename: 'ChatAssistantInputValueTime'; time: string };
                        }>;
                    };
          }
        | { __typename: 'ChatUpdateTurnEnded'; generationId: string };
};

export type GqlCVisitorChatListItemFragment = { chatId: string; title: string; lastModifiedAt: string };

export type GqlCVisitorChatQuotaFieldsFragment = { used: number; limit: number; resetsAt: string | null };

export type GqlCVisitorPreviousChatsQueryVariables = Exact<{ [key: string]: never }>;

export type GqlCVisitorPreviousChatsQuery = {
    currentSession: {
        sessionId: string;
        visitorChats: Array<{ chatId: string; title: string; lastModifiedAt: string }>;
        visitorChatQuota: { used: number; limit: number; resetsAt: string | null };
    };
};

export const WorkspaceChatMessageGenerationFragmentDoc = {
    kind: 'Document',
    definitions: [
        {
            kind: 'FragmentDefinition',
            name: { kind: 'Name', value: 'WorkspaceChatMessageGeneration' },
            typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessageGeneration' } },
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    { kind: 'Field', name: { kind: 'Name', value: 'modelId' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'inputTokens' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'outputTokens' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'totalTokens' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'reasoningTokens' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'cachedInputTokens' } },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceChatMessageGenerationFragment, unknown>;
export const WorkspaceChatMessageFieldsFragmentDoc = {
    kind: 'Document',
    definitions: [
        {
            kind: 'FragmentDefinition',
            name: { kind: 'Name', value: 'WorkspaceChatMessageFields' },
            typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessage' } },
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    { kind: 'Field', name: { kind: 'Name', value: '__typename' } },
                    {
                        kind: 'InlineFragment',
                        typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessageUser' } },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                { kind: 'Field', name: { kind: 'Name', value: 'chatMessageId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'body' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'author' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'userId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                                        ],
                                    },
                                },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'attachments' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'fileUploadId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'filename' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'mediaType' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'size' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'url' } },
                                        ],
                                    },
                                },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'profileObservations' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'observationId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'category' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'content' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'confidence' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                    {
                        kind: 'InlineFragment',
                        typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessageAssistantText' } },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                { kind: 'Field', name: { kind: 'Name', value: 'chatMessageId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'body' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'generation' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'FragmentSpread', name: { kind: 'Name', value: 'WorkspaceChatMessageGeneration' } },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                    {
                        kind: 'InlineFragment',
                        typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessageToolCall' } },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                { kind: 'Field', name: { kind: 'Name', value: 'chatMessageId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'toolName' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'args' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'parentChatMessageId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                            ],
                        },
                    },
                    {
                        kind: 'InlineFragment',
                        typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessageToolApprovalRequest' } },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                { kind: 'Field', name: { kind: 'Name', value: 'chatMessageId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'approvalId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'toolName' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'args' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'generation' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'FragmentSpread', name: { kind: 'Name', value: 'WorkspaceChatMessageGeneration' } },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                    {
                        kind: 'InlineFragment',
                        typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessageToolApprovalResponse' } },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                { kind: 'Field', name: { kind: 'Name', value: 'chatMessageId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'approvalId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'approved' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'reason' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                            ],
                        },
                    },
                    {
                        kind: 'InlineFragment',
                        typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessageAssistantInputCollection' } },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                { kind: 'Field', name: { kind: 'Name', value: 'chatMessageId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'mode' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'generation' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'FragmentSpread', name: { kind: 'Name', value: 'WorkspaceChatMessageGeneration' } },
                                        ],
                                    },
                                },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'inputs' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: '__typename' } },
                                            {
                                                kind: 'InlineFragment',
                                                typeCondition: {
                                                    kind: 'NamedType',
                                                    name: { kind: 'Name', value: 'ChatAssistantInputDate' },
                                                },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                                    ],
                                                },
                                            },
                                            {
                                                kind: 'InlineFragment',
                                                typeCondition: {
                                                    kind: 'NamedType',
                                                    name: { kind: 'Name', value: 'ChatAssistantInputDateRange' },
                                                },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                                    ],
                                                },
                                            },
                                            {
                                                kind: 'InlineFragment',
                                                typeCondition: {
                                                    kind: 'NamedType',
                                                    name: { kind: 'Name', value: 'ChatAssistantInputDateTime' },
                                                },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                                    ],
                                                },
                                            },
                                            {
                                                kind: 'InlineFragment',
                                                typeCondition: {
                                                    kind: 'NamedType',
                                                    name: { kind: 'Name', value: 'ChatAssistantInputTime' },
                                                },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                                    ],
                                                },
                                            },
                                            {
                                                kind: 'InlineFragment',
                                                typeCondition: {
                                                    kind: 'NamedType',
                                                    name: { kind: 'Name', value: 'ChatAssistantInputSingleSelect' },
                                                },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'options' } },
                                                    ],
                                                },
                                            },
                                            {
                                                kind: 'InlineFragment',
                                                typeCondition: {
                                                    kind: 'NamedType',
                                                    name: { kind: 'Name', value: 'ChatAssistantInputMultiSelect' },
                                                },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'options' } },
                                                    ],
                                                },
                                            },
                                            {
                                                kind: 'InlineFragment',
                                                typeCondition: {
                                                    kind: 'NamedType',
                                                    name: { kind: 'Name', value: 'ChatAssistantInputBoolean' },
                                                },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                                    ],
                                                },
                                            },
                                            {
                                                kind: 'InlineFragment',
                                                typeCondition: {
                                                    kind: 'NamedType',
                                                    name: { kind: 'Name', value: 'ChatAssistantInputText' },
                                                },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                                    ],
                                                },
                                            },
                                            {
                                                kind: 'InlineFragment',
                                                typeCondition: {
                                                    kind: 'NamedType',
                                                    name: { kind: 'Name', value: 'ChatAssistantInputOtp' },
                                                },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                                    ],
                                                },
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                    {
                        kind: 'InlineFragment',
                        typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessageUserInput' } },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                { kind: 'Field', name: { kind: 'Name', value: 'chatMessageId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'collectionMessageId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'author' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'userId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                                        ],
                                    },
                                },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'answers' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                            {
                                                kind: 'Field',
                                                name: { kind: 'Name', value: 'value' },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: '__typename' } },
                                                        {
                                                            kind: 'InlineFragment',
                                                            typeCondition: {
                                                                kind: 'NamedType',
                                                                name: { kind: 'Name', value: 'ChatAssistantInputValueDate' },
                                                            },
                                                            selectionSet: {
                                                                kind: 'SelectionSet',
                                                                selections: [{ kind: 'Field', name: { kind: 'Name', value: 'date' } }],
                                                            },
                                                        },
                                                        {
                                                            kind: 'InlineFragment',
                                                            typeCondition: {
                                                                kind: 'NamedType',
                                                                name: { kind: 'Name', value: 'ChatAssistantInputValueDateRange' },
                                                            },
                                                            selectionSet: {
                                                                kind: 'SelectionSet',
                                                                selections: [
                                                                    { kind: 'Field', name: { kind: 'Name', value: 'from' } },
                                                                    { kind: 'Field', name: { kind: 'Name', value: 'to' } },
                                                                ],
                                                            },
                                                        },
                                                        {
                                                            kind: 'InlineFragment',
                                                            typeCondition: {
                                                                kind: 'NamedType',
                                                                name: { kind: 'Name', value: 'ChatAssistantInputValueDateTime' },
                                                            },
                                                            selectionSet: {
                                                                kind: 'SelectionSet',
                                                                selections: [{ kind: 'Field', name: { kind: 'Name', value: 'dateTime' } }],
                                                            },
                                                        },
                                                        {
                                                            kind: 'InlineFragment',
                                                            typeCondition: {
                                                                kind: 'NamedType',
                                                                name: { kind: 'Name', value: 'ChatAssistantInputValueTime' },
                                                            },
                                                            selectionSet: {
                                                                kind: 'SelectionSet',
                                                                selections: [{ kind: 'Field', name: { kind: 'Name', value: 'time' } }],
                                                            },
                                                        },
                                                        {
                                                            kind: 'InlineFragment',
                                                            typeCondition: {
                                                                kind: 'NamedType',
                                                                name: { kind: 'Name', value: 'ChatAssistantInputValueString' },
                                                            },
                                                            selectionSet: {
                                                                kind: 'SelectionSet',
                                                                selections: [{ kind: 'Field', name: { kind: 'Name', value: 'value' } }],
                                                            },
                                                        },
                                                        {
                                                            kind: 'InlineFragment',
                                                            typeCondition: {
                                                                kind: 'NamedType',
                                                                name: { kind: 'Name', value: 'ChatAssistantInputValueStringList' },
                                                            },
                                                            selectionSet: {
                                                                kind: 'SelectionSet',
                                                                selections: [{ kind: 'Field', name: { kind: 'Name', value: 'values' } }],
                                                            },
                                                        },
                                                        {
                                                            kind: 'InlineFragment',
                                                            typeCondition: {
                                                                kind: 'NamedType',
                                                                name: { kind: 'Name', value: 'ChatAssistantInputValueBoolean' },
                                                            },
                                                            selectionSet: {
                                                                kind: 'SelectionSet',
                                                                selections: [{ kind: 'Field', name: { kind: 'Name', value: 'boolean' } }],
                                                            },
                                                        },
                                                    ],
                                                },
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
        {
            kind: 'FragmentDefinition',
            name: { kind: 'Name', value: 'WorkspaceChatMessageGeneration' },
            typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessageGeneration' } },
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    { kind: 'Field', name: { kind: 'Name', value: 'modelId' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'inputTokens' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'outputTokens' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'totalTokens' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'reasoningTokens' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'cachedInputTokens' } },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceChatMessageFieldsFragment, unknown>;
export const WorkspaceChatListItemFragmentDoc = {
    kind: 'Document',
    definitions: [
        {
            kind: 'FragmentDefinition',
            name: { kind: 'Name', value: 'WorkspaceChatListItem' },
            typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'Chat' } },
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    { kind: 'Field', name: { kind: 'Name', value: 'chatId' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'title' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'lastModifiedAt' } },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceChatListItemFragment, unknown>;
export const WorkspaceProfileObservationFragmentDoc = {
    kind: 'Document',
    definitions: [
        {
            kind: 'FragmentDefinition',
            name: { kind: 'Name', value: 'WorkspaceProfileObservation' },
            typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ProfileObservation' } },
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    { kind: 'Field', name: { kind: 'Name', value: 'observationId' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'category' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'content' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'confidence' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'sourceChatId' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'sourceChatMessageId' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'analyzerModelId' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'dismissedAt' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceProfileObservationFragment, unknown>;
export const ChatMessageGenerationFragmentDoc = {
    kind: 'Document',
    definitions: [
        {
            kind: 'FragmentDefinition',
            name: { kind: 'Name', value: 'ChatMessageGeneration' },
            typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessageGeneration' } },
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    { kind: 'Field', name: { kind: 'Name', value: 'modelId' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'inputTokens' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'outputTokens' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'totalTokens' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'reasoningTokens' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'cachedInputTokens' } },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCChatMessageGenerationFragment, unknown>;
export const ChatMessageFieldsFragmentDoc = {
    kind: 'Document',
    definitions: [
        {
            kind: 'FragmentDefinition',
            name: { kind: 'Name', value: 'ChatMessageFields' },
            typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessage' } },
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    { kind: 'Field', name: { kind: 'Name', value: '__typename' } },
                    {
                        kind: 'InlineFragment',
                        typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessageUser' } },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                { kind: 'Field', name: { kind: 'Name', value: 'chatMessageId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'body' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'author' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'userId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                                        ],
                                    },
                                },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'attachments' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'fileUploadId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'filename' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'mediaType' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'size' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'url' } },
                                        ],
                                    },
                                },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'profileObservations' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'observationId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'category' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'content' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'confidence' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                    {
                        kind: 'InlineFragment',
                        typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessageAssistantText' } },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                { kind: 'Field', name: { kind: 'Name', value: 'chatMessageId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'body' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'generation' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [{ kind: 'FragmentSpread', name: { kind: 'Name', value: 'ChatMessageGeneration' } }],
                                    },
                                },
                            ],
                        },
                    },
                    {
                        kind: 'InlineFragment',
                        typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessageToolCall' } },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                { kind: 'Field', name: { kind: 'Name', value: 'chatMessageId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'toolName' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'args' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'parentChatMessageId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                            ],
                        },
                    },
                    {
                        kind: 'InlineFragment',
                        typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessageToolApprovalRequest' } },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                { kind: 'Field', name: { kind: 'Name', value: 'chatMessageId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'approvalId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'toolName' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'args' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'generation' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [{ kind: 'FragmentSpread', name: { kind: 'Name', value: 'ChatMessageGeneration' } }],
                                    },
                                },
                            ],
                        },
                    },
                    {
                        kind: 'InlineFragment',
                        typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessageToolApprovalResponse' } },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                { kind: 'Field', name: { kind: 'Name', value: 'chatMessageId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'approvalId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'approved' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'reason' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                            ],
                        },
                    },
                    {
                        kind: 'InlineFragment',
                        typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessageAssistantInputCollection' } },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                { kind: 'Field', name: { kind: 'Name', value: 'chatMessageId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'mode' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'generation' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [{ kind: 'FragmentSpread', name: { kind: 'Name', value: 'ChatMessageGeneration' } }],
                                    },
                                },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'inputs' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: '__typename' } },
                                            {
                                                kind: 'InlineFragment',
                                                typeCondition: {
                                                    kind: 'NamedType',
                                                    name: { kind: 'Name', value: 'ChatAssistantInputDate' },
                                                },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                                    ],
                                                },
                                            },
                                            {
                                                kind: 'InlineFragment',
                                                typeCondition: {
                                                    kind: 'NamedType',
                                                    name: { kind: 'Name', value: 'ChatAssistantInputDateRange' },
                                                },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                                    ],
                                                },
                                            },
                                            {
                                                kind: 'InlineFragment',
                                                typeCondition: {
                                                    kind: 'NamedType',
                                                    name: { kind: 'Name', value: 'ChatAssistantInputDateTime' },
                                                },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                                    ],
                                                },
                                            },
                                            {
                                                kind: 'InlineFragment',
                                                typeCondition: {
                                                    kind: 'NamedType',
                                                    name: { kind: 'Name', value: 'ChatAssistantInputTime' },
                                                },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                                    ],
                                                },
                                            },
                                            {
                                                kind: 'InlineFragment',
                                                typeCondition: {
                                                    kind: 'NamedType',
                                                    name: { kind: 'Name', value: 'ChatAssistantInputSingleSelect' },
                                                },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'options' } },
                                                    ],
                                                },
                                            },
                                            {
                                                kind: 'InlineFragment',
                                                typeCondition: {
                                                    kind: 'NamedType',
                                                    name: { kind: 'Name', value: 'ChatAssistantInputMultiSelect' },
                                                },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'options' } },
                                                    ],
                                                },
                                            },
                                            {
                                                kind: 'InlineFragment',
                                                typeCondition: {
                                                    kind: 'NamedType',
                                                    name: { kind: 'Name', value: 'ChatAssistantInputBoolean' },
                                                },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                                    ],
                                                },
                                            },
                                            {
                                                kind: 'InlineFragment',
                                                typeCondition: {
                                                    kind: 'NamedType',
                                                    name: { kind: 'Name', value: 'ChatAssistantInputText' },
                                                },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                                    ],
                                                },
                                            },
                                            {
                                                kind: 'InlineFragment',
                                                typeCondition: {
                                                    kind: 'NamedType',
                                                    name: { kind: 'Name', value: 'ChatAssistantInputOtp' },
                                                },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                                    ],
                                                },
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                    {
                        kind: 'InlineFragment',
                        typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessageUserInput' } },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                { kind: 'Field', name: { kind: 'Name', value: 'chatMessageId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'collectionMessageId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'author' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'userId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                                        ],
                                    },
                                },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'answers' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                            {
                                                kind: 'Field',
                                                name: { kind: 'Name', value: 'value' },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: '__typename' } },
                                                        {
                                                            kind: 'InlineFragment',
                                                            typeCondition: {
                                                                kind: 'NamedType',
                                                                name: { kind: 'Name', value: 'ChatAssistantInputValueDate' },
                                                            },
                                                            selectionSet: {
                                                                kind: 'SelectionSet',
                                                                selections: [{ kind: 'Field', name: { kind: 'Name', value: 'date' } }],
                                                            },
                                                        },
                                                        {
                                                            kind: 'InlineFragment',
                                                            typeCondition: {
                                                                kind: 'NamedType',
                                                                name: { kind: 'Name', value: 'ChatAssistantInputValueDateRange' },
                                                            },
                                                            selectionSet: {
                                                                kind: 'SelectionSet',
                                                                selections: [
                                                                    { kind: 'Field', name: { kind: 'Name', value: 'from' } },
                                                                    { kind: 'Field', name: { kind: 'Name', value: 'to' } },
                                                                ],
                                                            },
                                                        },
                                                        {
                                                            kind: 'InlineFragment',
                                                            typeCondition: {
                                                                kind: 'NamedType',
                                                                name: { kind: 'Name', value: 'ChatAssistantInputValueDateTime' },
                                                            },
                                                            selectionSet: {
                                                                kind: 'SelectionSet',
                                                                selections: [{ kind: 'Field', name: { kind: 'Name', value: 'dateTime' } }],
                                                            },
                                                        },
                                                        {
                                                            kind: 'InlineFragment',
                                                            typeCondition: {
                                                                kind: 'NamedType',
                                                                name: { kind: 'Name', value: 'ChatAssistantInputValueTime' },
                                                            },
                                                            selectionSet: {
                                                                kind: 'SelectionSet',
                                                                selections: [{ kind: 'Field', name: { kind: 'Name', value: 'time' } }],
                                                            },
                                                        },
                                                        {
                                                            kind: 'InlineFragment',
                                                            typeCondition: {
                                                                kind: 'NamedType',
                                                                name: { kind: 'Name', value: 'ChatAssistantInputValueString' },
                                                            },
                                                            selectionSet: {
                                                                kind: 'SelectionSet',
                                                                selections: [{ kind: 'Field', name: { kind: 'Name', value: 'value' } }],
                                                            },
                                                        },
                                                        {
                                                            kind: 'InlineFragment',
                                                            typeCondition: {
                                                                kind: 'NamedType',
                                                                name: { kind: 'Name', value: 'ChatAssistantInputValueStringList' },
                                                            },
                                                            selectionSet: {
                                                                kind: 'SelectionSet',
                                                                selections: [{ kind: 'Field', name: { kind: 'Name', value: 'values' } }],
                                                            },
                                                        },
                                                        {
                                                            kind: 'InlineFragment',
                                                            typeCondition: {
                                                                kind: 'NamedType',
                                                                name: { kind: 'Name', value: 'ChatAssistantInputValueBoolean' },
                                                            },
                                                            selectionSet: {
                                                                kind: 'SelectionSet',
                                                                selections: [{ kind: 'Field', name: { kind: 'Name', value: 'boolean' } }],
                                                            },
                                                        },
                                                    ],
                                                },
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
        {
            kind: 'FragmentDefinition',
            name: { kind: 'Name', value: 'ChatMessageGeneration' },
            typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessageGeneration' } },
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    { kind: 'Field', name: { kind: 'Name', value: 'modelId' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'inputTokens' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'outputTokens' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'totalTokens' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'reasoningTokens' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'cachedInputTokens' } },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCChatMessageFieldsFragment, unknown>;
export const VisitorChatListItemFragmentDoc = {
    kind: 'Document',
    definitions: [
        {
            kind: 'FragmentDefinition',
            name: { kind: 'Name', value: 'VisitorChatListItem' },
            typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'Chat' } },
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    { kind: 'Field', name: { kind: 'Name', value: 'chatId' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'title' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'lastModifiedAt' } },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCVisitorChatListItemFragment, unknown>;
export const VisitorChatQuotaFieldsFragmentDoc = {
    kind: 'Document',
    definitions: [
        {
            kind: 'FragmentDefinition',
            name: { kind: 'Name', value: 'VisitorChatQuotaFields' },
            typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'VisitorChatQuota' } },
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    { kind: 'Field', name: { kind: 'Name', value: 'used' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'limit' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'resetsAt' } },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCVisitorChatQuotaFieldsFragment, unknown>;
export const CvPageDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'query',
            name: { kind: 'Name', value: 'CvPage' },
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'cv' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'experience' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'cvExperienceId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'roleDe' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'roleEn' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'companyDe' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'companyEn' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'startDate' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'endDate' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'descriptionDe' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'descriptionEn' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'technologies' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'managerName' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'position' } },
                                        ],
                                    },
                                },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'education' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'cvEducationId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'degreeDe' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'degreeEn' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'institutionDe' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'institutionEn' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'subjectDe' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'subjectEn' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'startDate' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'endDate' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'notesDe' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'notesEn' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'position' } },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCCvPageQuery, GqlCCvPageQueryVariables>;
export const AboutPageDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'query',
            name: { kind: 'Name', value: 'AboutPage' },
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'cv' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'skills' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'cvSkillId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'category' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'label' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'position' } },
                                        ],
                                    },
                                },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'hobbies' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'cvHobbyId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'textDe' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'textEn' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'since' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'position' } },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCAboutPageQuery, GqlCAboutPageQueryVariables>;
export const HomePageDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'query',
            name: { kind: 'Name', value: 'HomePage' },
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'currentSession' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                { kind: 'Field', name: { kind: 'Name', value: 'sessionId' } },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'user' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [{ kind: 'Field', name: { kind: 'Name', value: 'name' } }],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCHomePageQuery, GqlCHomePageQueryVariables>;
export const WorkspaceVisitorChatsDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'query',
            name: { kind: 'Name', value: 'WorkspaceVisitorChats' },
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'currentSession' },
                        selectionSet: { kind: 'SelectionSet', selections: [{ kind: 'Field', name: { kind: 'Name', value: 'sessionId' } }] },
                    },
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'admin' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'publicChats' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'chatId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'title' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'lastModifiedAt' } },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceVisitorChatsQuery, GqlCWorkspaceVisitorChatsQueryVariables>;
export const WorkspaceVisitorChatDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'query',
            name: { kind: 'Name', value: 'WorkspaceVisitorChat' },
            variableDefinitions: [
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'chatId' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } } },
                },
            ],
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'currentSession' },
                        selectionSet: { kind: 'SelectionSet', selections: [{ kind: 'Field', name: { kind: 'Name', value: 'sessionId' } }] },
                    },
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'admin' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'publicChat' },
                                    arguments: [
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'chatId' },
                                            value: { kind: 'Variable', name: { kind: 'Name', value: 'chatId' } },
                                        },
                                    ],
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'chatId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'title' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'lastModifiedAt' } },
                                            {
                                                kind: 'Field',
                                                name: { kind: 'Name', value: 'messages' },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        {
                                                            kind: 'FragmentSpread',
                                                            name: { kind: 'Name', value: 'WorkspaceChatMessageFields' },
                                                        },
                                                    ],
                                                },
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
        {
            kind: 'FragmentDefinition',
            name: { kind: 'Name', value: 'WorkspaceChatMessageGeneration' },
            typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessageGeneration' } },
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    { kind: 'Field', name: { kind: 'Name', value: 'modelId' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'inputTokens' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'outputTokens' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'totalTokens' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'reasoningTokens' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'cachedInputTokens' } },
                ],
            },
        },
        {
            kind: 'FragmentDefinition',
            name: { kind: 'Name', value: 'WorkspaceChatMessageFields' },
            typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessage' } },
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    { kind: 'Field', name: { kind: 'Name', value: '__typename' } },
                    {
                        kind: 'InlineFragment',
                        typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessageUser' } },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                { kind: 'Field', name: { kind: 'Name', value: 'chatMessageId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'body' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'author' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'userId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                                        ],
                                    },
                                },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'attachments' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'fileUploadId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'filename' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'mediaType' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'size' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'url' } },
                                        ],
                                    },
                                },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'profileObservations' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'observationId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'category' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'content' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'confidence' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                    {
                        kind: 'InlineFragment',
                        typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessageAssistantText' } },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                { kind: 'Field', name: { kind: 'Name', value: 'chatMessageId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'body' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'generation' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'FragmentSpread', name: { kind: 'Name', value: 'WorkspaceChatMessageGeneration' } },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                    {
                        kind: 'InlineFragment',
                        typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessageToolCall' } },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                { kind: 'Field', name: { kind: 'Name', value: 'chatMessageId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'toolName' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'args' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'parentChatMessageId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                            ],
                        },
                    },
                    {
                        kind: 'InlineFragment',
                        typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessageToolApprovalRequest' } },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                { kind: 'Field', name: { kind: 'Name', value: 'chatMessageId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'approvalId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'toolName' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'args' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'generation' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'FragmentSpread', name: { kind: 'Name', value: 'WorkspaceChatMessageGeneration' } },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                    {
                        kind: 'InlineFragment',
                        typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessageToolApprovalResponse' } },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                { kind: 'Field', name: { kind: 'Name', value: 'chatMessageId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'approvalId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'approved' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'reason' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                            ],
                        },
                    },
                    {
                        kind: 'InlineFragment',
                        typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessageAssistantInputCollection' } },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                { kind: 'Field', name: { kind: 'Name', value: 'chatMessageId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'mode' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'generation' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'FragmentSpread', name: { kind: 'Name', value: 'WorkspaceChatMessageGeneration' } },
                                        ],
                                    },
                                },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'inputs' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: '__typename' } },
                                            {
                                                kind: 'InlineFragment',
                                                typeCondition: {
                                                    kind: 'NamedType',
                                                    name: { kind: 'Name', value: 'ChatAssistantInputDate' },
                                                },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                                    ],
                                                },
                                            },
                                            {
                                                kind: 'InlineFragment',
                                                typeCondition: {
                                                    kind: 'NamedType',
                                                    name: { kind: 'Name', value: 'ChatAssistantInputDateRange' },
                                                },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                                    ],
                                                },
                                            },
                                            {
                                                kind: 'InlineFragment',
                                                typeCondition: {
                                                    kind: 'NamedType',
                                                    name: { kind: 'Name', value: 'ChatAssistantInputDateTime' },
                                                },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                                    ],
                                                },
                                            },
                                            {
                                                kind: 'InlineFragment',
                                                typeCondition: {
                                                    kind: 'NamedType',
                                                    name: { kind: 'Name', value: 'ChatAssistantInputTime' },
                                                },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                                    ],
                                                },
                                            },
                                            {
                                                kind: 'InlineFragment',
                                                typeCondition: {
                                                    kind: 'NamedType',
                                                    name: { kind: 'Name', value: 'ChatAssistantInputSingleSelect' },
                                                },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'options' } },
                                                    ],
                                                },
                                            },
                                            {
                                                kind: 'InlineFragment',
                                                typeCondition: {
                                                    kind: 'NamedType',
                                                    name: { kind: 'Name', value: 'ChatAssistantInputMultiSelect' },
                                                },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'options' } },
                                                    ],
                                                },
                                            },
                                            {
                                                kind: 'InlineFragment',
                                                typeCondition: {
                                                    kind: 'NamedType',
                                                    name: { kind: 'Name', value: 'ChatAssistantInputBoolean' },
                                                },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                                    ],
                                                },
                                            },
                                            {
                                                kind: 'InlineFragment',
                                                typeCondition: {
                                                    kind: 'NamedType',
                                                    name: { kind: 'Name', value: 'ChatAssistantInputText' },
                                                },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                                    ],
                                                },
                                            },
                                            {
                                                kind: 'InlineFragment',
                                                typeCondition: {
                                                    kind: 'NamedType',
                                                    name: { kind: 'Name', value: 'ChatAssistantInputOtp' },
                                                },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                                    ],
                                                },
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                    {
                        kind: 'InlineFragment',
                        typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessageUserInput' } },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                { kind: 'Field', name: { kind: 'Name', value: 'chatMessageId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'collectionMessageId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'author' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'userId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                                        ],
                                    },
                                },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'answers' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                            {
                                                kind: 'Field',
                                                name: { kind: 'Name', value: 'value' },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: '__typename' } },
                                                        {
                                                            kind: 'InlineFragment',
                                                            typeCondition: {
                                                                kind: 'NamedType',
                                                                name: { kind: 'Name', value: 'ChatAssistantInputValueDate' },
                                                            },
                                                            selectionSet: {
                                                                kind: 'SelectionSet',
                                                                selections: [{ kind: 'Field', name: { kind: 'Name', value: 'date' } }],
                                                            },
                                                        },
                                                        {
                                                            kind: 'InlineFragment',
                                                            typeCondition: {
                                                                kind: 'NamedType',
                                                                name: { kind: 'Name', value: 'ChatAssistantInputValueDateRange' },
                                                            },
                                                            selectionSet: {
                                                                kind: 'SelectionSet',
                                                                selections: [
                                                                    { kind: 'Field', name: { kind: 'Name', value: 'from' } },
                                                                    { kind: 'Field', name: { kind: 'Name', value: 'to' } },
                                                                ],
                                                            },
                                                        },
                                                        {
                                                            kind: 'InlineFragment',
                                                            typeCondition: {
                                                                kind: 'NamedType',
                                                                name: { kind: 'Name', value: 'ChatAssistantInputValueDateTime' },
                                                            },
                                                            selectionSet: {
                                                                kind: 'SelectionSet',
                                                                selections: [{ kind: 'Field', name: { kind: 'Name', value: 'dateTime' } }],
                                                            },
                                                        },
                                                        {
                                                            kind: 'InlineFragment',
                                                            typeCondition: {
                                                                kind: 'NamedType',
                                                                name: { kind: 'Name', value: 'ChatAssistantInputValueTime' },
                                                            },
                                                            selectionSet: {
                                                                kind: 'SelectionSet',
                                                                selections: [{ kind: 'Field', name: { kind: 'Name', value: 'time' } }],
                                                            },
                                                        },
                                                        {
                                                            kind: 'InlineFragment',
                                                            typeCondition: {
                                                                kind: 'NamedType',
                                                                name: { kind: 'Name', value: 'ChatAssistantInputValueString' },
                                                            },
                                                            selectionSet: {
                                                                kind: 'SelectionSet',
                                                                selections: [{ kind: 'Field', name: { kind: 'Name', value: 'value' } }],
                                                            },
                                                        },
                                                        {
                                                            kind: 'InlineFragment',
                                                            typeCondition: {
                                                                kind: 'NamedType',
                                                                name: { kind: 'Name', value: 'ChatAssistantInputValueStringList' },
                                                            },
                                                            selectionSet: {
                                                                kind: 'SelectionSet',
                                                                selections: [{ kind: 'Field', name: { kind: 'Name', value: 'values' } }],
                                                            },
                                                        },
                                                        {
                                                            kind: 'InlineFragment',
                                                            typeCondition: {
                                                                kind: 'NamedType',
                                                                name: { kind: 'Name', value: 'ChatAssistantInputValueBoolean' },
                                                            },
                                                            selectionSet: {
                                                                kind: 'SelectionSet',
                                                                selections: [{ kind: 'Field', name: { kind: 'Name', value: 'boolean' } }],
                                                            },
                                                        },
                                                    ],
                                                },
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceVisitorChatQuery, GqlCWorkspaceVisitorChatQueryVariables>;
export const WorkspaceAssistantChatsDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'query',
            name: { kind: 'Name', value: 'WorkspaceAssistantChats' },
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'admin' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'chats' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [{ kind: 'FragmentSpread', name: { kind: 'Name', value: 'WorkspaceChatListItem' } }],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
        {
            kind: 'FragmentDefinition',
            name: { kind: 'Name', value: 'WorkspaceChatListItem' },
            typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'Chat' } },
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    { kind: 'Field', name: { kind: 'Name', value: 'chatId' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'title' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'lastModifiedAt' } },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceAssistantChatsQuery, GqlCWorkspaceAssistantChatsQueryVariables>;
export const WorkspaceChatPageDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'query',
            name: { kind: 'Name', value: 'WorkspaceChatPage' },
            variableDefinitions: [
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'chatId' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } } },
                },
            ],
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'currentSession' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                { kind: 'Field', name: { kind: 'Name', value: 'sessionId' } },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'user' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'userId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'admin' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'chat' },
                                    arguments: [
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'chatId' },
                                            value: { kind: 'Variable', name: { kind: 'Name', value: 'chatId' } },
                                        },
                                    ],
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'chatId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'title' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'lastModifiedAt' } },
                                            {
                                                kind: 'Field',
                                                name: { kind: 'Name', value: 'messages' },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        {
                                                            kind: 'FragmentSpread',
                                                            name: { kind: 'Name', value: 'WorkspaceChatMessageFields' },
                                                        },
                                                    ],
                                                },
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
        {
            kind: 'FragmentDefinition',
            name: { kind: 'Name', value: 'WorkspaceChatMessageGeneration' },
            typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessageGeneration' } },
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    { kind: 'Field', name: { kind: 'Name', value: 'modelId' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'inputTokens' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'outputTokens' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'totalTokens' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'reasoningTokens' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'cachedInputTokens' } },
                ],
            },
        },
        {
            kind: 'FragmentDefinition',
            name: { kind: 'Name', value: 'WorkspaceChatMessageFields' },
            typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessage' } },
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    { kind: 'Field', name: { kind: 'Name', value: '__typename' } },
                    {
                        kind: 'InlineFragment',
                        typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessageUser' } },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                { kind: 'Field', name: { kind: 'Name', value: 'chatMessageId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'body' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'author' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'userId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                                        ],
                                    },
                                },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'attachments' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'fileUploadId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'filename' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'mediaType' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'size' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'url' } },
                                        ],
                                    },
                                },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'profileObservations' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'observationId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'category' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'content' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'confidence' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                    {
                        kind: 'InlineFragment',
                        typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessageAssistantText' } },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                { kind: 'Field', name: { kind: 'Name', value: 'chatMessageId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'body' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'generation' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'FragmentSpread', name: { kind: 'Name', value: 'WorkspaceChatMessageGeneration' } },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                    {
                        kind: 'InlineFragment',
                        typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessageToolCall' } },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                { kind: 'Field', name: { kind: 'Name', value: 'chatMessageId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'toolName' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'args' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'parentChatMessageId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                            ],
                        },
                    },
                    {
                        kind: 'InlineFragment',
                        typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessageToolApprovalRequest' } },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                { kind: 'Field', name: { kind: 'Name', value: 'chatMessageId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'approvalId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'toolName' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'args' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'generation' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'FragmentSpread', name: { kind: 'Name', value: 'WorkspaceChatMessageGeneration' } },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                    {
                        kind: 'InlineFragment',
                        typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessageToolApprovalResponse' } },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                { kind: 'Field', name: { kind: 'Name', value: 'chatMessageId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'approvalId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'approved' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'reason' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                            ],
                        },
                    },
                    {
                        kind: 'InlineFragment',
                        typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessageAssistantInputCollection' } },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                { kind: 'Field', name: { kind: 'Name', value: 'chatMessageId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'mode' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'generation' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'FragmentSpread', name: { kind: 'Name', value: 'WorkspaceChatMessageGeneration' } },
                                        ],
                                    },
                                },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'inputs' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: '__typename' } },
                                            {
                                                kind: 'InlineFragment',
                                                typeCondition: {
                                                    kind: 'NamedType',
                                                    name: { kind: 'Name', value: 'ChatAssistantInputDate' },
                                                },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                                    ],
                                                },
                                            },
                                            {
                                                kind: 'InlineFragment',
                                                typeCondition: {
                                                    kind: 'NamedType',
                                                    name: { kind: 'Name', value: 'ChatAssistantInputDateRange' },
                                                },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                                    ],
                                                },
                                            },
                                            {
                                                kind: 'InlineFragment',
                                                typeCondition: {
                                                    kind: 'NamedType',
                                                    name: { kind: 'Name', value: 'ChatAssistantInputDateTime' },
                                                },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                                    ],
                                                },
                                            },
                                            {
                                                kind: 'InlineFragment',
                                                typeCondition: {
                                                    kind: 'NamedType',
                                                    name: { kind: 'Name', value: 'ChatAssistantInputTime' },
                                                },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                                    ],
                                                },
                                            },
                                            {
                                                kind: 'InlineFragment',
                                                typeCondition: {
                                                    kind: 'NamedType',
                                                    name: { kind: 'Name', value: 'ChatAssistantInputSingleSelect' },
                                                },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'options' } },
                                                    ],
                                                },
                                            },
                                            {
                                                kind: 'InlineFragment',
                                                typeCondition: {
                                                    kind: 'NamedType',
                                                    name: { kind: 'Name', value: 'ChatAssistantInputMultiSelect' },
                                                },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'options' } },
                                                    ],
                                                },
                                            },
                                            {
                                                kind: 'InlineFragment',
                                                typeCondition: {
                                                    kind: 'NamedType',
                                                    name: { kind: 'Name', value: 'ChatAssistantInputBoolean' },
                                                },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                                    ],
                                                },
                                            },
                                            {
                                                kind: 'InlineFragment',
                                                typeCondition: {
                                                    kind: 'NamedType',
                                                    name: { kind: 'Name', value: 'ChatAssistantInputText' },
                                                },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                                    ],
                                                },
                                            },
                                            {
                                                kind: 'InlineFragment',
                                                typeCondition: {
                                                    kind: 'NamedType',
                                                    name: { kind: 'Name', value: 'ChatAssistantInputOtp' },
                                                },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                                    ],
                                                },
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                    {
                        kind: 'InlineFragment',
                        typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessageUserInput' } },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                { kind: 'Field', name: { kind: 'Name', value: 'chatMessageId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'collectionMessageId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'author' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'userId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                                        ],
                                    },
                                },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'answers' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                            {
                                                kind: 'Field',
                                                name: { kind: 'Name', value: 'value' },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: '__typename' } },
                                                        {
                                                            kind: 'InlineFragment',
                                                            typeCondition: {
                                                                kind: 'NamedType',
                                                                name: { kind: 'Name', value: 'ChatAssistantInputValueDate' },
                                                            },
                                                            selectionSet: {
                                                                kind: 'SelectionSet',
                                                                selections: [{ kind: 'Field', name: { kind: 'Name', value: 'date' } }],
                                                            },
                                                        },
                                                        {
                                                            kind: 'InlineFragment',
                                                            typeCondition: {
                                                                kind: 'NamedType',
                                                                name: { kind: 'Name', value: 'ChatAssistantInputValueDateRange' },
                                                            },
                                                            selectionSet: {
                                                                kind: 'SelectionSet',
                                                                selections: [
                                                                    { kind: 'Field', name: { kind: 'Name', value: 'from' } },
                                                                    { kind: 'Field', name: { kind: 'Name', value: 'to' } },
                                                                ],
                                                            },
                                                        },
                                                        {
                                                            kind: 'InlineFragment',
                                                            typeCondition: {
                                                                kind: 'NamedType',
                                                                name: { kind: 'Name', value: 'ChatAssistantInputValueDateTime' },
                                                            },
                                                            selectionSet: {
                                                                kind: 'SelectionSet',
                                                                selections: [{ kind: 'Field', name: { kind: 'Name', value: 'dateTime' } }],
                                                            },
                                                        },
                                                        {
                                                            kind: 'InlineFragment',
                                                            typeCondition: {
                                                                kind: 'NamedType',
                                                                name: { kind: 'Name', value: 'ChatAssistantInputValueTime' },
                                                            },
                                                            selectionSet: {
                                                                kind: 'SelectionSet',
                                                                selections: [{ kind: 'Field', name: { kind: 'Name', value: 'time' } }],
                                                            },
                                                        },
                                                        {
                                                            kind: 'InlineFragment',
                                                            typeCondition: {
                                                                kind: 'NamedType',
                                                                name: { kind: 'Name', value: 'ChatAssistantInputValueString' },
                                                            },
                                                            selectionSet: {
                                                                kind: 'SelectionSet',
                                                                selections: [{ kind: 'Field', name: { kind: 'Name', value: 'value' } }],
                                                            },
                                                        },
                                                        {
                                                            kind: 'InlineFragment',
                                                            typeCondition: {
                                                                kind: 'NamedType',
                                                                name: { kind: 'Name', value: 'ChatAssistantInputValueStringList' },
                                                            },
                                                            selectionSet: {
                                                                kind: 'SelectionSet',
                                                                selections: [{ kind: 'Field', name: { kind: 'Name', value: 'values' } }],
                                                            },
                                                        },
                                                        {
                                                            kind: 'InlineFragment',
                                                            typeCondition: {
                                                                kind: 'NamedType',
                                                                name: { kind: 'Name', value: 'ChatAssistantInputValueBoolean' },
                                                            },
                                                            selectionSet: {
                                                                kind: 'SelectionSet',
                                                                selections: [{ kind: 'Field', name: { kind: 'Name', value: 'boolean' } }],
                                                            },
                                                        },
                                                    ],
                                                },
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceChatPageQuery, GqlCWorkspaceChatPageQueryVariables>;
export const WorkspaceChatMessageCreateDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'mutation',
            name: { kind: 'Name', value: 'WorkspaceChatMessageCreate' },
            variableDefinitions: [
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'chatId' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'message' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'fileUploadIds' } },
                    type: {
                        kind: 'ListType',
                        type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } } },
                    },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'generationId' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'requireToolCallApprovals' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'Boolean' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'modelId' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
                },
            ],
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'admin' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'chatMessageCreate' },
                                    arguments: [
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'chatId' },
                                            value: { kind: 'Variable', name: { kind: 'Name', value: 'chatId' } },
                                        },
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'message' },
                                            value: { kind: 'Variable', name: { kind: 'Name', value: 'message' } },
                                        },
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'fileUploadIds' },
                                            value: { kind: 'Variable', name: { kind: 'Name', value: 'fileUploadIds' } },
                                        },
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'assistantOptions' },
                                            value: {
                                                kind: 'ObjectValue',
                                                fields: [
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'generationId' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'generationId' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'requireToolCallApprovals' },
                                                        value: {
                                                            kind: 'Variable',
                                                            name: { kind: 'Name', value: 'requireToolCallApprovals' },
                                                        },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'modelId' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'modelId' } },
                                                    },
                                                ],
                                            },
                                        },
                                    ],
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'chatId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'chatMessageId' } },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceChatMessageCreateMutation, GqlCWorkspaceChatMessageCreateMutationVariables>;
export const WorkspaceChatInputCollectionRespondDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'mutation',
            name: { kind: 'Name', value: 'WorkspaceChatInputCollectionRespond' },
            variableDefinitions: [
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'collectionMessageId' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'answers' } },
                    type: {
                        kind: 'NonNullType',
                        type: {
                            kind: 'ListType',
                            type: {
                                kind: 'NonNullType',
                                type: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessageUserInputAnswerCreate' } },
                            },
                        },
                    },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'generationId' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'requireToolCallApprovals' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'Boolean' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'modelId' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
                },
            ],
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'admin' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'chatInputCollectionRespond' },
                                    arguments: [
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'collectionMessageId' },
                                            value: { kind: 'Variable', name: { kind: 'Name', value: 'collectionMessageId' } },
                                        },
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'answers' },
                                            value: { kind: 'Variable', name: { kind: 'Name', value: 'answers' } },
                                        },
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'assistantOptions' },
                                            value: {
                                                kind: 'ObjectValue',
                                                fields: [
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'generationId' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'generationId' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'requireToolCallApprovals' },
                                                        value: {
                                                            kind: 'Variable',
                                                            name: { kind: 'Name', value: 'requireToolCallApprovals' },
                                                        },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'modelId' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'modelId' } },
                                                    },
                                                ],
                                            },
                                        },
                                    ],
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'chatId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'chatMessageId' } },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceChatInputCollectionRespondMutation, GqlCWorkspaceChatInputCollectionRespondMutationVariables>;
export const WorkspaceChatToolApprovalRespondDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'mutation',
            name: { kind: 'Name', value: 'WorkspaceChatToolApprovalRespond' },
            variableDefinitions: [
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'approvalId' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'approved' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'Boolean' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'reason' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'generationId' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'requireToolCallApprovals' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'Boolean' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'modelId' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
                },
            ],
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'admin' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'chatToolApprovalRespond' },
                                    arguments: [
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'approvalId' },
                                            value: { kind: 'Variable', name: { kind: 'Name', value: 'approvalId' } },
                                        },
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'approved' },
                                            value: { kind: 'Variable', name: { kind: 'Name', value: 'approved' } },
                                        },
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'reason' },
                                            value: { kind: 'Variable', name: { kind: 'Name', value: 'reason' } },
                                        },
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'assistantOptions' },
                                            value: {
                                                kind: 'ObjectValue',
                                                fields: [
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'generationId' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'generationId' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'requireToolCallApprovals' },
                                                        value: {
                                                            kind: 'Variable',
                                                            name: { kind: 'Name', value: 'requireToolCallApprovals' },
                                                        },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'modelId' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'modelId' } },
                                                    },
                                                ],
                                            },
                                        },
                                    ],
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'chatId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'chatMessageId' } },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceChatToolApprovalRespondMutation, GqlCWorkspaceChatToolApprovalRespondMutationVariables>;
export const WorkspaceChatConfigDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'query',
            name: { kind: 'Name', value: 'WorkspaceChatConfig' },
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'admin' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'chatConfig' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            {
                                                kind: 'Field',
                                                name: { kind: 'Name', value: 'availableModels' },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'modelId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'label' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'supportedMediaTypes' } },
                                                    ],
                                                },
                                            },
                                            { kind: 'Field', name: { kind: 'Name', value: 'defaultModelId' } },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceChatConfigQuery, GqlCWorkspaceChatConfigQueryVariables>;
export const WorkspaceChatConfigDefaultModelSetDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'mutation',
            name: { kind: 'Name', value: 'WorkspaceChatConfigDefaultModelSet' },
            variableDefinitions: [
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'modelId' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } } },
                },
            ],
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'admin' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'chatConfigDefaultModelSet' },
                                    arguments: [
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'modelId' },
                                            value: { kind: 'Variable', name: { kind: 'Name', value: 'modelId' } },
                                        },
                                    ],
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'success' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'referenceId' } },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceChatConfigDefaultModelSetMutation, GqlCWorkspaceChatConfigDefaultModelSetMutationVariables>;
export const WorkspaceProfilePageDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'query',
            name: { kind: 'Name', value: 'WorkspaceProfilePage' },
            variableDefinitions: [
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'category' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'ProfileObservationCategory' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'includeDismissed' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'Boolean' } },
                },
            ],
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'admin' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'profile' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'summary' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'prose' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'psychProfile' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'synthesizedAt' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'synthesisModelId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'observationsSinceSynthesis' } },
                                            {
                                                kind: 'Field',
                                                name: { kind: 'Name', value: 'observations' },
                                                arguments: [
                                                    {
                                                        kind: 'Argument',
                                                        name: { kind: 'Name', value: 'category' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'category' } },
                                                    },
                                                    {
                                                        kind: 'Argument',
                                                        name: { kind: 'Name', value: 'includeDismissed' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'includeDismissed' } },
                                                    },
                                                ],
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        {
                                                            kind: 'FragmentSpread',
                                                            name: { kind: 'Name', value: 'WorkspaceProfileObservation' },
                                                        },
                                                    ],
                                                },
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
        {
            kind: 'FragmentDefinition',
            name: { kind: 'Name', value: 'WorkspaceProfileObservation' },
            typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ProfileObservation' } },
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    { kind: 'Field', name: { kind: 'Name', value: 'observationId' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'category' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'content' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'confidence' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'sourceChatId' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'sourceChatMessageId' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'analyzerModelId' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'dismissedAt' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceProfilePageQuery, GqlCWorkspaceProfilePageQueryVariables>;
export const WorkspaceProfileObservationDismissDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'mutation',
            name: { kind: 'Name', value: 'WorkspaceProfileObservationDismiss' },
            variableDefinitions: [
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'observationId' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } } },
                },
            ],
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'admin' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'profileObservationDismiss' },
                                    arguments: [
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'observationId' },
                                            value: { kind: 'Variable', name: { kind: 'Name', value: 'observationId' } },
                                        },
                                    ],
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [{ kind: 'Field', name: { kind: 'Name', value: 'success' } }],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceProfileObservationDismissMutation, GqlCWorkspaceProfileObservationDismissMutationVariables>;
export const WorkspaceProfileSynthesizeRequestDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'mutation',
            name: { kind: 'Name', value: 'WorkspaceProfileSynthesizeRequest' },
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'admin' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'profileSynthesizeRequest' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'success' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'referenceId' } },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceProfileSynthesizeRequestMutation, GqlCWorkspaceProfileSynthesizeRequestMutationVariables>;
export const WorkspaceCvPageDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'query',
            name: { kind: 'Name', value: 'WorkspaceCvPage' },
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'cv' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'experience' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'cvExperienceId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'roleDe' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'roleEn' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'companyDe' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'companyEn' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'startDate' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'endDate' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'descriptionDe' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'descriptionEn' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'technologies' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'managerName' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'position' } },
                                        ],
                                    },
                                },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'education' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'cvEducationId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'degreeDe' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'degreeEn' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'institutionDe' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'institutionEn' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'subjectDe' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'subjectEn' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'startDate' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'endDate' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'notesDe' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'notesEn' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'position' } },
                                        ],
                                    },
                                },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'skills' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'cvSkillId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'category' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'label' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'position' } },
                                        ],
                                    },
                                },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'hobbies' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'cvHobbyId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'textDe' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'textEn' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'since' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'position' } },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceCvPageQuery, GqlCWorkspaceCvPageQueryVariables>;
export const WorkspaceCvExperienceUpsertDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'mutation',
            name: { kind: 'Name', value: 'WorkspaceCvExperienceUpsert' },
            variableDefinitions: [
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'cvExperienceId' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'roleDe' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'roleEn' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'companyDe' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'companyEn' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'startDate' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'Date' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'endDate' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'Date' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'descriptionDe' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'descriptionEn' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'technologies' } },
                    type: {
                        kind: 'NonNullType',
                        type: {
                            kind: 'ListType',
                            type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } } },
                        },
                    },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'managerName' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'position' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } } },
                },
            ],
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'admin' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'cvExperienceUpsert' },
                                    arguments: [
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'input' },
                                            value: {
                                                kind: 'ObjectValue',
                                                fields: [
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'cvExperienceId' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'cvExperienceId' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'roleDe' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'roleDe' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'roleEn' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'roleEn' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'companyDe' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'companyDe' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'companyEn' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'companyEn' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'startDate' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'startDate' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'endDate' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'endDate' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'descriptionDe' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'descriptionDe' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'descriptionEn' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'descriptionEn' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'technologies' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'technologies' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'managerName' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'managerName' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'position' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'position' } },
                                                    },
                                                ],
                                            },
                                        },
                                    ],
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [{ kind: 'Field', name: { kind: 'Name', value: 'cvExperienceId' } }],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceCvExperienceUpsertMutation, GqlCWorkspaceCvExperienceUpsertMutationVariables>;
export const WorkspaceCvExperienceDeleteDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'mutation',
            name: { kind: 'Name', value: 'WorkspaceCvExperienceDelete' },
            variableDefinitions: [
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'cvExperienceId' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } } },
                },
            ],
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'admin' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'cvExperienceDelete' },
                                    arguments: [
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'cvExperienceId' },
                                            value: { kind: 'Variable', name: { kind: 'Name', value: 'cvExperienceId' } },
                                        },
                                    ],
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [{ kind: 'Field', name: { kind: 'Name', value: 'success' } }],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceCvExperienceDeleteMutation, GqlCWorkspaceCvExperienceDeleteMutationVariables>;
export const WorkspaceCvEducationUpsertDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'mutation',
            name: { kind: 'Name', value: 'WorkspaceCvEducationUpsert' },
            variableDefinitions: [
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'cvEducationId' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'degreeDe' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'degreeEn' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'institutionDe' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'institutionEn' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'subjectDe' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'subjectEn' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'startDate' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'Date' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'endDate' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'Date' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'notesDe' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'notesEn' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'position' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } } },
                },
            ],
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'admin' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'cvEducationUpsert' },
                                    arguments: [
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'input' },
                                            value: {
                                                kind: 'ObjectValue',
                                                fields: [
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'cvEducationId' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'cvEducationId' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'degreeDe' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'degreeDe' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'degreeEn' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'degreeEn' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'institutionDe' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'institutionDe' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'institutionEn' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'institutionEn' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'subjectDe' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'subjectDe' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'subjectEn' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'subjectEn' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'startDate' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'startDate' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'endDate' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'endDate' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'notesDe' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'notesDe' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'notesEn' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'notesEn' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'position' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'position' } },
                                                    },
                                                ],
                                            },
                                        },
                                    ],
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [{ kind: 'Field', name: { kind: 'Name', value: 'cvEducationId' } }],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceCvEducationUpsertMutation, GqlCWorkspaceCvEducationUpsertMutationVariables>;
export const WorkspaceCvEducationDeleteDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'mutation',
            name: { kind: 'Name', value: 'WorkspaceCvEducationDelete' },
            variableDefinitions: [
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'cvEducationId' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } } },
                },
            ],
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'admin' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'cvEducationDelete' },
                                    arguments: [
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'cvEducationId' },
                                            value: { kind: 'Variable', name: { kind: 'Name', value: 'cvEducationId' } },
                                        },
                                    ],
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [{ kind: 'Field', name: { kind: 'Name', value: 'success' } }],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceCvEducationDeleteMutation, GqlCWorkspaceCvEducationDeleteMutationVariables>;
export const WorkspaceCvSkillUpsertDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'mutation',
            name: { kind: 'Name', value: 'WorkspaceCvSkillUpsert' },
            variableDefinitions: [
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'cvSkillId' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'category' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'CvSkillCategory' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'label' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'position' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } } },
                },
            ],
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'admin' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'cvSkillUpsert' },
                                    arguments: [
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'input' },
                                            value: {
                                                kind: 'ObjectValue',
                                                fields: [
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'cvSkillId' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'cvSkillId' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'category' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'category' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'label' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'label' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'position' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'position' } },
                                                    },
                                                ],
                                            },
                                        },
                                    ],
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [{ kind: 'Field', name: { kind: 'Name', value: 'cvSkillId' } }],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceCvSkillUpsertMutation, GqlCWorkspaceCvSkillUpsertMutationVariables>;
export const WorkspaceCvSkillDeleteDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'mutation',
            name: { kind: 'Name', value: 'WorkspaceCvSkillDelete' },
            variableDefinitions: [
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'cvSkillId' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } } },
                },
            ],
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'admin' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'cvSkillDelete' },
                                    arguments: [
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'cvSkillId' },
                                            value: { kind: 'Variable', name: { kind: 'Name', value: 'cvSkillId' } },
                                        },
                                    ],
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [{ kind: 'Field', name: { kind: 'Name', value: 'success' } }],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceCvSkillDeleteMutation, GqlCWorkspaceCvSkillDeleteMutationVariables>;
export const WorkspaceCvHobbyUpsertDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'mutation',
            name: { kind: 'Name', value: 'WorkspaceCvHobbyUpsert' },
            variableDefinitions: [
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'cvHobbyId' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'textDe' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'textEn' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'since' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'position' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } } },
                },
            ],
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'admin' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'cvHobbyUpsert' },
                                    arguments: [
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'input' },
                                            value: {
                                                kind: 'ObjectValue',
                                                fields: [
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'cvHobbyId' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'cvHobbyId' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'textDe' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'textDe' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'textEn' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'textEn' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'since' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'since' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'position' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'position' } },
                                                    },
                                                ],
                                            },
                                        },
                                    ],
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [{ kind: 'Field', name: { kind: 'Name', value: 'cvHobbyId' } }],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceCvHobbyUpsertMutation, GqlCWorkspaceCvHobbyUpsertMutationVariables>;
export const WorkspaceCvHobbyDeleteDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'mutation',
            name: { kind: 'Name', value: 'WorkspaceCvHobbyDelete' },
            variableDefinitions: [
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'cvHobbyId' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } } },
                },
            ],
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'admin' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'cvHobbyDelete' },
                                    arguments: [
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'cvHobbyId' },
                                            value: { kind: 'Variable', name: { kind: 'Name', value: 'cvHobbyId' } },
                                        },
                                    ],
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [{ kind: 'Field', name: { kind: 'Name', value: 'success' } }],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceCvHobbyDeleteMutation, GqlCWorkspaceCvHobbyDeleteMutationVariables>;
export const WorkspaceCvExperienceReorderDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'mutation',
            name: { kind: 'Name', value: 'WorkspaceCvExperienceReorder' },
            variableDefinitions: [
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'orderedIds' } },
                    type: {
                        kind: 'NonNullType',
                        type: {
                            kind: 'ListType',
                            type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } } },
                        },
                    },
                },
            ],
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'admin' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'cvExperienceReorder' },
                                    arguments: [
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'orderedIds' },
                                            value: { kind: 'Variable', name: { kind: 'Name', value: 'orderedIds' } },
                                        },
                                    ],
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [{ kind: 'Field', name: { kind: 'Name', value: 'success' } }],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceCvExperienceReorderMutation, GqlCWorkspaceCvExperienceReorderMutationVariables>;
export const WorkspaceCvEducationReorderDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'mutation',
            name: { kind: 'Name', value: 'WorkspaceCvEducationReorder' },
            variableDefinitions: [
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'orderedIds' } },
                    type: {
                        kind: 'NonNullType',
                        type: {
                            kind: 'ListType',
                            type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } } },
                        },
                    },
                },
            ],
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'admin' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'cvEducationReorder' },
                                    arguments: [
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'orderedIds' },
                                            value: { kind: 'Variable', name: { kind: 'Name', value: 'orderedIds' } },
                                        },
                                    ],
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [{ kind: 'Field', name: { kind: 'Name', value: 'success' } }],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceCvEducationReorderMutation, GqlCWorkspaceCvEducationReorderMutationVariables>;
export const WorkspaceCvSkillReorderDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'mutation',
            name: { kind: 'Name', value: 'WorkspaceCvSkillReorder' },
            variableDefinitions: [
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'orderedIds' } },
                    type: {
                        kind: 'NonNullType',
                        type: {
                            kind: 'ListType',
                            type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } } },
                        },
                    },
                },
            ],
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'admin' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'cvSkillReorder' },
                                    arguments: [
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'orderedIds' },
                                            value: { kind: 'Variable', name: { kind: 'Name', value: 'orderedIds' } },
                                        },
                                    ],
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [{ kind: 'Field', name: { kind: 'Name', value: 'success' } }],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceCvSkillReorderMutation, GqlCWorkspaceCvSkillReorderMutationVariables>;
export const WorkspaceCvHobbyReorderDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'mutation',
            name: { kind: 'Name', value: 'WorkspaceCvHobbyReorder' },
            variableDefinitions: [
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'orderedIds' } },
                    type: {
                        kind: 'NonNullType',
                        type: {
                            kind: 'ListType',
                            type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } } },
                        },
                    },
                },
            ],
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'admin' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'cvHobbyReorder' },
                                    arguments: [
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'orderedIds' },
                                            value: { kind: 'Variable', name: { kind: 'Name', value: 'orderedIds' } },
                                        },
                                    ],
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [{ kind: 'Field', name: { kind: 'Name', value: 'success' } }],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceCvHobbyReorderMutation, GqlCWorkspaceCvHobbyReorderMutationVariables>;
export const WorkspaceHubDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'query',
            name: { kind: 'Name', value: 'WorkspaceHub' },
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'admin' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [{ kind: 'Field', name: { kind: 'Name', value: 'projectRequestsInboxCount' } }],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceHubQuery, GqlCWorkspaceHubQueryVariables>;
export const WorkspaceProjectsPageDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'query',
            name: { kind: 'Name', value: 'WorkspaceProjectsPage' },
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'admin' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'projectRequests' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'projectRequestId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'chatId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'email' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'company' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'projectType' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'budget' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'timeline' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'status' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'verifiedAt' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                                            {
                                                kind: 'Field',
                                                name: { kind: 'Name', value: 'convertedProject' },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'title' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'status' } },
                                                    ],
                                                },
                                            },
                                        ],
                                    },
                                },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'projects' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'title' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'notes' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'status' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'position' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'startedAt' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'completedAt' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'totalWorkSec' } },
                                            {
                                                kind: 'Field',
                                                name: { kind: 'Name', value: 'sourceRequest' },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'projectRequestId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'email' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'company' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'projectType' } },
                                                    ],
                                                },
                                            },
                                            {
                                                kind: 'Field',
                                                name: { kind: 'Name', value: 'tasks' },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'taskId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'title' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'notes' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'status' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'position' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'dueAt' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'completedAt' } },
                                                    ],
                                                },
                                            },
                                            {
                                                kind: 'Field',
                                                name: { kind: 'Name', value: 'activities' },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'activityId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'taskId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'kind' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'channel' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'title' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'notes' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'occurredAt' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'startedAt' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'endedAt' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'durationSec' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                                                    ],
                                                },
                                            },
                                        ],
                                    },
                                },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'standaloneTasks' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'taskId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'title' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'notes' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'status' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'position' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'dueAt' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'completedAt' } },
                                        ],
                                    },
                                },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'activeTimer' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'activityId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'taskId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'kind' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'title' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'occurredAt' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'startedAt' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'endedAt' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'durationSec' } },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceProjectsPageQuery, GqlCWorkspaceProjectsPageQueryVariables>;
export const WorkspaceProjectRequestArchiveDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'mutation',
            name: { kind: 'Name', value: 'WorkspaceProjectRequestArchive' },
            variableDefinitions: [
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'projectRequestId' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } } },
                },
            ],
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'admin' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'projectRequestArchive' },
                                    arguments: [
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'projectRequestId' },
                                            value: { kind: 'Variable', name: { kind: 'Name', value: 'projectRequestId' } },
                                        },
                                    ],
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [{ kind: 'Field', name: { kind: 'Name', value: 'success' } }],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceProjectRequestArchiveMutation, GqlCWorkspaceProjectRequestArchiveMutationVariables>;
export const WorkspaceProjectRequestDeleteDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'mutation',
            name: { kind: 'Name', value: 'WorkspaceProjectRequestDelete' },
            variableDefinitions: [
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'projectRequestId' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } } },
                },
            ],
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'admin' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'projectRequestDelete' },
                                    arguments: [
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'projectRequestId' },
                                            value: { kind: 'Variable', name: { kind: 'Name', value: 'projectRequestId' } },
                                        },
                                    ],
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [{ kind: 'Field', name: { kind: 'Name', value: 'success' } }],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceProjectRequestDeleteMutation, GqlCWorkspaceProjectRequestDeleteMutationVariables>;
export const WorkspaceProjectUpsertDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'mutation',
            name: { kind: 'Name', value: 'WorkspaceProjectUpsert' },
            variableDefinitions: [
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'projectId' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'title' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'description' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'notes' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'status' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'ProjectStatus' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'position' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'sourceRequestId' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'startedAt' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'DateTime' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'completedAt' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'DateTime' } },
                },
            ],
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'admin' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'projectUpsert' },
                                    arguments: [
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'input' },
                                            value: {
                                                kind: 'ObjectValue',
                                                fields: [
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'projectId' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'projectId' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'title' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'title' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'description' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'description' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'notes' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'notes' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'status' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'status' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'position' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'position' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'sourceRequestId' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'sourceRequestId' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'startedAt' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'startedAt' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'completedAt' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'completedAt' } },
                                                    },
                                                ],
                                            },
                                        },
                                    ],
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [{ kind: 'Field', name: { kind: 'Name', value: 'projectId' } }],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceProjectUpsertMutation, GqlCWorkspaceProjectUpsertMutationVariables>;
export const WorkspaceProjectDeleteDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'mutation',
            name: { kind: 'Name', value: 'WorkspaceProjectDelete' },
            variableDefinitions: [
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'projectId' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } } },
                },
            ],
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'admin' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'projectDelete' },
                                    arguments: [
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'projectId' },
                                            value: { kind: 'Variable', name: { kind: 'Name', value: 'projectId' } },
                                        },
                                    ],
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [{ kind: 'Field', name: { kind: 'Name', value: 'success' } }],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceProjectDeleteMutation, GqlCWorkspaceProjectDeleteMutationVariables>;
export const WorkspaceProjectReorderDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'mutation',
            name: { kind: 'Name', value: 'WorkspaceProjectReorder' },
            variableDefinitions: [
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'orderedIds' } },
                    type: {
                        kind: 'NonNullType',
                        type: {
                            kind: 'ListType',
                            type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } } },
                        },
                    },
                },
            ],
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'admin' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'projectReorder' },
                                    arguments: [
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'orderedIds' },
                                            value: { kind: 'Variable', name: { kind: 'Name', value: 'orderedIds' } },
                                        },
                                    ],
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [{ kind: 'Field', name: { kind: 'Name', value: 'success' } }],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceProjectReorderMutation, GqlCWorkspaceProjectReorderMutationVariables>;
export const WorkspaceTaskUpsertDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'mutation',
            name: { kind: 'Name', value: 'WorkspaceTaskUpsert' },
            variableDefinitions: [
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'taskId' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'projectId' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'title' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'notes' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'status' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'TaskStatus' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'position' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'dueAt' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'DateTime' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'completedAt' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'DateTime' } },
                },
            ],
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'admin' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'taskUpsert' },
                                    arguments: [
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'input' },
                                            value: {
                                                kind: 'ObjectValue',
                                                fields: [
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'taskId' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'taskId' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'projectId' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'projectId' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'title' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'title' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'notes' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'notes' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'status' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'status' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'position' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'position' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'dueAt' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'dueAt' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'completedAt' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'completedAt' } },
                                                    },
                                                ],
                                            },
                                        },
                                    ],
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [{ kind: 'Field', name: { kind: 'Name', value: 'taskId' } }],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceTaskUpsertMutation, GqlCWorkspaceTaskUpsertMutationVariables>;
export const WorkspaceTaskDeleteDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'mutation',
            name: { kind: 'Name', value: 'WorkspaceTaskDelete' },
            variableDefinitions: [
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'taskId' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } } },
                },
            ],
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'admin' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'taskDelete' },
                                    arguments: [
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'taskId' },
                                            value: { kind: 'Variable', name: { kind: 'Name', value: 'taskId' } },
                                        },
                                    ],
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [{ kind: 'Field', name: { kind: 'Name', value: 'success' } }],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceTaskDeleteMutation, GqlCWorkspaceTaskDeleteMutationVariables>;
export const WorkspaceTaskReorderDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'mutation',
            name: { kind: 'Name', value: 'WorkspaceTaskReorder' },
            variableDefinitions: [
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'orderedIds' } },
                    type: {
                        kind: 'NonNullType',
                        type: {
                            kind: 'ListType',
                            type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } } },
                        },
                    },
                },
            ],
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'admin' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'taskReorder' },
                                    arguments: [
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'orderedIds' },
                                            value: { kind: 'Variable', name: { kind: 'Name', value: 'orderedIds' } },
                                        },
                                    ],
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [{ kind: 'Field', name: { kind: 'Name', value: 'success' } }],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceTaskReorderMutation, GqlCWorkspaceTaskReorderMutationVariables>;
export const WorkspaceProjectActivityUpsertDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'mutation',
            name: { kind: 'Name', value: 'WorkspaceProjectActivityUpsert' },
            variableDefinitions: [
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'activityId' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'projectId' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'taskId' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'kind' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'ProjectActivityKind' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'channel' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'ProjectActivityChannel' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'title' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'notes' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'occurredAt' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'DateTime' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'durationSec' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
                },
            ],
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'admin' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'projectActivityUpsert' },
                                    arguments: [
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'input' },
                                            value: {
                                                kind: 'ObjectValue',
                                                fields: [
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'activityId' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'activityId' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'projectId' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'projectId' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'taskId' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'taskId' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'kind' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'kind' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'channel' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'channel' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'title' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'title' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'notes' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'notes' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'occurredAt' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'occurredAt' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'durationSec' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'durationSec' } },
                                                    },
                                                ],
                                            },
                                        },
                                    ],
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [{ kind: 'Field', name: { kind: 'Name', value: 'activityId' } }],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceProjectActivityUpsertMutation, GqlCWorkspaceProjectActivityUpsertMutationVariables>;
export const WorkspaceProjectActivityDeleteDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'mutation',
            name: { kind: 'Name', value: 'WorkspaceProjectActivityDelete' },
            variableDefinitions: [
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'activityId' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } } },
                },
            ],
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'admin' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'projectActivityDelete' },
                                    arguments: [
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'activityId' },
                                            value: { kind: 'Variable', name: { kind: 'Name', value: 'activityId' } },
                                        },
                                    ],
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [{ kind: 'Field', name: { kind: 'Name', value: 'success' } }],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceProjectActivityDeleteMutation, GqlCWorkspaceProjectActivityDeleteMutationVariables>;
export const WorkspaceProjectTimerStartDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'mutation',
            name: { kind: 'Name', value: 'WorkspaceProjectTimerStart' },
            variableDefinitions: [
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'projectId' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'taskId' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'title' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
                },
            ],
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'admin' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'projectTimerStart' },
                                    arguments: [
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'projectId' },
                                            value: { kind: 'Variable', name: { kind: 'Name', value: 'projectId' } },
                                        },
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'taskId' },
                                            value: { kind: 'Variable', name: { kind: 'Name', value: 'taskId' } },
                                        },
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'title' },
                                            value: { kind: 'Variable', name: { kind: 'Name', value: 'title' } },
                                        },
                                    ],
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'activityId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'startedAt' } },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceProjectTimerStartMutation, GqlCWorkspaceProjectTimerStartMutationVariables>;
export const WorkspaceProjectTimerStopDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'mutation',
            name: { kind: 'Name', value: 'WorkspaceProjectTimerStop' },
            variableDefinitions: [
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'activityId' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } } },
                },
            ],
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'admin' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'projectTimerStop' },
                                    arguments: [
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'activityId' },
                                            value: { kind: 'Variable', name: { kind: 'Name', value: 'activityId' } },
                                        },
                                    ],
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'activityId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'endedAt' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'durationSec' } },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceProjectTimerStopMutation, GqlCWorkspaceProjectTimerStopMutationVariables>;
export const WorkspaceProjectDetailDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'query',
            name: { kind: 'Name', value: 'WorkspaceProjectDetail' },
            variableDefinitions: [
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'projectId' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } } },
                },
            ],
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'admin' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'activeTimer' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'activityId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'taskId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'kind' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'title' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'occurredAt' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'startedAt' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'endedAt' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'durationSec' } },
                                        ],
                                    },
                                },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'project' },
                                    arguments: [
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'projectId' },
                                            value: { kind: 'Variable', name: { kind: 'Name', value: 'projectId' } },
                                        },
                                    ],
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'title' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'notes' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'status' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'position' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'startedAt' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'completedAt' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'totalWorkSec' } },
                                            {
                                                kind: 'Field',
                                                name: { kind: 'Name', value: 'sourceRequest' },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'projectRequestId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'email' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'company' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'projectType' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'budget' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'timeline' } },
                                                    ],
                                                },
                                            },
                                            {
                                                kind: 'Field',
                                                name: { kind: 'Name', value: 'tasks' },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'taskId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'title' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'notes' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'status' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'position' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'dueAt' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'completedAt' } },
                                                    ],
                                                },
                                            },
                                            {
                                                kind: 'Field',
                                                name: { kind: 'Name', value: 'activities' },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'activityId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'taskId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'kind' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'channel' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'title' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'notes' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'occurredAt' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'startedAt' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'endedAt' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'durationSec' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'amountCents' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'offerStatus' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                                                        {
                                                            kind: 'Field',
                                                            name: { kind: 'Name', value: 'links' },
                                                            selectionSet: {
                                                                kind: 'SelectionSet',
                                                                selections: [
                                                                    { kind: 'Field', name: { kind: 'Name', value: 'projectLinkId' } },
                                                                    { kind: 'Field', name: { kind: 'Name', value: 'url' } },
                                                                    { kind: 'Field', name: { kind: 'Name', value: 'label' } },
                                                                    { kind: 'Field', name: { kind: 'Name', value: 'kind' } },
                                                                    { kind: 'Field', name: { kind: 'Name', value: 'pinned' } },
                                                                ],
                                                            },
                                                        },
                                                        {
                                                            kind: 'Field',
                                                            name: { kind: 'Name', value: 'files' },
                                                            selectionSet: {
                                                                kind: 'SelectionSet',
                                                                selections: [
                                                                    { kind: 'Field', name: { kind: 'Name', value: 'projectFileId' } },
                                                                    { kind: 'Field', name: { kind: 'Name', value: 'label' } },
                                                                    { kind: 'Field', name: { kind: 'Name', value: 'kind' } },
                                                                    { kind: 'Field', name: { kind: 'Name', value: 'pinned' } },
                                                                    {
                                                                        kind: 'Field',
                                                                        name: { kind: 'Name', value: 'fileUpload' },
                                                                        selectionSet: {
                                                                            kind: 'SelectionSet',
                                                                            selections: [
                                                                                {
                                                                                    kind: 'Field',
                                                                                    name: { kind: 'Name', value: 'fileUploadId' },
                                                                                },
                                                                                {
                                                                                    kind: 'Field',
                                                                                    name: { kind: 'Name', value: 'filename' },
                                                                                },
                                                                                {
                                                                                    kind: 'Field',
                                                                                    name: { kind: 'Name', value: 'mediaType' },
                                                                                },
                                                                                { kind: 'Field', name: { kind: 'Name', value: 'size' } },
                                                                                { kind: 'Field', name: { kind: 'Name', value: 'url' } },
                                                                            ],
                                                                        },
                                                                    },
                                                                ],
                                                            },
                                                        },
                                                    ],
                                                },
                                            },
                                            {
                                                kind: 'Field',
                                                name: { kind: 'Name', value: 'links' },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'projectLinkId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'activityId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'url' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'label' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'kind' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'pinned' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
                                                    ],
                                                },
                                            },
                                            {
                                                kind: 'Field',
                                                name: { kind: 'Name', value: 'files' },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'projectFileId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'activityId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'label' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'kind' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'pinned' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
                                                        {
                                                            kind: 'Field',
                                                            name: { kind: 'Name', value: 'fileUpload' },
                                                            selectionSet: {
                                                                kind: 'SelectionSet',
                                                                selections: [
                                                                    { kind: 'Field', name: { kind: 'Name', value: 'fileUploadId' } },
                                                                    { kind: 'Field', name: { kind: 'Name', value: 'filename' } },
                                                                    { kind: 'Field', name: { kind: 'Name', value: 'mediaType' } },
                                                                    { kind: 'Field', name: { kind: 'Name', value: 'size' } },
                                                                    { kind: 'Field', name: { kind: 'Name', value: 'url' } },
                                                                ],
                                                            },
                                                        },
                                                    ],
                                                },
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceProjectDetailQuery, GqlCWorkspaceProjectDetailQueryVariables>;
export const WorkspaceProjectDetailUpsertProjectDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'mutation',
            name: { kind: 'Name', value: 'WorkspaceProjectDetailUpsertProject' },
            variableDefinitions: [
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'projectId' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'title' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'description' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'notes' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'status' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'ProjectStatus' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'position' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'startedAt' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'DateTime' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'completedAt' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'DateTime' } },
                },
            ],
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'admin' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'projectUpsert' },
                                    arguments: [
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'input' },
                                            value: {
                                                kind: 'ObjectValue',
                                                fields: [
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'projectId' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'projectId' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'title' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'title' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'description' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'description' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'notes' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'notes' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'status' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'status' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'position' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'position' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'sourceRequestId' },
                                                        value: { kind: 'NullValue' },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'startedAt' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'startedAt' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'completedAt' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'completedAt' } },
                                                    },
                                                ],
                                            },
                                        },
                                    ],
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [{ kind: 'Field', name: { kind: 'Name', value: 'projectId' } }],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceProjectDetailUpsertProjectMutation, GqlCWorkspaceProjectDetailUpsertProjectMutationVariables>;
export const WorkspaceProjectDetailDeleteProjectDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'mutation',
            name: { kind: 'Name', value: 'WorkspaceProjectDetailDeleteProject' },
            variableDefinitions: [
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'projectId' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } } },
                },
            ],
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'admin' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'projectDelete' },
                                    arguments: [
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'projectId' },
                                            value: { kind: 'Variable', name: { kind: 'Name', value: 'projectId' } },
                                        },
                                    ],
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [{ kind: 'Field', name: { kind: 'Name', value: 'success' } }],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceProjectDetailDeleteProjectMutation, GqlCWorkspaceProjectDetailDeleteProjectMutationVariables>;
export const WorkspaceProjectDetailUpsertTaskDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'mutation',
            name: { kind: 'Name', value: 'WorkspaceProjectDetailUpsertTask' },
            variableDefinitions: [
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'taskId' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'projectId' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'title' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'notes' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'status' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'TaskStatus' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'position' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'dueAt' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'DateTime' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'completedAt' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'DateTime' } },
                },
            ],
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'admin' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'taskUpsert' },
                                    arguments: [
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'input' },
                                            value: {
                                                kind: 'ObjectValue',
                                                fields: [
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'taskId' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'taskId' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'projectId' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'projectId' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'title' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'title' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'notes' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'notes' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'status' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'status' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'position' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'position' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'dueAt' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'dueAt' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'completedAt' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'completedAt' } },
                                                    },
                                                ],
                                            },
                                        },
                                    ],
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [{ kind: 'Field', name: { kind: 'Name', value: 'taskId' } }],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceProjectDetailUpsertTaskMutation, GqlCWorkspaceProjectDetailUpsertTaskMutationVariables>;
export const WorkspaceProjectDetailDeleteTaskDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'mutation',
            name: { kind: 'Name', value: 'WorkspaceProjectDetailDeleteTask' },
            variableDefinitions: [
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'taskId' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } } },
                },
            ],
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'admin' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'taskDelete' },
                                    arguments: [
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'taskId' },
                                            value: { kind: 'Variable', name: { kind: 'Name', value: 'taskId' } },
                                        },
                                    ],
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [{ kind: 'Field', name: { kind: 'Name', value: 'success' } }],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceProjectDetailDeleteTaskMutation, GqlCWorkspaceProjectDetailDeleteTaskMutationVariables>;
export const WorkspaceProjectDetailUpsertActivityDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'mutation',
            name: { kind: 'Name', value: 'WorkspaceProjectDetailUpsertActivity' },
            variableDefinitions: [
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'activityId' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'projectId' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'taskId' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'kind' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'ProjectActivityKind' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'channel' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'ProjectActivityChannel' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'title' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'notes' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'occurredAt' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'DateTime' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'durationSec' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'amountCents' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'offerStatus' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'ProjectOfferStatus' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'attachLinkUrl' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'attachLinkKind' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'ProjectLinkKind' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'attachLinkLabel' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'attachLinkPinned' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'Boolean' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'attachFileUploadId' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'attachFileKind' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'ProjectFileKind' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'attachFileLabel' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'attachFilePinned' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'Boolean' } },
                },
            ],
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'admin' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'projectActivityUpsert' },
                                    arguments: [
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'input' },
                                            value: {
                                                kind: 'ObjectValue',
                                                fields: [
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'activityId' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'activityId' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'projectId' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'projectId' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'taskId' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'taskId' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'kind' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'kind' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'channel' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'channel' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'title' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'title' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'notes' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'notes' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'occurredAt' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'occurredAt' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'durationSec' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'durationSec' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'amountCents' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'amountCents' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'offerStatus' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'offerStatus' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'attachLinkUrl' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'attachLinkUrl' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'attachLinkKind' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'attachLinkKind' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'attachLinkLabel' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'attachLinkLabel' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'attachLinkPinned' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'attachLinkPinned' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'attachFileUploadId' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'attachFileUploadId' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'attachFileKind' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'attachFileKind' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'attachFileLabel' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'attachFileLabel' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'attachFilePinned' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'attachFilePinned' } },
                                                    },
                                                ],
                                            },
                                        },
                                    ],
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [{ kind: 'Field', name: { kind: 'Name', value: 'activityId' } }],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceProjectDetailUpsertActivityMutation, GqlCWorkspaceProjectDetailUpsertActivityMutationVariables>;
export const WorkspaceProjectDetailDeleteActivityDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'mutation',
            name: { kind: 'Name', value: 'WorkspaceProjectDetailDeleteActivity' },
            variableDefinitions: [
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'activityId' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } } },
                },
            ],
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'admin' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'projectActivityDelete' },
                                    arguments: [
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'activityId' },
                                            value: { kind: 'Variable', name: { kind: 'Name', value: 'activityId' } },
                                        },
                                    ],
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [{ kind: 'Field', name: { kind: 'Name', value: 'success' } }],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceProjectDetailDeleteActivityMutation, GqlCWorkspaceProjectDetailDeleteActivityMutationVariables>;
export const WorkspaceProjectDetailTimerStartDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'mutation',
            name: { kind: 'Name', value: 'WorkspaceProjectDetailTimerStart' },
            variableDefinitions: [
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'projectId' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'taskId' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'title' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
                },
            ],
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'admin' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'projectTimerStart' },
                                    arguments: [
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'projectId' },
                                            value: { kind: 'Variable', name: { kind: 'Name', value: 'projectId' } },
                                        },
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'taskId' },
                                            value: { kind: 'Variable', name: { kind: 'Name', value: 'taskId' } },
                                        },
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'title' },
                                            value: { kind: 'Variable', name: { kind: 'Name', value: 'title' } },
                                        },
                                    ],
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'activityId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'startedAt' } },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceProjectDetailTimerStartMutation, GqlCWorkspaceProjectDetailTimerStartMutationVariables>;
export const WorkspaceProjectDetailTimerStopDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'mutation',
            name: { kind: 'Name', value: 'WorkspaceProjectDetailTimerStop' },
            variableDefinitions: [
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'activityId' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } } },
                },
            ],
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'admin' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'projectTimerStop' },
                                    arguments: [
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'activityId' },
                                            value: { kind: 'Variable', name: { kind: 'Name', value: 'activityId' } },
                                        },
                                    ],
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'activityId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'endedAt' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'durationSec' } },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceProjectDetailTimerStopMutation, GqlCWorkspaceProjectDetailTimerStopMutationVariables>;
export const WorkspaceProjectLinkUpsertDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'mutation',
            name: { kind: 'Name', value: 'WorkspaceProjectLinkUpsert' },
            variableDefinitions: [
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'projectLinkId' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'projectId' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'activityId' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'url' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'label' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'kind' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'ProjectLinkKind' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'pinned' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'Boolean' } },
                },
            ],
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'admin' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'projectLinkUpsert' },
                                    arguments: [
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'input' },
                                            value: {
                                                kind: 'ObjectValue',
                                                fields: [
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'projectLinkId' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'projectLinkId' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'projectId' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'projectId' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'activityId' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'activityId' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'url' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'url' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'label' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'label' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'kind' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'kind' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'pinned' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'pinned' } },
                                                    },
                                                ],
                                            },
                                        },
                                    ],
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [{ kind: 'Field', name: { kind: 'Name', value: 'projectLinkId' } }],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceProjectLinkUpsertMutation, GqlCWorkspaceProjectLinkUpsertMutationVariables>;
export const WorkspaceProjectLinkDeleteDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'mutation',
            name: { kind: 'Name', value: 'WorkspaceProjectLinkDelete' },
            variableDefinitions: [
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'projectLinkId' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } } },
                },
            ],
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'admin' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'projectLinkDelete' },
                                    arguments: [
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'projectLinkId' },
                                            value: { kind: 'Variable', name: { kind: 'Name', value: 'projectLinkId' } },
                                        },
                                    ],
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [{ kind: 'Field', name: { kind: 'Name', value: 'success' } }],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceProjectLinkDeleteMutation, GqlCWorkspaceProjectLinkDeleteMutationVariables>;
export const WorkspaceProjectLinkTogglePinDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'mutation',
            name: { kind: 'Name', value: 'WorkspaceProjectLinkTogglePin' },
            variableDefinitions: [
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'projectLinkId' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } } },
                },
            ],
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'admin' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'projectLinkTogglePin' },
                                    arguments: [
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'projectLinkId' },
                                            value: { kind: 'Variable', name: { kind: 'Name', value: 'projectLinkId' } },
                                        },
                                    ],
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'projectLinkId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'pinned' } },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceProjectLinkTogglePinMutation, GqlCWorkspaceProjectLinkTogglePinMutationVariables>;
export const WorkspaceProjectFileUpsertDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'mutation',
            name: { kind: 'Name', value: 'WorkspaceProjectFileUpsert' },
            variableDefinitions: [
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'projectFileId' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'projectId' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'activityId' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'fileUploadId' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'label' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'kind' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'ProjectFileKind' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'pinned' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'Boolean' } },
                },
            ],
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'admin' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'projectFileUpsert' },
                                    arguments: [
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'input' },
                                            value: {
                                                kind: 'ObjectValue',
                                                fields: [
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'projectFileId' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'projectFileId' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'projectId' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'projectId' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'activityId' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'activityId' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'fileUploadId' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'fileUploadId' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'label' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'label' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'kind' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'kind' } },
                                                    },
                                                    {
                                                        kind: 'ObjectField',
                                                        name: { kind: 'Name', value: 'pinned' },
                                                        value: { kind: 'Variable', name: { kind: 'Name', value: 'pinned' } },
                                                    },
                                                ],
                                            },
                                        },
                                    ],
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [{ kind: 'Field', name: { kind: 'Name', value: 'projectFileId' } }],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceProjectFileUpsertMutation, GqlCWorkspaceProjectFileUpsertMutationVariables>;
export const WorkspaceProjectFileDeleteDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'mutation',
            name: { kind: 'Name', value: 'WorkspaceProjectFileDelete' },
            variableDefinitions: [
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'projectFileId' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } } },
                },
            ],
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'admin' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'projectFileDelete' },
                                    arguments: [
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'projectFileId' },
                                            value: { kind: 'Variable', name: { kind: 'Name', value: 'projectFileId' } },
                                        },
                                    ],
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [{ kind: 'Field', name: { kind: 'Name', value: 'success' } }],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceProjectFileDeleteMutation, GqlCWorkspaceProjectFileDeleteMutationVariables>;
export const WorkspaceProjectFileTogglePinDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'mutation',
            name: { kind: 'Name', value: 'WorkspaceProjectFileTogglePin' },
            variableDefinitions: [
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'projectFileId' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } } },
                },
            ],
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'admin' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'projectFileTogglePin' },
                                    arguments: [
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'projectFileId' },
                                            value: { kind: 'Variable', name: { kind: 'Name', value: 'projectFileId' } },
                                        },
                                    ],
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'projectFileId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'pinned' } },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCWorkspaceProjectFileTogglePinMutation, GqlCWorkspaceProjectFileTogglePinMutationVariables>;
export const ChatPageDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'query',
            name: { kind: 'Name', value: 'ChatPage' },
            variableDefinitions: [
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'chatId' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } } },
                },
            ],
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'currentSession' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                { kind: 'Field', name: { kind: 'Name', value: 'sessionId' } },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'user' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'userId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'chat' },
                        arguments: [
                            {
                                kind: 'Argument',
                                name: { kind: 'Name', value: 'chatId' },
                                value: { kind: 'Variable', name: { kind: 'Name', value: 'chatId' } },
                            },
                        ],
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                { kind: 'Field', name: { kind: 'Name', value: 'chatId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'title' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'lastModifiedAt' } },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'messages' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [{ kind: 'FragmentSpread', name: { kind: 'Name', value: 'ChatMessageFields' } }],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
        {
            kind: 'FragmentDefinition',
            name: { kind: 'Name', value: 'ChatMessageGeneration' },
            typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessageGeneration' } },
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    { kind: 'Field', name: { kind: 'Name', value: 'modelId' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'inputTokens' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'outputTokens' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'totalTokens' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'reasoningTokens' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'cachedInputTokens' } },
                ],
            },
        },
        {
            kind: 'FragmentDefinition',
            name: { kind: 'Name', value: 'ChatMessageFields' },
            typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessage' } },
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    { kind: 'Field', name: { kind: 'Name', value: '__typename' } },
                    {
                        kind: 'InlineFragment',
                        typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessageUser' } },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                { kind: 'Field', name: { kind: 'Name', value: 'chatMessageId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'body' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'author' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'userId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                                        ],
                                    },
                                },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'attachments' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'fileUploadId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'filename' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'mediaType' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'size' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'url' } },
                                        ],
                                    },
                                },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'profileObservations' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'observationId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'category' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'content' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'confidence' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                    {
                        kind: 'InlineFragment',
                        typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessageAssistantText' } },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                { kind: 'Field', name: { kind: 'Name', value: 'chatMessageId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'body' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'generation' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [{ kind: 'FragmentSpread', name: { kind: 'Name', value: 'ChatMessageGeneration' } }],
                                    },
                                },
                            ],
                        },
                    },
                    {
                        kind: 'InlineFragment',
                        typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessageToolCall' } },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                { kind: 'Field', name: { kind: 'Name', value: 'chatMessageId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'toolName' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'args' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'parentChatMessageId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                            ],
                        },
                    },
                    {
                        kind: 'InlineFragment',
                        typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessageToolApprovalRequest' } },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                { kind: 'Field', name: { kind: 'Name', value: 'chatMessageId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'approvalId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'toolName' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'args' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'generation' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [{ kind: 'FragmentSpread', name: { kind: 'Name', value: 'ChatMessageGeneration' } }],
                                    },
                                },
                            ],
                        },
                    },
                    {
                        kind: 'InlineFragment',
                        typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessageToolApprovalResponse' } },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                { kind: 'Field', name: { kind: 'Name', value: 'chatMessageId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'approvalId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'approved' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'reason' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                            ],
                        },
                    },
                    {
                        kind: 'InlineFragment',
                        typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessageAssistantInputCollection' } },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                { kind: 'Field', name: { kind: 'Name', value: 'chatMessageId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'mode' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'generation' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [{ kind: 'FragmentSpread', name: { kind: 'Name', value: 'ChatMessageGeneration' } }],
                                    },
                                },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'inputs' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: '__typename' } },
                                            {
                                                kind: 'InlineFragment',
                                                typeCondition: {
                                                    kind: 'NamedType',
                                                    name: { kind: 'Name', value: 'ChatAssistantInputDate' },
                                                },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                                    ],
                                                },
                                            },
                                            {
                                                kind: 'InlineFragment',
                                                typeCondition: {
                                                    kind: 'NamedType',
                                                    name: { kind: 'Name', value: 'ChatAssistantInputDateRange' },
                                                },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                                    ],
                                                },
                                            },
                                            {
                                                kind: 'InlineFragment',
                                                typeCondition: {
                                                    kind: 'NamedType',
                                                    name: { kind: 'Name', value: 'ChatAssistantInputDateTime' },
                                                },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                                    ],
                                                },
                                            },
                                            {
                                                kind: 'InlineFragment',
                                                typeCondition: {
                                                    kind: 'NamedType',
                                                    name: { kind: 'Name', value: 'ChatAssistantInputTime' },
                                                },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                                    ],
                                                },
                                            },
                                            {
                                                kind: 'InlineFragment',
                                                typeCondition: {
                                                    kind: 'NamedType',
                                                    name: { kind: 'Name', value: 'ChatAssistantInputSingleSelect' },
                                                },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'options' } },
                                                    ],
                                                },
                                            },
                                            {
                                                kind: 'InlineFragment',
                                                typeCondition: {
                                                    kind: 'NamedType',
                                                    name: { kind: 'Name', value: 'ChatAssistantInputMultiSelect' },
                                                },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'options' } },
                                                    ],
                                                },
                                            },
                                            {
                                                kind: 'InlineFragment',
                                                typeCondition: {
                                                    kind: 'NamedType',
                                                    name: { kind: 'Name', value: 'ChatAssistantInputBoolean' },
                                                },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                                    ],
                                                },
                                            },
                                            {
                                                kind: 'InlineFragment',
                                                typeCondition: {
                                                    kind: 'NamedType',
                                                    name: { kind: 'Name', value: 'ChatAssistantInputText' },
                                                },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                                    ],
                                                },
                                            },
                                            {
                                                kind: 'InlineFragment',
                                                typeCondition: {
                                                    kind: 'NamedType',
                                                    name: { kind: 'Name', value: 'ChatAssistantInputOtp' },
                                                },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                                    ],
                                                },
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                    {
                        kind: 'InlineFragment',
                        typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessageUserInput' } },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                { kind: 'Field', name: { kind: 'Name', value: 'chatMessageId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'collectionMessageId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'author' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'userId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                                        ],
                                    },
                                },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'answers' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                            {
                                                kind: 'Field',
                                                name: { kind: 'Name', value: 'value' },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: '__typename' } },
                                                        {
                                                            kind: 'InlineFragment',
                                                            typeCondition: {
                                                                kind: 'NamedType',
                                                                name: { kind: 'Name', value: 'ChatAssistantInputValueDate' },
                                                            },
                                                            selectionSet: {
                                                                kind: 'SelectionSet',
                                                                selections: [{ kind: 'Field', name: { kind: 'Name', value: 'date' } }],
                                                            },
                                                        },
                                                        {
                                                            kind: 'InlineFragment',
                                                            typeCondition: {
                                                                kind: 'NamedType',
                                                                name: { kind: 'Name', value: 'ChatAssistantInputValueDateRange' },
                                                            },
                                                            selectionSet: {
                                                                kind: 'SelectionSet',
                                                                selections: [
                                                                    { kind: 'Field', name: { kind: 'Name', value: 'from' } },
                                                                    { kind: 'Field', name: { kind: 'Name', value: 'to' } },
                                                                ],
                                                            },
                                                        },
                                                        {
                                                            kind: 'InlineFragment',
                                                            typeCondition: {
                                                                kind: 'NamedType',
                                                                name: { kind: 'Name', value: 'ChatAssistantInputValueDateTime' },
                                                            },
                                                            selectionSet: {
                                                                kind: 'SelectionSet',
                                                                selections: [{ kind: 'Field', name: { kind: 'Name', value: 'dateTime' } }],
                                                            },
                                                        },
                                                        {
                                                            kind: 'InlineFragment',
                                                            typeCondition: {
                                                                kind: 'NamedType',
                                                                name: { kind: 'Name', value: 'ChatAssistantInputValueTime' },
                                                            },
                                                            selectionSet: {
                                                                kind: 'SelectionSet',
                                                                selections: [{ kind: 'Field', name: { kind: 'Name', value: 'time' } }],
                                                            },
                                                        },
                                                        {
                                                            kind: 'InlineFragment',
                                                            typeCondition: {
                                                                kind: 'NamedType',
                                                                name: { kind: 'Name', value: 'ChatAssistantInputValueString' },
                                                            },
                                                            selectionSet: {
                                                                kind: 'SelectionSet',
                                                                selections: [{ kind: 'Field', name: { kind: 'Name', value: 'value' } }],
                                                            },
                                                        },
                                                        {
                                                            kind: 'InlineFragment',
                                                            typeCondition: {
                                                                kind: 'NamedType',
                                                                name: { kind: 'Name', value: 'ChatAssistantInputValueStringList' },
                                                            },
                                                            selectionSet: {
                                                                kind: 'SelectionSet',
                                                                selections: [{ kind: 'Field', name: { kind: 'Name', value: 'values' } }],
                                                            },
                                                        },
                                                        {
                                                            kind: 'InlineFragment',
                                                            typeCondition: {
                                                                kind: 'NamedType',
                                                                name: { kind: 'Name', value: 'ChatAssistantInputValueBoolean' },
                                                            },
                                                            selectionSet: {
                                                                kind: 'SelectionSet',
                                                                selections: [{ kind: 'Field', name: { kind: 'Name', value: 'boolean' } }],
                                                            },
                                                        },
                                                    ],
                                                },
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCChatPageQuery, GqlCChatPageQueryVariables>;
export const ChatMessageCreateDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'mutation',
            name: { kind: 'Name', value: 'ChatMessageCreate' },
            variableDefinitions: [
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'chatId' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'message' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'fileUploadIds' } },
                    type: {
                        kind: 'ListType',
                        type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } } },
                    },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'generationId' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'requireToolCallApprovals' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'Boolean' } } },
                },
            ],
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'chatMessageCreate' },
                        arguments: [
                            {
                                kind: 'Argument',
                                name: { kind: 'Name', value: 'chatId' },
                                value: { kind: 'Variable', name: { kind: 'Name', value: 'chatId' } },
                            },
                            {
                                kind: 'Argument',
                                name: { kind: 'Name', value: 'message' },
                                value: { kind: 'Variable', name: { kind: 'Name', value: 'message' } },
                            },
                            {
                                kind: 'Argument',
                                name: { kind: 'Name', value: 'fileUploadIds' },
                                value: { kind: 'Variable', name: { kind: 'Name', value: 'fileUploadIds' } },
                            },
                            {
                                kind: 'Argument',
                                name: { kind: 'Name', value: 'assistantOptions' },
                                value: {
                                    kind: 'ObjectValue',
                                    fields: [
                                        {
                                            kind: 'ObjectField',
                                            name: { kind: 'Name', value: 'generationId' },
                                            value: { kind: 'Variable', name: { kind: 'Name', value: 'generationId' } },
                                        },
                                        {
                                            kind: 'ObjectField',
                                            name: { kind: 'Name', value: 'requireToolCallApprovals' },
                                            value: { kind: 'Variable', name: { kind: 'Name', value: 'requireToolCallApprovals' } },
                                        },
                                    ],
                                },
                            },
                        ],
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                { kind: 'Field', name: { kind: 'Name', value: 'chatId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'chatMessageId' } },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCChatMessageCreateMutation, GqlCChatMessageCreateMutationVariables>;
export const ChatInputCollectionRespondDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'mutation',
            name: { kind: 'Name', value: 'ChatInputCollectionRespond' },
            variableDefinitions: [
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'collectionMessageId' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'answers' } },
                    type: {
                        kind: 'NonNullType',
                        type: {
                            kind: 'ListType',
                            type: {
                                kind: 'NonNullType',
                                type: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessageUserInputAnswerCreate' } },
                            },
                        },
                    },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'generationId' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'requireToolCallApprovals' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'Boolean' } } },
                },
            ],
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'chatInputCollectionRespond' },
                        arguments: [
                            {
                                kind: 'Argument',
                                name: { kind: 'Name', value: 'collectionMessageId' },
                                value: { kind: 'Variable', name: { kind: 'Name', value: 'collectionMessageId' } },
                            },
                            {
                                kind: 'Argument',
                                name: { kind: 'Name', value: 'answers' },
                                value: { kind: 'Variable', name: { kind: 'Name', value: 'answers' } },
                            },
                            {
                                kind: 'Argument',
                                name: { kind: 'Name', value: 'assistantOptions' },
                                value: {
                                    kind: 'ObjectValue',
                                    fields: [
                                        {
                                            kind: 'ObjectField',
                                            name: { kind: 'Name', value: 'generationId' },
                                            value: { kind: 'Variable', name: { kind: 'Name', value: 'generationId' } },
                                        },
                                        {
                                            kind: 'ObjectField',
                                            name: { kind: 'Name', value: 'requireToolCallApprovals' },
                                            value: { kind: 'Variable', name: { kind: 'Name', value: 'requireToolCallApprovals' } },
                                        },
                                    ],
                                },
                            },
                        ],
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                { kind: 'Field', name: { kind: 'Name', value: 'chatId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'chatMessageId' } },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCChatInputCollectionRespondMutation, GqlCChatInputCollectionRespondMutationVariables>;
export const ChatToolApprovalRespondDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'mutation',
            name: { kind: 'Name', value: 'ChatToolApprovalRespond' },
            variableDefinitions: [
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'approvalId' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'approved' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'Boolean' } } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'reason' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'generationId' } },
                    type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
                },
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'requireToolCallApprovals' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'Boolean' } } },
                },
            ],
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'chatToolApprovalRespond' },
                        arguments: [
                            {
                                kind: 'Argument',
                                name: { kind: 'Name', value: 'approvalId' },
                                value: { kind: 'Variable', name: { kind: 'Name', value: 'approvalId' } },
                            },
                            {
                                kind: 'Argument',
                                name: { kind: 'Name', value: 'approved' },
                                value: { kind: 'Variable', name: { kind: 'Name', value: 'approved' } },
                            },
                            {
                                kind: 'Argument',
                                name: { kind: 'Name', value: 'reason' },
                                value: { kind: 'Variable', name: { kind: 'Name', value: 'reason' } },
                            },
                            {
                                kind: 'Argument',
                                name: { kind: 'Name', value: 'assistantOptions' },
                                value: {
                                    kind: 'ObjectValue',
                                    fields: [
                                        {
                                            kind: 'ObjectField',
                                            name: { kind: 'Name', value: 'generationId' },
                                            value: { kind: 'Variable', name: { kind: 'Name', value: 'generationId' } },
                                        },
                                        {
                                            kind: 'ObjectField',
                                            name: { kind: 'Name', value: 'requireToolCallApprovals' },
                                            value: { kind: 'Variable', name: { kind: 'Name', value: 'requireToolCallApprovals' } },
                                        },
                                    ],
                                },
                            },
                        ],
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                { kind: 'Field', name: { kind: 'Name', value: 'chatId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'chatMessageId' } },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCChatToolApprovalRespondMutation, GqlCChatToolApprovalRespondMutationVariables>;
export const ChatUpdatesDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'subscription',
            name: { kind: 'Name', value: 'ChatUpdates' },
            variableDefinitions: [
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'generationId' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } } },
                },
            ],
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'chatUpdates' },
                        arguments: [
                            {
                                kind: 'Argument',
                                name: { kind: 'Name', value: 'generationId' },
                                value: { kind: 'Variable', name: { kind: 'Name', value: 'generationId' } },
                            },
                        ],
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                { kind: 'Field', name: { kind: 'Name', value: '__typename' } },
                                {
                                    kind: 'InlineFragment',
                                    typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatUpdateMessageAppended' } },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            {
                                                kind: 'Field',
                                                name: { kind: 'Name', value: 'message' },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'FragmentSpread', name: { kind: 'Name', value: 'ChatMessageFields' } },
                                                    ],
                                                },
                                            },
                                        ],
                                    },
                                },
                                {
                                    kind: 'InlineFragment',
                                    typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatUpdateAssistantTextChunk' } },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'chatMessageId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'delta' } },
                                        ],
                                    },
                                },
                                {
                                    kind: 'InlineFragment',
                                    typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatUpdateTurnEnded' } },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [{ kind: 'Field', name: { kind: 'Name', value: 'generationId' } }],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
        {
            kind: 'FragmentDefinition',
            name: { kind: 'Name', value: 'ChatMessageGeneration' },
            typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessageGeneration' } },
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    { kind: 'Field', name: { kind: 'Name', value: 'modelId' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'inputTokens' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'outputTokens' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'totalTokens' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'reasoningTokens' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'cachedInputTokens' } },
                ],
            },
        },
        {
            kind: 'FragmentDefinition',
            name: { kind: 'Name', value: 'ChatMessageFields' },
            typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessage' } },
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    { kind: 'Field', name: { kind: 'Name', value: '__typename' } },
                    {
                        kind: 'InlineFragment',
                        typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessageUser' } },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                { kind: 'Field', name: { kind: 'Name', value: 'chatMessageId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'body' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'author' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'userId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                                        ],
                                    },
                                },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'attachments' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'fileUploadId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'filename' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'mediaType' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'size' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'url' } },
                                        ],
                                    },
                                },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'profileObservations' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'observationId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'category' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'content' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'confidence' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                    {
                        kind: 'InlineFragment',
                        typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessageAssistantText' } },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                { kind: 'Field', name: { kind: 'Name', value: 'chatMessageId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'body' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'generation' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [{ kind: 'FragmentSpread', name: { kind: 'Name', value: 'ChatMessageGeneration' } }],
                                    },
                                },
                            ],
                        },
                    },
                    {
                        kind: 'InlineFragment',
                        typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessageToolCall' } },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                { kind: 'Field', name: { kind: 'Name', value: 'chatMessageId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'toolName' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'args' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'parentChatMessageId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                            ],
                        },
                    },
                    {
                        kind: 'InlineFragment',
                        typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessageToolApprovalRequest' } },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                { kind: 'Field', name: { kind: 'Name', value: 'chatMessageId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'approvalId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'toolName' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'args' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'generation' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [{ kind: 'FragmentSpread', name: { kind: 'Name', value: 'ChatMessageGeneration' } }],
                                    },
                                },
                            ],
                        },
                    },
                    {
                        kind: 'InlineFragment',
                        typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessageToolApprovalResponse' } },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                { kind: 'Field', name: { kind: 'Name', value: 'chatMessageId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'approvalId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'approved' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'reason' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                            ],
                        },
                    },
                    {
                        kind: 'InlineFragment',
                        typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessageAssistantInputCollection' } },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                { kind: 'Field', name: { kind: 'Name', value: 'chatMessageId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'mode' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'generation' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [{ kind: 'FragmentSpread', name: { kind: 'Name', value: 'ChatMessageGeneration' } }],
                                    },
                                },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'inputs' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: '__typename' } },
                                            {
                                                kind: 'InlineFragment',
                                                typeCondition: {
                                                    kind: 'NamedType',
                                                    name: { kind: 'Name', value: 'ChatAssistantInputDate' },
                                                },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                                    ],
                                                },
                                            },
                                            {
                                                kind: 'InlineFragment',
                                                typeCondition: {
                                                    kind: 'NamedType',
                                                    name: { kind: 'Name', value: 'ChatAssistantInputDateRange' },
                                                },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                                    ],
                                                },
                                            },
                                            {
                                                kind: 'InlineFragment',
                                                typeCondition: {
                                                    kind: 'NamedType',
                                                    name: { kind: 'Name', value: 'ChatAssistantInputDateTime' },
                                                },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                                    ],
                                                },
                                            },
                                            {
                                                kind: 'InlineFragment',
                                                typeCondition: {
                                                    kind: 'NamedType',
                                                    name: { kind: 'Name', value: 'ChatAssistantInputTime' },
                                                },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                                    ],
                                                },
                                            },
                                            {
                                                kind: 'InlineFragment',
                                                typeCondition: {
                                                    kind: 'NamedType',
                                                    name: { kind: 'Name', value: 'ChatAssistantInputSingleSelect' },
                                                },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'options' } },
                                                    ],
                                                },
                                            },
                                            {
                                                kind: 'InlineFragment',
                                                typeCondition: {
                                                    kind: 'NamedType',
                                                    name: { kind: 'Name', value: 'ChatAssistantInputMultiSelect' },
                                                },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'options' } },
                                                    ],
                                                },
                                            },
                                            {
                                                kind: 'InlineFragment',
                                                typeCondition: {
                                                    kind: 'NamedType',
                                                    name: { kind: 'Name', value: 'ChatAssistantInputBoolean' },
                                                },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                                    ],
                                                },
                                            },
                                            {
                                                kind: 'InlineFragment',
                                                typeCondition: {
                                                    kind: 'NamedType',
                                                    name: { kind: 'Name', value: 'ChatAssistantInputText' },
                                                },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                                    ],
                                                },
                                            },
                                            {
                                                kind: 'InlineFragment',
                                                typeCondition: {
                                                    kind: 'NamedType',
                                                    name: { kind: 'Name', value: 'ChatAssistantInputOtp' },
                                                },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                                        { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
                                                    ],
                                                },
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                    {
                        kind: 'InlineFragment',
                        typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'ChatMessageUserInput' } },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                { kind: 'Field', name: { kind: 'Name', value: 'chatMessageId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'collectionMessageId' } },
                                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'author' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'userId' } },
                                            { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                                        ],
                                    },
                                },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'answers' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [
                                            { kind: 'Field', name: { kind: 'Name', value: 'inputId' } },
                                            {
                                                kind: 'Field',
                                                name: { kind: 'Name', value: 'value' },
                                                selectionSet: {
                                                    kind: 'SelectionSet',
                                                    selections: [
                                                        { kind: 'Field', name: { kind: 'Name', value: '__typename' } },
                                                        {
                                                            kind: 'InlineFragment',
                                                            typeCondition: {
                                                                kind: 'NamedType',
                                                                name: { kind: 'Name', value: 'ChatAssistantInputValueDate' },
                                                            },
                                                            selectionSet: {
                                                                kind: 'SelectionSet',
                                                                selections: [{ kind: 'Field', name: { kind: 'Name', value: 'date' } }],
                                                            },
                                                        },
                                                        {
                                                            kind: 'InlineFragment',
                                                            typeCondition: {
                                                                kind: 'NamedType',
                                                                name: { kind: 'Name', value: 'ChatAssistantInputValueDateRange' },
                                                            },
                                                            selectionSet: {
                                                                kind: 'SelectionSet',
                                                                selections: [
                                                                    { kind: 'Field', name: { kind: 'Name', value: 'from' } },
                                                                    { kind: 'Field', name: { kind: 'Name', value: 'to' } },
                                                                ],
                                                            },
                                                        },
                                                        {
                                                            kind: 'InlineFragment',
                                                            typeCondition: {
                                                                kind: 'NamedType',
                                                                name: { kind: 'Name', value: 'ChatAssistantInputValueDateTime' },
                                                            },
                                                            selectionSet: {
                                                                kind: 'SelectionSet',
                                                                selections: [{ kind: 'Field', name: { kind: 'Name', value: 'dateTime' } }],
                                                            },
                                                        },
                                                        {
                                                            kind: 'InlineFragment',
                                                            typeCondition: {
                                                                kind: 'NamedType',
                                                                name: { kind: 'Name', value: 'ChatAssistantInputValueTime' },
                                                            },
                                                            selectionSet: {
                                                                kind: 'SelectionSet',
                                                                selections: [{ kind: 'Field', name: { kind: 'Name', value: 'time' } }],
                                                            },
                                                        },
                                                        {
                                                            kind: 'InlineFragment',
                                                            typeCondition: {
                                                                kind: 'NamedType',
                                                                name: { kind: 'Name', value: 'ChatAssistantInputValueString' },
                                                            },
                                                            selectionSet: {
                                                                kind: 'SelectionSet',
                                                                selections: [{ kind: 'Field', name: { kind: 'Name', value: 'value' } }],
                                                            },
                                                        },
                                                        {
                                                            kind: 'InlineFragment',
                                                            typeCondition: {
                                                                kind: 'NamedType',
                                                                name: { kind: 'Name', value: 'ChatAssistantInputValueStringList' },
                                                            },
                                                            selectionSet: {
                                                                kind: 'SelectionSet',
                                                                selections: [{ kind: 'Field', name: { kind: 'Name', value: 'values' } }],
                                                            },
                                                        },
                                                        {
                                                            kind: 'InlineFragment',
                                                            typeCondition: {
                                                                kind: 'NamedType',
                                                                name: { kind: 'Name', value: 'ChatAssistantInputValueBoolean' },
                                                            },
                                                            selectionSet: {
                                                                kind: 'SelectionSet',
                                                                selections: [{ kind: 'Field', name: { kind: 'Name', value: 'boolean' } }],
                                                            },
                                                        },
                                                    ],
                                                },
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCChatUpdatesSubscription, GqlCChatUpdatesSubscriptionVariables>;
export const VisitorPreviousChatsDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'query',
            name: { kind: 'Name', value: 'VisitorPreviousChats' },
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'currentSession' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                { kind: 'Field', name: { kind: 'Name', value: 'sessionId' } },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'visitorChats' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [{ kind: 'FragmentSpread', name: { kind: 'Name', value: 'VisitorChatListItem' } }],
                                    },
                                },
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'visitorChatQuota' },
                                    selectionSet: {
                                        kind: 'SelectionSet',
                                        selections: [{ kind: 'FragmentSpread', name: { kind: 'Name', value: 'VisitorChatQuotaFields' } }],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
        {
            kind: 'FragmentDefinition',
            name: { kind: 'Name', value: 'VisitorChatListItem' },
            typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'Chat' } },
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    { kind: 'Field', name: { kind: 'Name', value: 'chatId' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'title' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'lastModifiedAt' } },
                ],
            },
        },
        {
            kind: 'FragmentDefinition',
            name: { kind: 'Name', value: 'VisitorChatQuotaFields' },
            typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'VisitorChatQuota' } },
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    { kind: 'Field', name: { kind: 'Name', value: 'used' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'limit' } },
                    { kind: 'Field', name: { kind: 'Name', value: 'resetsAt' } },
                ],
            },
        },
    ],
} as unknown as DocumentNode<GqlCVisitorPreviousChatsQuery, GqlCVisitorPreviousChatsQueryVariables>;
