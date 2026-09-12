import { muscleIds, type MuscleId } from '../../db/catalogValidation'
import frontSource from './body-front.svg?raw'
import backSource from './body-back.svg?raw'

export type BodyView = 'front' | 'back'

interface BodyGeometry {
  silhouette: string
  muscles: Readonly<Partial<Record<MuscleId, string>>>
}

// Read only the closed paths in our bundled, deliberately simple SVG format.
// The SVG files remain the sole geometry source; no HTML is injected into React.
function readGeometry(source: string, view: BodyView): BodyGeometry {
  const silhouette = source.match(/<path data-body="[^"]+"[^>]* d="([^"]+)"/)?.[1]
  if (!silhouette) throw new Error(`Missing ${view} body silhouette`)

  const muscles: Partial<Record<MuscleId, string>> = {}
  for (const match of source.matchAll(/<path data-muscle="([^"]+)" d="([^"]+)"/g)) {
    const muscle = muscleIds.find((id) => id === match[1])
    if (!muscle) throw new Error(`Unknown ${view} muscle: ${match[1]}`)
    muscles[muscle] = match[2]
  }
  return { silhouette, muscles }
}

export const musclePaths: Readonly<Record<BodyView, BodyGeometry>> = {
  front: readGeometry(frontSource, 'front'),
  back: readGeometry(backSource, 'back'),
}
