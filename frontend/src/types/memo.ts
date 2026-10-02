/** Backend `Memo` と同じ形（EAS-88）。日時は RFC3339。 */
export interface Memo {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
}
