function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function formatClock(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatAbsolute(date: Date): string {
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${formatClock(date)}`;
}

/**
 * 一覧の相対時刻。
 * 同じ日は「10分前」「2時間前」、前日は「昨日 18:42」、それ以外は「2026/09/28 09:15」。
 */
export function formatMemoTimestamp(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const dayDiff = Math.round((startOfLocalDay(now) - startOfLocalDay(date)) / 86_400_000);
  if (dayDiff <= 0) {
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60_000);
    if (diffMinutes < 1) return "たった今";
    if (diffMinutes < 60) return `${diffMinutes}分前`;
    return `${Math.floor(diffMinutes / 60)}時間前`;
  }
  if (dayDiff === 1) return `昨日 ${formatClock(date)}`;
  return formatAbsolute(date);
}
