import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ErrorState } from "../components/ErrorState.tsx";
import { LoadingState } from "../components/LoadingState.tsx";
import { MemoForm } from "../components/MemoForm.tsx";
import { Page } from "../components/Page.tsx";
import { useMemos } from "../hooks/useMemos.ts";

export function MemoEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { memos, status, retryLoad, updateMemo } = useMemos();
  const memo = memos.find((item) => item.id === id);

  useEffect(() => {
    document.title = "メモを編集";
  }, []);

  if (status === "loading") {
    return (
      <Page title="メモを編集" center>
        <LoadingState />
      </Page>
    );
  }

  if (status === "error") {
    return (
      <Page title="メモを編集" center>
        <ErrorState onRetry={retryLoad} />
      </Page>
    );
  }

  if (!memo) {
    return (
      <Page title="メモを編集" center>
        <div className="not-found">
          <p>メモが見つかりません。</p>
          <Link to="/" className="btn btn-primary">
            一覧へ戻る
          </Link>
        </div>
      </Page>
    );
  }

  return (
    <Page title="メモを編集">
      <MemoForm
        key={memo.id}
        mode="edit"
        initialContent={memo.content}
        onSave={async (content) => {
          await updateMemo(memo.id, content);
          navigate("/");
        }}
      />
    </Page>
  );
}
