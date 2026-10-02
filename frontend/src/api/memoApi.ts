import { apiBaseUrl } from "./config.ts";
import { ApiError, apiErrorFromBody, networkApiError } from "./errors.ts";
import type { Memo } from "../types/memo.ts";

const memosUrl = `${apiBaseUrl.replace(/\/+$/, "")}/api/memos`;

function memoUrl(id: string): string {
  return `${memosUrl}/${encodeURIComponent(id)}`;
}

async function send(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw networkApiError();
  }
}

async function throwIfNotOk(response: Response): Promise<void> {
  if (response.ok) return;
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }
  throw apiErrorFromBody(response.status, body);
}

async function readJson(response: Response): Promise<unknown> {
  await throwIfNotOk(response);
  try {
    return await response.json();
  } catch {
    throw new ApiError("internal_error", "サーバーの応答を読み取れませんでした");
  }
}

function isMemo(value: unknown): value is Memo {
  if (typeof value !== "object" || value === null) return false;
  const memo = value as Record<string, unknown>;
  return (
    typeof memo.id === "string" &&
    typeof memo.content === "string" &&
    typeof memo.created_at === "string" &&
    typeof memo.updated_at === "string"
  );
}

function asMemo(value: unknown): Memo {
  if (!isMemo(value)) {
    throw new ApiError("internal_error", "サーバーの応答を読み取れませんでした");
  }
  return value;
}

function jsonRequest(method: "POST" | "PUT", content: string): RequestInit {
  return {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content }),
  };
}

export const memoApi = {
  baseUrl: apiBaseUrl,

  async listMemos(): Promise<Memo[]> {
    const body = await readJson(
      await send(memosUrl, {
        headers: { Accept: "application/json" },
      }),
    );
    if (!Array.isArray(body) || !body.every(isMemo)) {
      throw new ApiError("internal_error", "サーバーの応答を読み取れませんでした");
    }
    return body;
  },

  async createMemo(content: string): Promise<Memo> {
    return asMemo(await readJson(await send(memosUrl, jsonRequest("POST", content))));
  },

  async updateMemo(id: string, content: string): Promise<Memo> {
    return asMemo(await readJson(await send(memoUrl(id), jsonRequest("PUT", content))));
  },

  async deleteMemo(id: string): Promise<void> {
    const response = await send(memoUrl(id), {
      method: "DELETE",
      headers: { Accept: "application/json" },
    });
    await throwIfNotOk(response);
  },
};
