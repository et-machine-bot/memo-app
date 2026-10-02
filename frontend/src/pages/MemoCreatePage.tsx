import { useEffect } from "react";
import { MemoForm } from "../components/MemoForm.tsx";
import { Page } from "../components/Page.tsx";
import { useMemos } from "../hooks/useMemos.ts";
import { useNavigate } from "react-router-dom";

export function MemoCreatePage() {
  const { createMemo } = useMemos();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "新規メモ";
  }, []);

  return (
    <Page title="新規メモ">
      <MemoForm
        mode="create"
        initialContent=""
        onSave={async (content) => {
          await createMemo(content);
          navigate("/");
        }}
      />
    </Page>
  );
}
