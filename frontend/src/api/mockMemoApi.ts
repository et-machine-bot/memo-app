import { apiBaseUrl } from "./config.ts";
import { ApiError } from "./errors.ts";
import { validateMemoContent } from "../lib/validation.ts";
import type { Memo } from "../types/memo.ts";

const LIST_DELAY_MS = 800;
const SLOW_LIST_DELAY_MS = 4000;
const SAVE_DELAY_MS = 900;
const DELETE_DELAY_MS = 400;

export const MOCK_MEMO_IDS = {
  meeting: "11111111-1111-4111-8111-111111111111",
  shopping: "22222222-2222-4222-8222-222222222222",
  idea: "33333333-3333-4333-8333-333333333333",
  reading: "44444444-4444-4444-8444-444444444444",
} as const;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function yesterdayAt(hour: number, minute: number): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function atLocal(year: number, month: number, day: number, hour: number, minute: number): string {
  return new Date(year, month - 1, day, hour, minute, 0, 0).toISOString();
}

function seedMemos(): Memo[] {
  return [
    {
      id: MOCK_MEMO_IDS.meeting,
      content: "明日のミーティング資料を確認する。アジェンダはプロジェクト進捗と次スプリントの優先度。",
      created_at: minutesAgo(10),
      updated_at: minutesAgo(10),
    },
    {
      id: MOCK_MEMO_IDS.shopping,
      content: "買い物リスト：牛乳、卵、パン、コーヒー豆。週末までに買う。",
      created_at: minutesAgo(120),
      updated_at: minutesAgo(120),
    },
    {
      id: MOCK_MEMO_IDS.idea,
      content: "アイデアメモ — メモアプリにタグ機能を追加すると検索が楽になりそう。MVP後の候補。",
      created_at: yesterdayAt(18, 42),
      updated_at: yesterdayAt(18, 42),
    },
    {
      id: MOCK_MEMO_IDS.reading,
      content: "読書メモ：良いデザインは目立たない。ユーザーのタスクを最短で完了させることが最優先。",
      created_at: atLocal(2026, 9, 28, 9, 15),
      updated_at: atLocal(2026, 9, 28, 9, 15),
    },
  ];
}

function initialMemos(): Memo[] {
  const mode = new URLSearchParams(window.location.search).get("list");
  if (mode === "empty") return [];
  return seedMemos();
}

let memos: Memo[] = initialMemos();
let failNextSave = false;

/**
 * 次の create / update を1回だけ失敗させる。
 * 画面側は `?saveError=1` の初回送信でこれを使う。再試行は成功する。
 */
export function armNextSaveFailure(): void {
  failNextSave = true;
}

function consumeSaveFailure(): boolean {
  if (!failNextSave) return false;
  failNextSave = false;
  return true;
}

function snapshot(): Memo[] {
  return [...memos]
    .sort((a, b) => (a.updated_at < b.updated_at ? 1 : a.updated_at > b.updated_at ? -1 : 0))
    .map((memo) => ({ ...memo }));
}

function requireContent(content: string): string {
  const validation = validateMemoContent(content);
  if (validation === "empty") {
    throw new ApiError("validation_error", "内容を入力してください");
  }
  if (validation === "too_long") {
    throw new ApiError("validation_error", "内容は10000文字以内で入力してください");
  }
  return content.trim();
}

export type ListMemosOptions = {
  fail?: boolean;
  slow?: boolean;
};

export const memoApi = {
  /** EAS-95 で fetch 先にする。モック実装では通信しない。 */
  baseUrl: apiBaseUrl,

  async listMemos(options?: ListMemosOptions): Promise<Memo[]> {
    await delay(options?.slow ? SLOW_LIST_DELAY_MS : LIST_DELAY_MS);
    if (options?.fail) {
      throw new ApiError("internal_error", "読み込みに失敗しました");
    }
    return snapshot();
  },

  async createMemo(content: string): Promise<Memo> {
    await delay(SAVE_DELAY_MS);
    const trimmed = requireContent(content);
    if (consumeSaveFailure()) {
      throw new ApiError("internal_error", "保存に失敗しました。もう一度お試しください。");
    }
    const now = new Date().toISOString();
    const memo: Memo = {
      id: crypto.randomUUID(),
      content: trimmed,
      created_at: now,
      updated_at: now,
    };
    memos = [memo, ...memos];
    return { ...memo };
  },

  async updateMemo(id: string, content: string): Promise<Memo> {
    await delay(SAVE_DELAY_MS);
    const trimmed = requireContent(content);
    if (consumeSaveFailure()) {
      throw new ApiError("internal_error", "保存に失敗しました。もう一度お試しください。");
    }
    const index = memos.findIndex((memo) => memo.id === id);
    const current = index === -1 ? undefined : memos[index];
    if (!current) {
      throw new ApiError("not_found", "メモが見つかりません");
    }
    const updated: Memo = {
      ...current,
      content: trimmed,
      updated_at: new Date().toISOString(),
    };
    memos = memos.map((memo) => (memo.id === id ? updated : memo));
    return { ...updated };
  },

  async deleteMemo(id: string): Promise<void> {
    await delay(DELETE_DELAY_MS);
    const exists = memos.some((memo) => memo.id === id);
    if (!exists) {
      throw new ApiError("not_found", "メモが見つかりません");
    }
    memos = memos.filter((memo) => memo.id !== id);
  },

  getSnapshot(): Memo[] {
    return snapshot();
  },
};
