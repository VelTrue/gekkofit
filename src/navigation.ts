import type { ScreenName } from './components/NavBar'

const screens: readonly ScreenName[] = ['workout', 'progress', 'history', 'settings']

/** Hash routes keep tabs addressable and let the browser Back button switch screens. */
export function screenHash(screen: ScreenName): string {
  return `#/${screen}`
}

export function screenFromHash(hash: string): ScreenName {
  const name = hash.replace(/^#\/?/, '')
  return (screens as readonly string[]).includes(name) ? name as ScreenName : 'workout'
}
