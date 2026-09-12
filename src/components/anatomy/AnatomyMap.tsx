import { useId } from 'react'
import { muscleIds, type MuscleId } from '../../db/catalogValidation'
import { musclePaths, type BodyView } from './musclePaths'

export interface AnatomyMapProps {
  primary: readonly MuscleId[]
  secondary: readonly MuscleId[]
  view: BodyView | 'both'
  /** Preset or maximum height in CSS pixels. Width follows the requested views. */
  size?: 'sm' | 'md' | 'lg' | number
  /** Localized alternative text naming the highlighted muscles. */
  label: string
  className?: string
}

const heights = { sm: 72, md: 160, lg: 320 } as const

export function AnatomyMap({ primary, secondary, view, size = 'md', label, className }: AnatomyMapProps) {
  const instanceId = useId()
  const views: readonly BodyView[] = view === 'both' ? ['front', 'back'] : [view]
  const height = typeof size === 'number' && Number.isFinite(size) && size > 0
    ? size
    : typeof size === 'string' ? heights[size] : heights.md
  const width = height * views.length / 2
  const patternId = `${instanceId}-secondary`

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={label}
      focusable="false"
      viewBox={`0 0 ${views.length * 200} 400`}
      width={width}
      height={height}
      className={className}
      style={{ display: 'block', maxWidth: '100%', height: 'auto', flexShrink: 0 }}
    >
      <defs>
        <pattern id={patternId} width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill="var(--color-muscle-secondary)" />
          <path d="M-2 2 L2 -2 M0 8 L8 0 M6 10 L10 6" stroke="var(--color-surface-elevated)" strokeWidth="2.5" />
        </pattern>
      </defs>
      {views.map((bodyView, index) => (
        <g key={bodyView} data-body-view={bodyView} transform={`translate(${index * 200} 0)`} aria-hidden="true" strokeLinejoin="round">
          <path
            d={musclePaths[bodyView].silhouette}
            fill="var(--color-surface-elevated)"
            stroke="var(--color-border-strong)"
            strokeWidth="1.5"
          />
          {muscleIds.map((muscle) => {
            const path = musclePaths[bodyView].muscles[muscle]
            if (!path) return null
            const intensity = primary.includes(muscle) ? 'primary' : secondary.includes(muscle) ? 'secondary' : 'neutral'
            const fill = intensity === 'primary' ? 'var(--color-muscle-primary)'
              : intensity === 'secondary' ? `url(#${patternId})` : 'var(--color-divider-subtle)'

            return (
              <g
                key={muscle}
                id={`${instanceId}-${bodyView}-${muscle}`}
                data-muscle={muscle}
                data-intensity={intensity}
                data-testid={`muscle-${muscle}${view === 'both' ? `-${bodyView}` : ''}`}
              >
                <path
                  d={path}
                  fill={fill}
                  stroke={intensity === 'primary' ? 'var(--color-muscle-primary)'
                    : intensity === 'secondary' ? 'var(--color-muscle-secondary)' : 'var(--color-border-strong)'}
                  strokeWidth={intensity === 'neutral' ? 0.8 : 1.5}
                />
              </g>
            )
          })}
        </g>
      ))}
    </svg>
  )
}
