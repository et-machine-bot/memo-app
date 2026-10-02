import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DeleteConfirmDialog } from "../components/DeleteConfirmDialog.tsx";
import { EmptyState } from "../components/EmptyState.tsx";
import { ErrorState } from "../components/ErrorState.tsx";
import { Icon } from "../components/Icon.tsx";
import { LoadingState } from "../components/LoadingState.tsx";
import { MemoCard } from "../components/MemoCard.tsx";
import { Page } from "../components/Page.tsx";
import { useMemos } from "../hooks/useMemos.ts";
import type { Memo } from "../types/memo.ts";

export function MemoListPage() {
  const { memos, status, retryLoad, deleteMemo } = useMemos();
  const navigate = useNavigate();
  const [pendingDelete, setPendingDelete] = useState<Memo | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const showList = status === "ready" && memos.length > 0;

  useEffect(() => {
    document.title = "メモ";
  }, []);

  return (
    <Page
      title="メモ"
      center={!showList}
      action={
        <Link to="/new" className="btn btn-primary">
          <Icon name="plus" />
          新規メモ
        </Link>
      }
    >
      {status === "loading" && <LoadingState />}
      {status === "error" && <ErrorState onRetry={retryLoad} />}
      {status === "ready" && memos.length === 0 && <EmptyState />}
      {showList && (
        <ul className="memo-list" data-testid="memo-list">
          {memos.map((memo) => (
            <li key={memo.id}>
              <MemoCard
                memo={memo}
                onEdit={() => navigate(`/memos/${memo.id}/edit`)}
                onDelete={() => setPendingDelete(memo)}
              />
            </li>
          ))}
        </ul>
      )}
      {pendingDelete && (
        <DeleteConfirmDialog
          content={pendingDelete.content}
          pending={deleting}
          error={deleteError}
          onCancel={() => {
            if (!deleting) {
              setPendingDelete(null);
              setDeleteError(null);
            }
          }}
          onConfirm={() => {
            const target = pendingDelete;
            setDeleting(true);
            setDeleteError(null);
            void deleteMemo(target.id)
              .then(() => {
                setPendingDelete(null);
                setDeleteError(null);
              })
              .catch(() => {
                setDeleteError("削除に失敗しました。もう一度お試しください。");
              })
              .finally(() => setDeleting(false));
          }}
        />
      )}
    </Page>
  );
}
