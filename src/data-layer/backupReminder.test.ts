import { describe, expect, it } from 'vitest'
import { shouldShowBackupReminder } from './backupReminder'

describe('backup reminder', () => {
  it('does not remind a new user', () => expect(shouldShowBackupReminder(null, 2)).toBe(false))
  it('reminds after five workouts without export', () => expect(shouldShowBackupReminder(null, 5)).toBe(true))
  it('does not remind shortly after export', () => expect(shouldShowBackupReminder('2026-08-30T12:00:00Z', 50, new Date('2026-09-04T12:00:00Z'))).toBe(false))
  it('reminds fourteen days after export', () => expect(shouldShowBackupReminder('2026-08-20T12:00:00Z', 50, new Date('2026-09-04T12:00:00Z'))).toBe(true))
})
