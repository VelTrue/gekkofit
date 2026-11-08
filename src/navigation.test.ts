import { describe, expect, it } from 'vitest'
import { screenFromHash, screenHash } from './navigation'

describe('hash navigation', () => {
  it('round-trips every screen through the URL hash', () => {
    for (const screen of ['workout', 'progress', 'history', 'settings'] as const) {
      expect(screenFromHash(screenHash(screen))).toBe(screen)
    }
  })

  it('falls back to the workout screen for empty or unknown hashes', () => {
    expect(screenFromHash('')).toBe('workout')
    expect(screenFromHash('#/unknown')).toBe('workout')
    expect(screenFromHash('#history')).toBe('history')
  })
})
