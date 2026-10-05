/** Shared formatting helpers — safe for client and server. */

/** Format bytes -> human-readable (e.g. "1.5 MB"). */
export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(k)),
    sizes.length - 1,
  );
  const val = bytes / Math.pow(k, i);
  return `${val.toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

/** Format a unix-ms timestamp as a Persian (fa-IR) date. */
export function formatDate(ts: number | Date): string {
  try {
    const d = typeof ts === "number" ? new Date(ts) : ts;
    return d.toLocaleDateString("fa-IR");
  } catch {
    return new Date(ts as never).toLocaleDateString();
  }
}
