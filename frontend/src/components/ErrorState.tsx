import { Icon } from "./Icon.tsx";

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="error-card" role="alert" data-testid="error-state">
      <h2>読み込みに失敗しました</h2>
      <p>ネットワーク接続を確認して、もう一度お試しください。</p>
      <button type="button" className="btn btn-primary" onClick={onRetry}>
        <Icon name="refresh" className="icon-on-primary" />
        再試行
      </button>
    </div>
  );
}
