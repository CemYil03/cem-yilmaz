// Catalog of chat models the admin can pick from on `/workspace/assistant`.
//
// Lives in code (not the DB) because the list is a deployment-time concern —
// adding/removing a model is a code change anyway (the provider needs to know
// the model id is valid). The persisted `AdminChatConfig.defaultModelId` row
// references one of these ids; if a previously-saved id is removed from the
// catalog in a future deploy, `serverRuntime.ai.userConversationModel` will
// throw at agent-startup time and the resolver falls back to the first entry.
//
// `supportedMediaTypes` drives both the composer's file picker `accept` filter
// (the picker hides incompatible files) and the upstream Gemini call's
// expected attachment shape. Flash entries cover images + PDFs + plain-text
// formats; Pro entries additionally accept Word documents and other
// office/structured types. Refine as we learn what each model actually
// tolerates inline.

export interface AdminChatModelDefinition {
    /** Provider model id passed to `@ai-sdk/google` `google(modelId)`. */
    modelId: AdminChatModelId;
    /** User-facing label rendered in the composer dropdown. */
    label: string;
    /** IANA media types the model accepts as inline attachments. */
    supportedMediaTypes: readonly string[];
}

export type AdminChatModelId = 'gemini-2.5-flash' | 'gemini-2.5-pro' | 'gemini-3.5-flash' | 'gemini-3.1-pro-preview';

// Common attachment surface: images, PDFs, and plain-text formats. Every
// model in the catalog accepts at least this set.
const FLASH_MEDIA_TYPES: readonly string[] = [
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/pdf',
    'text/plain',
    'text/markdown',
    'text/csv',
];

// Pro tier additionally takes Word docs and other structured/office formats.
// Keeping the Flash list as the prefix means upgrading a model from flash to
// pro is purely additive — clients can compare by length / superset relation.
const PRO_MEDIA_TYPES: readonly string[] = [
    ...FLASH_MEDIA_TYPES,
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/json',
    'application/xml',
    'text/html',
    'text/xml',
];

export const ADMIN_CHAT_MODELS: readonly AdminChatModelDefinition[] = [
    { modelId: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', supportedMediaTypes: FLASH_MEDIA_TYPES },
    { modelId: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', supportedMediaTypes: PRO_MEDIA_TYPES },
    { modelId: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash', supportedMediaTypes: FLASH_MEDIA_TYPES },
    { modelId: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro (preview)', supportedMediaTypes: PRO_MEDIA_TYPES },
];

const ADMIN_CHAT_MODEL_IDS: readonly AdminChatModelId[] = ADMIN_CHAT_MODELS.map((model) => model.modelId);

// First entry is the canonical fallback when a saved default goes missing
// (renamed/removed in a deploy) and when an admin's first chat fires before
// the singleton row has been bootstrapped.
export const ADMIN_CHAT_MODEL_FALLBACK_ID: AdminChatModelId = 'gemini-2.5-flash';

export function isAdminChatModelId(modelId: string): modelId is AdminChatModelId {
    return ADMIN_CHAT_MODEL_IDS.includes(modelId as AdminChatModelId);
}
