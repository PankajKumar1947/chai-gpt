import { mistral } from "@ai-sdk/mistral";

/** Default Mistral model used when a conversation has no model override. */
export const DEFAULT_CHAT_MODEL = "mistral-large-latest";

/**
 * Returns a Mistral language model instance for chat completions.
 *
 * @param modelId - Optional model identifier; falls back to {@link DEFAULT_CHAT_MODEL}.
 */
export function getChatModel(modelId?: string | null) {
    return mistral(modelId || DEFAULT_CHAT_MODEL)
}