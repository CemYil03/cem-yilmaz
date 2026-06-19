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
    chat: GqlSChat;
    chats: Array<GqlSChat>;
    publicChat: GqlSChat;
    publicChats: Array<GqlSChat>;
}

export type GqlSAdminChatArgs = {
    chatId: Scalars['ID']['input'];
};

export type GqlSAdminPublicChatArgs = {
    chatId: Scalars['ID']['input'];
};

export interface GqlSAdminMutation {
    __typename?: 'AdminMutation';
    chatInputCollectionRespond?: Maybe<GqlSChatMessageCreateResult>;
    chatMessageCreate?: Maybe<GqlSChatMessageCreateResult>;
    chatToolApprovalRespond?: Maybe<GqlSChatMessageCreateResult>;
}

export type GqlSAdminMutationChatInputCollectionRespondArgs = {
    answers: Array<GqlSChatMessageUserInputAnswerCreate>;
    assistantOptions: GqlSChatAssistantOptions;
    collectionMessageId: Scalars['ID']['input'];
};

export type GqlSAdminMutationChatMessageCreateArgs = {
    assistantOptions: GqlSChatAssistantOptions;
    chatId?: InputMaybe<Scalars['ID']['input']>;
    fileUploadIds?: InputMaybe<Array<Scalars['ID']['input']>>;
    message: Scalars['String']['input'];
};

export type GqlSAdminMutationChatToolApprovalRespondArgs = {
    approvalId: Scalars['String']['input'];
    approved: Scalars['Boolean']['input'];
    assistantOptions: GqlSChatAssistantOptions;
    reason?: InputMaybe<Scalars['String']['input']>;
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
    toolName: Scalars['String']['output'];
}

export interface GqlSChatMessageUser {
    __typename?: 'ChatMessageUser';
    attachments: Array<GqlSFileUpload>;
    author: GqlSUser;
    body: Scalars['String']['output'];
    chatMessageId: Scalars['ID']['output'];
    createdAt: Scalars['DateTime']['output'];
}

export interface GqlSChatMessageUserInput {
    __typename?: 'ChatMessageUserInput';
    answers: Array<GqlSChatMessageUserInputAnswer>;
    author: GqlSUser;
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

export interface GqlSFileUpload {
    __typename?: 'FileUpload';
    fileUploadId: Scalars['ID']['output'];
    filename: Scalars['String']['output'];
    mediaType: Scalars['String']['output'];
    size: Scalars['Int']['output'];
    url: Scalars['String']['output'];
}

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

export interface GqlSQuery {
    __typename?: 'Query';
    admin: GqlSAdmin;
    chat: GqlSChat;
    currentSession: GqlSSession;
}

export type GqlSQueryChatArgs = {
    chatId: Scalars['ID']['input'];
};

export interface GqlSSession {
    __typename?: 'Session';
    sessionId: Scalars['ID']['output'];
    user?: Maybe<GqlSUser>;
}

export interface GqlSSubscription {
    __typename?: 'Subscription';
    chatUpdates: GqlSChatUpdate;
    userUpdates: GqlSUser;
}

export type GqlSSubscriptionChatUpdatesArgs = {
    generationId: Scalars['ID']['input'];
};

export interface GqlSUser {
    __typename?: 'User';
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
        | GqlSChatMessageUser
        | (Omit<GqlSChatMessageUserInput, 'answers'> & { answers: Array<_RefType['ChatMessageUserInputAnswer']> });
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
    AdminMutation: ResolverTypeWrapper<GqlSAdminMutation>;
    Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
    Chat: ResolverTypeWrapper<Omit<GqlSChat, 'messages'> & { messages: Array<GqlSResolversTypes['ChatMessage']> }>;
    ChatAssistantInput: ResolverTypeWrapper<GqlSResolversUnionTypes<GqlSResolversTypes>['ChatAssistantInput']>;
    ChatAssistantInputBoolean: ResolverTypeWrapper<GqlSChatAssistantInputBoolean>;
    ChatAssistantInputDate: ResolverTypeWrapper<GqlSChatAssistantInputDate>;
    ChatAssistantInputDateRange: ResolverTypeWrapper<GqlSChatAssistantInputDateRange>;
    ChatAssistantInputDateTime: ResolverTypeWrapper<GqlSChatAssistantInputDateTime>;
    ChatAssistantInputMultiSelect: ResolverTypeWrapper<GqlSChatAssistantInputMultiSelect>;
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
    ChatMessageUser: ResolverTypeWrapper<GqlSChatMessageUser>;
    ChatMessageUserInput: ResolverTypeWrapper<
        Omit<GqlSChatMessageUserInput, 'answers'> & { answers: Array<GqlSResolversTypes['ChatMessageUserInputAnswer']> }
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
    Date: ResolverTypeWrapper<Scalars['Date']['output']>;
    DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
    FileUpload: ResolverTypeWrapper<GqlSFileUpload>;
    ID: ResolverTypeWrapper<Scalars['ID']['output']>;
    Int: ResolverTypeWrapper<Scalars['Int']['output']>;
    JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
    Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
    MutationResult: ResolverTypeWrapper<GqlSMutationResult>;
    Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
    Session: ResolverTypeWrapper<GqlSSession>;
    String: ResolverTypeWrapper<Scalars['String']['output']>;
    Subscription: ResolverTypeWrapper<Record<PropertyKey, never>>;
    User: ResolverTypeWrapper<GqlSUser>;
    UserCreate: GqlSUserCreate;
    UserMutation: ResolverTypeWrapper<GqlSUserMutation>;
    UserUpdate: GqlSUserUpdate;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type GqlSResolversParentTypes = ResolversObject<{
    Admin: Omit<GqlSAdmin, 'chat' | 'chats' | 'publicChat' | 'publicChats'> & {
        chat: GqlSResolversParentTypes['Chat'];
        chats: Array<GqlSResolversParentTypes['Chat']>;
        publicChat: GqlSResolversParentTypes['Chat'];
        publicChats: Array<GqlSResolversParentTypes['Chat']>;
    };
    AdminMutation: GqlSAdminMutation;
    Boolean: Scalars['Boolean']['output'];
    Chat: Omit<GqlSChat, 'messages'> & { messages: Array<GqlSResolversParentTypes['ChatMessage']> };
    ChatAssistantInput: GqlSResolversUnionTypes<GqlSResolversParentTypes>['ChatAssistantInput'];
    ChatAssistantInputBoolean: GqlSChatAssistantInputBoolean;
    ChatAssistantInputDate: GqlSChatAssistantInputDate;
    ChatAssistantInputDateRange: GqlSChatAssistantInputDateRange;
    ChatAssistantInputDateTime: GqlSChatAssistantInputDateTime;
    ChatAssistantInputMultiSelect: GqlSChatAssistantInputMultiSelect;
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
    ChatMessageUser: GqlSChatMessageUser;
    ChatMessageUserInput: Omit<GqlSChatMessageUserInput, 'answers'> & {
        answers: Array<GqlSResolversParentTypes['ChatMessageUserInputAnswer']>;
    };
    ChatMessageUserInputAnswer: Omit<GqlSChatMessageUserInputAnswer, 'value'> & {
        value: GqlSResolversParentTypes['ChatAssistantInputValue'];
    };
    ChatMessageUserInputAnswerCreate: GqlSChatMessageUserInputAnswerCreate;
    ChatUpdate: GqlSResolversUnionTypes<GqlSResolversParentTypes>['ChatUpdate'];
    ChatUpdateAssistantTextChunk: GqlSChatUpdateAssistantTextChunk;
    ChatUpdateMessageAppended: Omit<GqlSChatUpdateMessageAppended, 'message'> & { message: GqlSResolversParentTypes['ChatMessage'] };
    ChatUpdateTurnEnded: GqlSChatUpdateTurnEnded;
    Date: Scalars['Date']['output'];
    DateTime: Scalars['DateTime']['output'];
    FileUpload: GqlSFileUpload;
    ID: Scalars['ID']['output'];
    Int: Scalars['Int']['output'];
    JSON: Scalars['JSON']['output'];
    Mutation: Record<PropertyKey, never>;
    MutationResult: GqlSMutationResult;
    Query: Record<PropertyKey, never>;
    Session: GqlSSession;
    String: Scalars['String']['output'];
    Subscription: Record<PropertyKey, never>;
    User: GqlSUser;
    UserCreate: GqlSUserCreate;
    UserMutation: GqlSUserMutation;
    UserUpdate: GqlSUserUpdate;
}>;

export type GqlSAdminResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['Admin'] = GqlSResolversParentTypes['Admin'],
> = ResolversObject<{
    chat?: Resolver<GqlSResolversTypes['Chat'], ParentType, ContextType, RequireFields<GqlSAdminChatArgs, 'chatId'>>;
    chats?: Resolver<Array<GqlSResolversTypes['Chat']>, ParentType, ContextType>;
    publicChat?: Resolver<GqlSResolversTypes['Chat'], ParentType, ContextType, RequireFields<GqlSAdminPublicChatArgs, 'chatId'>>;
    publicChats?: Resolver<Array<GqlSResolversTypes['Chat']>, ParentType, ContextType>;
}>;

export type GqlSAdminMutationResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminMutation'] = GqlSResolversParentTypes['AdminMutation'],
> = ResolversObject<{
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
    toolName?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSChatMessageUserResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatMessageUser'] = GqlSResolversParentTypes['ChatMessageUser'],
> = ResolversObject<{
    attachments?: Resolver<Array<GqlSResolversTypes['FileUpload']>, ParentType, ContextType>;
    author?: Resolver<GqlSResolversTypes['User'], ParentType, ContextType>;
    body?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    chatMessageId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSChatMessageUserInputResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatMessageUserInput'] = GqlSResolversParentTypes['ChatMessageUserInput'],
> = ResolversObject<{
    answers?: Resolver<Array<GqlSResolversTypes['ChatMessageUserInputAnswer']>, ParentType, ContextType>;
    author?: Resolver<GqlSResolversTypes['User'], ParentType, ContextType>;
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

export type GqlSQueryResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['Query'] = GqlSResolversParentTypes['Query'],
> = ResolversObject<{
    admin?: Resolver<GqlSResolversTypes['Admin'], ParentType, ContextType>;
    chat?: Resolver<GqlSResolversTypes['Chat'], ParentType, ContextType, RequireFields<GqlSQueryChatArgs, 'chatId'>>;
    currentSession?: Resolver<GqlSResolversTypes['Session'], ParentType, ContextType>;
}>;

export type GqlSSessionResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['Session'] = GqlSResolversParentTypes['Session'],
> = ResolversObject<{
    sessionId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    user?: Resolver<Maybe<GqlSResolversTypes['User']>, ParentType, ContextType>;
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

export type GqlSUserResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['User'] = GqlSResolversParentTypes['User'],
> = ResolversObject<{
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

export type GqlSResolvers<ContextType = any> = ResolversObject<{
    Admin?: GqlSAdminResolvers<ContextType>;
    AdminMutation?: GqlSAdminMutationResolvers<ContextType>;
    Chat?: GqlSChatResolvers<ContextType>;
    ChatAssistantInput?: GqlSChatAssistantInputResolvers<ContextType>;
    ChatAssistantInputBoolean?: GqlSChatAssistantInputBooleanResolvers<ContextType>;
    ChatAssistantInputDate?: GqlSChatAssistantInputDateResolvers<ContextType>;
    ChatAssistantInputDateRange?: GqlSChatAssistantInputDateRangeResolvers<ContextType>;
    ChatAssistantInputDateTime?: GqlSChatAssistantInputDateTimeResolvers<ContextType>;
    ChatAssistantInputMultiSelect?: GqlSChatAssistantInputMultiSelectResolvers<ContextType>;
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
    Date?: GraphQLScalarType;
    DateTime?: GraphQLScalarType;
    FileUpload?: GqlSFileUploadResolvers<ContextType>;
    JSON?: GraphQLScalarType;
    Mutation?: GqlSMutationResolvers<ContextType>;
    MutationResult?: GqlSMutationResultResolvers<ContextType>;
    Query?: GqlSQueryResolvers<ContextType>;
    Session?: GqlSSessionResolvers<ContextType>;
    Subscription?: GqlSSubscriptionResolvers<ContextType>;
    User?: GqlSUserResolvers<ContextType>;
    UserMutation?: GqlSUserMutationResolvers<ContextType>;
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

export function GqlSChatAssistantOptionsSchema(): z.ZodObject<Properties<GqlSChatAssistantOptions>> {
    return z.object({
        generationId: z.string().nullish(),
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
