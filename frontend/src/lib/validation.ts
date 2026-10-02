/** Backend と同じ上限（EAS-88）。 */
export const MAX_CONTENT_LENGTH = 10_000;

export type ContentValidation = "empty" | "too_long";

export function validateMemoContent(content: string): ContentValidation | null {
  const trimmed = content.trim();
  if (trimmed.length === 0) return "empty";
  if ([...trimmed].length > MAX_CONTENT_LENGTH) return "too_long";
  return null;
}
