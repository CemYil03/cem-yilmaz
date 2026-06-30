import './generated';

declare module './generated' {
    export interface GqlSSession {
        userId?: string | null | undefined;
    }
    export interface GqlSUserMutation {
        userId: string;
    }
    // Workspace namespaces — the read shell hangs off `User.admin` (nullable;
    // null for non-admins) and the write shell is `Mutation.admin`, gated by
    // `guardAdminMutation`. Both check the `isAdmin` flag on the requesting
    // session's `Users` row; set the flag manually in the DB for Cem's
    // accounts. See `docs/architecture/workspace-access.md`.
    export interface GqlSAdmin {
        userId?: string;
    }
    export interface GqlSAdminMutation {
        userId: string;
    }

    // --- ChatMessage union --------------------------------------------------
    export interface GqlSChatMessageUser {
        gqlTypeName: 'ChatMessageUser';
    }
    export interface GqlSChatMessageUserInput {
        gqlTypeName: 'ChatMessageUserInput';
    }
    export interface GqlSChatMessageAssistantText {
        gqlTypeName: 'ChatMessageAssistantText';
    }
    export interface GqlSChatMessageToolCall {
        gqlTypeName: 'ChatMessageToolCall';
    }
    export interface GqlSChatMessageToolApprovalRequest {
        gqlTypeName: 'ChatMessageToolApprovalRequest';
    }
    export interface GqlSChatMessageToolApprovalResponse {
        gqlTypeName: 'ChatMessageToolApprovalResponse';
    }
    export interface GqlSChatMessageAssistantInputCollection {
        gqlTypeName: 'ChatMessageAssistantInputCollection';
    }

    // --- ChatAssistantInput union -------------------------------------------
    export interface GqlSChatAssistantInputDate {
        gqlTypeName: 'ChatAssistantInputDate';
    }
    export interface GqlSChatAssistantInputDateRange {
        gqlTypeName: 'ChatAssistantInputDateRange';
    }
    export interface GqlSChatAssistantInputDateTime {
        gqlTypeName: 'ChatAssistantInputDateTime';
    }
    export interface GqlSChatAssistantInputTime {
        gqlTypeName: 'ChatAssistantInputTime';
    }
    export interface GqlSChatAssistantInputSingleSelect {
        gqlTypeName: 'ChatAssistantInputSingleSelect';
    }
    export interface GqlSChatAssistantInputMultiSelect {
        gqlTypeName: 'ChatAssistantInputMultiSelect';
    }
    export interface GqlSChatAssistantInputBoolean {
        gqlTypeName: 'ChatAssistantInputBoolean';
    }
    export interface GqlSChatAssistantInputText {
        gqlTypeName: 'ChatAssistantInputText';
    }
    export interface GqlSChatAssistantInputOtp {
        gqlTypeName: 'ChatAssistantInputOtp';
    }

    // --- ChatUpdate union --------------------------------------------------
    export interface GqlSChatUpdateMessageAppended {
        gqlTypeName: 'ChatUpdateMessageAppended';
    }
    export interface GqlSChatUpdateAssistantTextChunk {
        gqlTypeName: 'ChatUpdateAssistantTextChunk';
    }
    export interface GqlSChatUpdateTurnEnded {
        gqlTypeName: 'ChatUpdateTurnEnded';
    }

    // --- ChatAssistantInputValue union --------------------------------------
    export interface GqlSChatAssistantInputValueDate {
        gqlTypeName: 'ChatAssistantInputValueDate';
    }
    export interface GqlSChatAssistantInputValueDateRange {
        gqlTypeName: 'ChatAssistantInputValueDateRange';
    }
    export interface GqlSChatAssistantInputValueDateTime {
        gqlTypeName: 'ChatAssistantInputValueDateTime';
    }
    export interface GqlSChatAssistantInputValueTime {
        gqlTypeName: 'ChatAssistantInputValueTime';
    }
    export interface GqlSChatAssistantInputValueString {
        gqlTypeName: 'ChatAssistantInputValueString';
    }
    export interface GqlSChatAssistantInputValueStringList {
        gqlTypeName: 'ChatAssistantInputValueStringList';
    }
    export interface GqlSChatAssistantInputValueBoolean {
        gqlTypeName: 'ChatAssistantInputValueBoolean';
    }
}
