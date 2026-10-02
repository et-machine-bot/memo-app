import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../api/errors.ts";
import { validateMemoContent } from "../lib/validation.ts";
import { Icon } from "./Icon.tsx";

export function MemoForm({
  mode,
  initialContent,
  onSave,
}: {
  mode: "create" | "edit";
  initialContent: string;
  onSave: (content: string) => Promise<void>;
}) {
  const navigate = useNavigate();
  const [content, setContent] = useState(initialContent);
  const [pending, setPending] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const validation = validateMemoContent(content);
  const canSubmit = validation === null && !pending;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    setPending(true);
    setSaveError(null);
    try {
      await onSave(content.trim());
    } catch (error) {
      if (error instanceof ApiError && error.code === "not_found") {
        navigate("/", { replace: true });
        return;
      }
      setSaveError(
        error instanceof ApiError && error.code === "validation_error"
          ? error.message
          : "保存に失敗しました。もう一度お試しください。",
      );
      setPending(false);
    }
  };

  const submitLabel = pending ? "保存中…" : saveError ? "再試行" : mode === "create" ? "保存" : "更新";

  return (
    <form className="memo-form" onSubmit={onSubmit} noValidate data-testid="memo-form">
      <label className="field-label" htmlFor="memo-content">
        内容
      </label>
      <textarea
        id="memo-content"
        className={validation ? "textarea is-invalid" : "textarea"}
        value={content}
        onChange={(event) => {
          setContent(event.target.value);
          if (saveError) setSaveError(null);
        }}
        aria-invalid={validation !== null}
        aria-describedby={validation ? "memo-content-error" : saveError ? "memo-save-error" : undefined}
        disabled={pending}
      />
      {validation === "empty" && (
        <p id="memo-content-error" className="field-error" role="alert">
          内容を入力してください
        </p>
      )}
      {validation === "too_long" && (
        <p id="memo-content-error" className="field-error" role="alert">
          内容は10000文字以内で入力してください
        </p>
      )}
      {saveError && !validation && (
        <p id="memo-save-error" className="save-error" role="alert" data-testid="save-error">
          {saveError}
        </p>
      )}
      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={() => navigate("/")} disabled={pending}>
          キャンセル
        </button>
        <button
          type="submit"
          className={pending ? "btn btn-primary is-busy" : "btn btn-primary"}
          disabled={!canSubmit}
          data-testid="save-button"
        >
          {pending && <Icon name="spinner" size={16} className="icon-spin icon-on-primary" />}
          {submitLabel}
        </button>
      </div>
      {mode === "create" && validation === "empty" && (
        <p className="form-note">注: 空の内容では保存できません。入力後に「保存」が有効になります。</p>
      )}
    </form>
  );
}
