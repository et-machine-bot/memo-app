import { Link } from "react-router-dom";
import { Icon } from "./Icon.tsx";

export function EmptyState() {
  return (
    <div className="empty-state" data-testid="empty-state">
      <Icon name="empty" />
      <h2>メモがまだありません</h2>
      <p>「新規メモ」から最初のメモを作成しましょう</p>
      <Link to="/new" className="btn btn-primary">
        <Icon name="plus" />
        新規メモを作成
      </Link>
    </div>
  );
}
