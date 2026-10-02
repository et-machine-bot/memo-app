import { useMemos } from "../hooks/useMemos.ts";

export function Snackbar() {
  const { snackbar, dismissSnackbar } = useMemos();
  if (!snackbar) return null;
  return (
    <div className="snackbar" role="status" data-testid="snackbar" onClick={dismissSnackbar}>
      {snackbar}
    </div>
  );
}
