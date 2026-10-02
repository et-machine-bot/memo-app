import { createContext } from "react";
import type { Memo } from "../types/memo.ts";

export type ListStatus = "loading" | "error" | "ready";

export interface MemoState {
  memos: Memo[];
  status: ListStatus;
  snackbar: string | null;
  retryLoad: () => void;
  createMemo: (content: string) => Promise<void>;
  updateMemo: (id: string, content: string) => Promise<void>;
  deleteMemo: (id: string) => Promise<void>;
  dismissSnackbar: () => void;
}

export const MemoStateContext = createContext<MemoState | null>(null);
