const REMINDER_AFTER_DAYS = 14
const REMINDER_AFTER_WORKOUTS = 5

export function shouldShowBackupReminder(lastExportAt: string | null, workoutCount: number, now = new Date()): boolean {
  if (lastExportAt === null) return workoutCount >= REMINDER_AFTER_WORKOUTS
  const exportedAt = new Date(lastExportAt).getTime()
  if (!Number.isFinite(exportedAt)) return true
  return (now.getTime() - exportedAt) / 86_400_000 >= REMINDER_AFTER_DAYS
}
