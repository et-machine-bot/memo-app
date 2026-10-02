import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { memoApi } from "../api/mockMemoApi.ts";
import type { Memo } from "../types/memo.ts";
import { MemoStateContext, type ListStatus, type MemoState } from "./memo-context.ts";

export function MemoProvider({ children }: { children: ReactNode }) {
  const initialListMode = useRef(new URLSearchParams(window.location.search).get("list"));
  const [memos, setMemos] = useState<Memo[]>([]);
  const [status, setStatus] = useState<ListStatus>("loading");
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [loadCount, setLoadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const mode = loadCount === 0 ? initialListMode.current : null;
    memoApi
      .listMemos({
        fail: mode === "error",
        slow: mode === "loading",
      })
      .then(
        (data) => {
          if (cancelled) return;
          setMemos(data);
          setStatus("ready");
        },
        () => {
          if (cancelled) return;
          setStatus("error");
        },
      );
    return () => {
      cancelled = true;
    };
  }, [loadCount]);

  useEffect(() => {
    if (!snackbar) return;
    const timer = window.setTimeout(() => setSnackbar(null), 3200);
    return () => window.clearTimeout(timer);
  }, [snackbar]);

  const retryLoad = useCallback(() => {
    setStatus("loading");
    setLoadCount((count) => count + 1);
  }, []);

  const createMemo = useCallback(async (content: string) => {
    await memoApi.createMemo(content);
    setMemos(memoApi.getSnapshot());
    setStatus("ready");
    setSnackbar("メモを保存しました");
  }, []);

  const updateMemo = useCallback(async (id: string, content: string) => {
    await memoApi.updateMemo(id, content);
    setMemos(memoApi.getSnapshot());
    setStatus("ready");
    setSnackbar("メモを更新しました");
  }, []);

  const deleteMemo = useCallback(async (id: string) => {
    await memoApi.deleteMemo(id);
    setMemos(memoApi.getSnapshot());
    setStatus("ready");
  }, []);

  const dismissSnackbar = useCallback(() => setSnackbar(null), []);

  const value = useMemo<MemoState>(
    () => ({
      memos,
      status,
      snackbar,
      retryLoad,
      createMemo,
      updateMemo,
      deleteMemo,
      dismissSnackbar,
    }),
    [memos, status, snackbar, retryLoad, createMemo, updateMemo, deleteMemo, dismissSnackbar],
  );

  return <MemoStateContext value={value}>{children}</MemoStateContext>;
}
