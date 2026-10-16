const units = ["B", "KB", "MB", "GB"] as const

/** 1536 → "1.5 KB". Used next to attachment names. */
export function formatBytes(bytes: number): string {
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${unit === 0 ? value : value.toFixed(1)} ${units[unit]}`
}
