import { useContext } from "react";
import { MemoStateContext, type MemoState } from "../state/memo-context.ts";

export function useMemos(): MemoState {
  const value = useContext(MemoStateContext);
  if (!value) {
    throw new Error("useMemos must be used within MemoProvider");
  }
  return value;
}
