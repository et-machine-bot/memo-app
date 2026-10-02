import { formatMemoTimestamp } from "../lib/formatTimestamp.ts";
import type { Memo } from "../types/memo.ts";
import { Icon } from "./Icon.tsx";

export function MemoCard({
  memo,
  onEdit,
  onDelete,
}: {
  memo: Memo;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="memo-card" data-testid="memo-card">
      <p className="memo-card__body">{memo.content}</p>
      <div className="memo-card__footer">
        <time dateTime={memo.updated_at}>{formatMemoTimestamp(memo.updated_at)}</time>
        <div className="memo-card__actions">
          <button type="button" className="btn btn-muted" onClick={onEdit}>
            <Icon name="edit" />
            編集
          </button>
          <button type="button" className="btn btn-danger-ghost" onClick={onDelete}>
            <Icon name="delete" />
            削除
          </button>
        </div>
      </div>
    </article>
  );
}
