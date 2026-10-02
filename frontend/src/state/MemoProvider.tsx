import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ApiError } from "../api/errors.ts";
import { memoApi } from "../api/memoApi.ts";
import type { Memo } from "../types/memo.ts";
import { MemoStateContext, type ListStatus, type MemoState } from "./memo-context.ts";

function sortMemos(memos: Memo[]): Memo[] {
  return [...memos].sort((a, b) => {
    if (a.updated_at === b.updated_at) {
      return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
    }
    return a.updated_at < b.updated_at ? 1 : -1;
  });
}

function upsertMemo(memos: Memo[], memo: Memo): Memo[] {
  const exists = memos.some((item) => item.id === memo.id);
  const next = exists ? memos.map((item) => (item.id === memo.id ? memo : item)) : [memo, ...memos];
  return sortMemos(next);
}

export function MemoProvider({ children }: { children: ReactNode }) {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [status, setStatus] = useState<ListStatus>("loading");
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [loadCount, setLoadCount] = useState(0);
  const requestSeq = useRef(0);
  const memosRef = useRef(memos);

  useEffect(() => {
    memosRef.current = memos;
  }, [memos]);

  useEffect(() => {
    const seq = ++requestSeq.current;
    let cancelled = false;
    memoApi.listMemos().then(
      (data) => {
        if (cancelled || seq !== requestSeq.current) return;
        setMemos(data);
        setStatus("ready");
      },
      () => {
        if (cancelled || seq !== requestSeq.current) return;
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

  const replaceFromServer = useCallback(async (fallback: Memo[]) => {
    const seq = ++requestSeq.current;
    try {
      const data = await memoApi.listMemos();
      if (seq !== requestSeq.current) return;
      setMemos(data);
    } catch {
      if (seq !== requestSeq.current) return;
      setMemos(fallback);
    }
    setStatus("ready");
  }, []);

  const retryLoad = useCallback(() => {
    setStatus("loading");
    setLoadCount((count) => count + 1);
  }, []);

  const createMemo = useCallback(
    async (content: string) => {
      const created = await memoApi.createMemo(content);
      await replaceFromServer(upsertMemo(memosRef.current, created));
      setSnackbar("メモを保存しました");
    },
    [replaceFromServer],
  );

  const updateMemo = useCallback(
    async (id: string, content: string) => {
      let updated: Memo;
      try {
        updated = await memoApi.updateMemo(id, content);
      } catch (error) {
        if (error instanceof ApiError && error.code === "not_found") {
          requestSeq.current += 1;
          setMemos((current) => current.filter((memo) => memo.id !== id));
          setStatus("ready");
        }
        throw error;
      }
      await replaceFromServer(upsertMemo(memosRef.current, updated));
      setSnackbar("メモを更新しました");
    },
    [replaceFromServer],
  );

  const deleteMemo = useCallback(
    async (id: string) => {
      try {
        await memoApi.deleteMemo(id);
      } catch (error) {
        if (!(error instanceof ApiError && error.code === "not_found")) {
          throw error;
        }
      }
      await replaceFromServer(memosRef.current.filter((memo) => memo.id !== id));
    },
    [replaceFromServer],
  );

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
