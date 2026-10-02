export type ApiErrorCode = "validation_error" | "not_found" | "internal_error";

export class ApiError extends Error {
  readonly code: ApiErrorCode;

  constructor(code: ApiErrorCode, message: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

const SERVER_MESSAGES: Record<string, string> = {
  "content is required": "内容を入力してください",
  "content must be at most 10000 characters": "内容は10000文字以内で入力してください",
  "invalid request body": "リクエストの形式が正しくありません",
  "request body is too large": "リクエストが大きすぎます",
  "memo not found": "メモが見つかりません",
  "internal error": "サーバーでエラーが発生しました",
};

/** ブラウザがサーバーに届かなかったとき。 */
export function networkApiError(): ApiError {
  return new ApiError("internal_error", "ネットワーク接続を確認して、もう一度お試しください。");
}

/**
 * Backend の `{ "error": { "code", "message" } }` を ApiError にする。
 * 既知の英語メッセージは画面用の日本語に揃える。
 */
export function apiErrorFromBody(status: number, body: unknown): ApiError {
  const error = errorDetail(body);
  const code = toErrorCode(error?.code, status);
  const rawMessage = error?.message?.trim() ?? "";
  const message = rawMessage ? (SERVER_MESSAGES[rawMessage] ?? rawMessage) : fallbackMessage(code);
  return new ApiError(code, message);
}

function errorDetail(body: unknown): { code?: string; message?: string } | undefined {
  if (!isRecord(body) || !isRecord(body.error)) return undefined;
  const code = typeof body.error.code === "string" ? body.error.code : undefined;
  const message = typeof body.error.message === "string" ? body.error.message : undefined;
  return { code, message };
}

function toErrorCode(code: string | undefined, status: number): ApiErrorCode {
  if (code === "validation_error" || code === "not_found" || code === "internal_error") {
    return code;
  }
  if (status === 400) return "validation_error";
  if (status === 404) return "not_found";
  return "internal_error";
}

function fallbackMessage(code: ApiErrorCode): string {
  if (code === "validation_error") return "入力内容を確認してください";
  if (code === "not_found") return "メモが見つかりません";
  return "サーバーでエラーが発生しました";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
