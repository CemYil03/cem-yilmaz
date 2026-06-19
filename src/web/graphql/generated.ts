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
    chat: GqlCChat;
    chats: Array<GqlCChat>;
    publicChat: GqlCChat;
    publicChats: Array<GqlCChat>;
}

export type GqlCAdminChatArgs = {
    chatId: Scalars['ID']['input'];
};

export type GqlCAdminPublicChatArgs = {
    chatId: Scalars['ID']['input'];
};

export interface GqlCAdminMutation {
    __typename?: 'AdminMutation';
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
}

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
    toolName: Scalars['String']['output'];
}

export interface GqlCChatMessageUser {
    __typename?: 'ChatMessageUser';
    attachments: Array<GqlCFileUpload>;
    author: GqlCUser;
    body: Scalars['String']['output'];
    chatMessageId: Scalars['ID']['output'];
    createdAt: Scalars['DateTime']['output'];
}

export interface GqlCChatMessageUserInput {
    __typename?: 'ChatMessageUserInput';
    answers: Array<GqlCChatMessageUserInputAnswer>;
    author: GqlCUser;
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
}

export interface GqlCSubscription {
    __typename?: 'Subscription';
    chatUpdates: GqlCChatUpdate;
    userUpdates: GqlCUser;
}

export type GqlCSubscriptionChatUpdatesArgs = {
    generationId: Scalars['ID']['input'];
};

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
    createdAt: string;
};

type GqlCChatMessageFields_ChatMessageUser_Fragment = {
    __typename: 'ChatMessageUser';
    chatMessageId: string;
    body: string;
    createdAt: string;
    author: { userId: string; name: string };
    attachments: Array<{ fileUploadId: string; filename: string; mediaType: string; size: number; url: string }>;
};

type GqlCChatMessageFields_ChatMessageUserInput_Fragment = {
    __typename: 'ChatMessageUserInput';
    chatMessageId: string;
    collectionMessageId: string;
    createdAt: string;
    author: { userId: string; name: string };
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
            | { __typename: 'ChatMessageToolCall'; chatMessageId: string; toolName: string; args: unknown; createdAt: string }
            | {
                  __typename: 'ChatMessageUser';
                  chatMessageId: string;
                  body: string;
                  createdAt: string;
                  author: { userId: string; name: string };
                  attachments: Array<{ fileUploadId: string; filename: string; mediaType: string; size: number; url: string }>;
              }
            | {
                  __typename: 'ChatMessageUserInput';
                  chatMessageId: string;
                  collectionMessageId: string;
                  createdAt: string;
                  author: { userId: string; name: string };
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
                  | { __typename: 'ChatMessageToolCall'; chatMessageId: string; toolName: string; args: unknown; createdAt: string }
                  | {
                        __typename: 'ChatMessageUser';
                        chatMessageId: string;
                        body: string;
                        createdAt: string;
                        author: { userId: string; name: string };
                        attachments: Array<{ fileUploadId: string; filename: string; mediaType: string; size: number; url: string }>;
                    }
                  | {
                        __typename: 'ChatMessageUserInput';
                        chatMessageId: string;
                        collectionMessageId: string;
                        createdAt: string;
                        author: { userId: string; name: string };
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
    createdAt: string;
};

type GqlCWorkspaceChatMessageFields_ChatMessageUser_Fragment = {
    __typename: 'ChatMessageUser';
    chatMessageId: string;
    body: string;
    createdAt: string;
    author: { userId: string; name: string };
    attachments: Array<{ fileUploadId: string; filename: string; mediaType: string; size: number; url: string }>;
};

type GqlCWorkspaceChatMessageFields_ChatMessageUserInput_Fragment = {
    __typename: 'ChatMessageUserInput';
    chatMessageId: string;
    collectionMessageId: string;
    createdAt: string;
    author: { userId: string; name: string };
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
                | { __typename: 'ChatMessageToolCall'; chatMessageId: string; toolName: string; args: unknown; createdAt: string }
                | {
                      __typename: 'ChatMessageUser';
                      chatMessageId: string;
                      body: string;
                      createdAt: string;
                      author: { userId: string; name: string };
                      attachments: Array<{ fileUploadId: string; filename: string; mediaType: string; size: number; url: string }>;
                  }
                | {
                      __typename: 'ChatMessageUserInput';
                      chatMessageId: string;
                      collectionMessageId: string;
                      createdAt: string;
                      author: { userId: string; name: string };
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
}>;

export type GqlCWorkspaceChatMessageCreateMutation = { admin: { chatMessageCreate: { chatId: string; chatMessageId: string } | null } };

export type GqlCWorkspaceChatInputCollectionRespondMutationVariables = Exact<{
    collectionMessageId: string;
    answers: Array<Schema.GqlCChatMessageUserInputAnswerCreate> | Schema.GqlCChatMessageUserInputAnswerCreate;
    generationId?: string | null | undefined;
    requireToolCallApprovals: boolean;
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
}>;

export type GqlCWorkspaceChatToolApprovalRespondMutation = {
    admin: { chatToolApprovalRespond: { chatId: string; chatMessageId: string } | null };
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
