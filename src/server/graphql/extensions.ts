import './generated';

declare module './generated' {
    export interface GqlSSession {
        userId?: string | null | undefined;
    }
    export interface GqlSUserMutation {
        userId: string;
    }
    // Phase 1: visitors only — `Admin` and `AdminMutation` are gated by
    // `guardAdmin` and `guardAdminMutation` respectively, both permissive
    // today. The shapes still exist on both server and client so Phase 2's
    // workspace surface can land incrementally without an SDL refactor.
    export interface GqlSAdmin {
        userId?: string;
    }
    export interface GqlSAdminMutation {
        userId?: string;
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
