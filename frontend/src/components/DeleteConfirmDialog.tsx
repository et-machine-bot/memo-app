import { useEffect, useRef, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";

const PREVIEW_LIMIT = 40;

function previewSnippet(content: string): string {
  const chars = [...content.trim()];
  if (chars.length <= PREVIEW_LIMIT) return content;
  return `${chars.slice(0, PREVIEW_LIMIT - 1).join("")}…`;
}

export function DeleteConfirmDialog({
  content,
  pending,
  error,
  onCancel,
  onConfirm,
}: {
  content: string;
  pending: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    cancelRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      if (!pending) onCancel();
      return;
    }
    if (event.key !== "Tab" || !dialogRef.current) return;
    const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>("button:not(:disabled)")];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (!pending && event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        className="modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-desc"
        ref={dialogRef}
        onKeyDown={onKeyDown}
        data-testid="delete-dialog"
      >
        <h2 id="delete-dialog-title">メモを削除しますか？</h2>
        <p id="delete-dialog-desc" className="modal-desc">
          この操作は取り消せません。選択したメモが完全に削除されます。
        </p>
        <div className="modal-preview">{previewSnippet(content)}</div>
        {error && (
          <p className="modal-error" role="alert" data-testid="delete-error">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button ref={cancelRef} type="button" className="btn btn-ghost" onClick={onCancel} disabled={pending}>
            キャンセル
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={pending}>
            削除する
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
