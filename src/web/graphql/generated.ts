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
    user: GqlCUserMutation;
    userCreate: GqlCMutationResult;
}

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
    currentSession: GqlCSession;
}

export interface GqlCSession {
    __typename?: 'Session';
    chat: GqlCChat;
    sessionId: Scalars['ID']['output'];
    user?: Maybe<GqlCUser>;
}

export type GqlCSessionChatArgs = {
    chatId: Scalars['ID']['input'];
};

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
    chatInputCollectionRespond?: Maybe<GqlCChatMessageCreateResult>;
    chatMessageCreate?: Maybe<GqlCChatMessageCreateResult>;
    chatToolApprovalRespond?: Maybe<GqlCChatMessageCreateResult>;
    terminateSessions: GqlCMutationResult;
    userUpdate: GqlCMutationResult;
}

export type GqlCUserMutationChatInputCollectionRespondArgs = {
    answers: Array<GqlCChatMessageUserInputAnswerCreate>;
    assistantOptions: GqlCChatAssistantOptions;
    collectionMessageId: Scalars['ID']['input'];
};

export type GqlCUserMutationChatMessageCreateArgs = {
    assistantOptions: GqlCChatAssistantOptions;
    chatId?: InputMaybe<Scalars['ID']['input']>;
    fileUploadIds?: InputMaybe<Array<Scalars['ID']['input']>>;
    message: Scalars['String']['input'];
};

export type GqlCUserMutationChatToolApprovalRespondArgs = {
    approvalId: Scalars['String']['input'];
    approved: Scalars['Boolean']['input'];
    assistantOptions: GqlCChatAssistantOptions;
    reason?: InputMaybe<Scalars['String']['input']>;
};

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
    currentSession: {
        sessionId: string;
        user: { userId: string; name: string } | null;
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

export type GqlCChatMessageCreateMutationVariables = Exact<{
    chatId?: string | null | undefined;
    message: string;
    fileUploadIds?: Array<string> | string | null | undefined;
    generationId?: string | null | undefined;
    requireToolCallApprovals: boolean;
}>;

export type GqlCChatMessageCreateMutation = { user: { chatMessageCreate: { chatId: string; chatMessageId: string } | null } };

export type GqlCChatInputCollectionRespondMutationVariables = Exact<{
    collectionMessageId: string;
    answers: Array<Schema.GqlCChatMessageUserInputAnswerCreate> | Schema.GqlCChatMessageUserInputAnswerCreate;
    generationId?: string | null | undefined;
    requireToolCallApprovals: boolean;
}>;

export type GqlCChatInputCollectionRespondMutation = {
    user: { chatInputCollectionRespond: { chatId: string; chatMessageId: string } | null };
};

export type GqlCChatToolApprovalRespondMutationVariables = Exact<{
    approvalId: string;
    approved: boolean;
    reason?: string | null | undefined;
    generationId?: string | null | undefined;
    requireToolCallApprovals: boolean;
}>;

export type GqlCChatToolApprovalRespondMutation = { user: { chatToolApprovalRespond: { chatId: string; chatMessageId: string } | null } };

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

export type GqlCHomePageQueryVariables = Exact<{ [key: string]: never }>;

export type GqlCHomePageQuery = { currentSession: { sessionId: string; user: { name: string } | null } };

export type GqlCTerminateSessionsMutationVariables = Exact<{
    currentSessionId: string;
}>;

export type GqlCTerminateSessionsMutation = { user: { terminateSessions: { success: boolean } } };

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
                                                        { kind: 'FragmentSpread', name: { kind: 'Name', value: 'ChatMessageFields' } },
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
                        name: { kind: 'Name', value: 'user' },
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
                        name: { kind: 'Name', value: 'user' },
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
                        name: { kind: 'Name', value: 'user' },
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
export const TerminateSessionsDocument = {
    kind: 'Document',
    definitions: [
        {
            kind: 'OperationDefinition',
            operation: 'mutation',
            name: { kind: 'Name', value: 'TerminateSessions' },
            variableDefinitions: [
                {
                    kind: 'VariableDefinition',
                    variable: { kind: 'Variable', name: { kind: 'Name', value: 'currentSessionId' } },
                    type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } } },
                },
            ],
            selectionSet: {
                kind: 'SelectionSet',
                selections: [
                    {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'user' },
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                                {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'terminateSessions' },
                                    arguments: [
                                        {
                                            kind: 'Argument',
                                            name: { kind: 'Name', value: 'sessionIds' },
                                            value: {
                                                kind: 'ListValue',
                                                values: [{ kind: 'Variable', name: { kind: 'Name', value: 'currentSessionId' } }],
                                            },
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
} as unknown as DocumentNode<GqlCTerminateSessionsMutation, GqlCTerminateSessionsMutationVariables>;
