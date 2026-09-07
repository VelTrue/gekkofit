let lastTimestampMs = 0

export function nextTimestamp(): string {
  lastTimestampMs = Math.max(Date.now(), lastTimestampMs + 1)
  return new Date(lastTimestampMs).toISOString()
}
