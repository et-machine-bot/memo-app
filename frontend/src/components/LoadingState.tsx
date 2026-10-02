import { Icon } from "./Icon.tsx";

export function LoadingState() {
  return (
    <div className="loading-state" role="status" data-testid="loading-state">
      <Icon name="spinner" className="icon-spin" />
      <p>読み込み中…</p>
    </div>
  );
}
