// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { muscleIds } from '../../db/catalogValidation'
import { AnatomyMap } from './AnatomyMap'

describe('AnatomyMap', () => {
  it('labels and distinguishes primary and secondary muscles', () => {
    render(<AnatomyMap primary={['chest']} secondary={['triceps']} view="front" label="Грудь и трицепс" />)

    expect(screen.getByRole('img', { name: 'Грудь и трицепс' })).toBeVisible()
    expect(screen.getByTestId('muscle-chest')).toHaveAttribute('data-intensity', 'primary')
    expect(screen.getByTestId('muscle-triceps')).toHaveAttribute('data-intensity', 'secondary')
    expect(screen.getByTestId('muscle-quadriceps')).toHaveAttribute('data-intensity', 'neutral')
  })

  it.each(['front', 'back', 'both'] as const)('renders only the requested %s view', (view) => {
    const { container } = render(<AnatomyMap primary={[]} secondary={[]} view={view} label="Muscle map" />)

    expect(screen.getAllByRole('img')).toHaveLength(1)
    expect([...container.querySelectorAll('[data-body-view]')].map((figure) => figure.getAttribute('data-body-view')))
      .toEqual(view === 'both' ? ['front', 'back'] : [view])
    expect(container.querySelector('text')).not.toBeInTheDocument()
  })

  it('exposes a visible filled path for every canonical muscle, including the extra regions', () => {
    const { container } = render(<AnatomyMap primary={muscleIds} secondary={[]} view="both" label="All muscles" />)

    for (const muscle of muscleIds) {
      const regions = container.querySelectorAll(`[data-muscle="${muscle}"]`)
      expect(regions.length, muscle).toBeGreaterThan(0)
      for (const region of regions) {
        expect(region, muscle).toHaveAttribute('data-intensity', 'primary')
        const path = region.querySelector('path')
        expect(path, muscle).toBeVisible()
        expect(path?.getAttribute('d'), muscle).toMatch(/^M.+Z$/)
        expect(path, muscle).toHaveAttribute('fill', 'var(--color-muscle-primary)')
      }
    }

    expect(container.querySelector('[data-body-view="front"] [data-muscle="hip-flexors"]')).toBeInTheDocument()
    expect(container.querySelector('[data-body-view="back"] [data-muscle="rotator-cuff"]')).toBeInTheDocument()
  })

  it('uses solid primary regions and a local striped pattern for secondary regions', () => {
    const { container } = render(<AnatomyMap primary={['chest']} secondary={['biceps']} view="front" label="Chest and biceps" />)
    const primaryPath = screen.getByTestId('muscle-chest').querySelector('path')
    const secondaryPath = screen.getByTestId('muscle-biceps').querySelector('path')
    const pattern = container.querySelector('pattern')

    expect(primaryPath).toHaveAttribute('fill', 'var(--color-muscle-primary)')
    expect(secondaryPath).toHaveAttribute('fill', `url(#${pattern?.id})`)
    expect(pattern?.querySelector('rect')).toHaveAttribute('fill', 'var(--color-muscle-secondary)')
    expect(pattern?.querySelector('path')).toHaveAttribute('stroke', 'var(--color-surface-elevated)')
  })

  it('gives primary priority when input arrays overlap and updates existing highlights', () => {
    const { rerender } = render(<AnatomyMap primary={['chest']} secondary={['chest', 'biceps']} view="front" label="Chest" />)
    expect(screen.getByTestId('muscle-chest')).toHaveAttribute('data-intensity', 'primary')

    rerender(<AnatomyMap primary={['biceps']} secondary={[]} view="front" label="Biceps" />)
    expect(screen.getByRole('img', { name: 'Biceps' })).toBeVisible()
    expect(screen.getByTestId('muscle-chest')).toHaveAttribute('data-intensity', 'neutral')
    expect(screen.getByTestId('muscle-biceps')).toHaveAttribute('data-intensity', 'primary')
  })

  it('keeps DOM ids and internal pattern references independent across maps and both views', () => {
    const { container } = render(<>
      <AnatomyMap primary={['chest']} secondary={['triceps']} view="both" label="Chest and triceps" />
      <AnatomyMap primary={['lats']} secondary={['triceps']} view="both" label="Back and triceps" />
    </>)

    const ids = [...container.querySelectorAll('[id]')].map((element) => element.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const map of screen.getAllByRole('img')) {
      const testIds = [...map.querySelectorAll('[data-testid]')].map((element) => element.getAttribute('data-testid'))
      expect(new Set(testIds).size).toBe(testIds.length)
      for (const path of map.querySelectorAll('[fill^="url("]')) {
        const id = path.getAttribute('fill')?.slice(5, -1)
        expect([...map.querySelectorAll('pattern')].some((pattern) => pattern.id === id)).toBe(true)
      }
    }
  })

  it.each([
    { size: 'sm' as const, height: 72 },
    { size: 'md' as const, height: 160 },
    { size: 'lg' as const, height: 320 },
    { size: 96, height: 96 },
  ])('reserves proportional space at size $size and can shrink to its container', ({ size, height }) => {
    render(<AnatomyMap primary={[]} secondary={[]} view="both" size={size} label="Muscle map" />)
    const map = screen.getByRole('img')

    expect(map).toHaveAttribute('height', String(height))
    expect(map).toHaveAttribute('width', String(height))
    expect(map).toHaveAttribute('viewBox', '0 0 400 400')
    expect(map).toHaveStyle({ maxWidth: '100%', height: 'auto' })
  })

  it('bundles inline geometry without remote references, scripts, or raster images', () => {
    const { container } = render(<AnatomyMap primary={[]} secondary={[]} view="both" label="Muscle map" />)

    expect(container.querySelector('image, img, use, script, foreignObject')).not.toBeInTheDocument()
    expect(container.querySelector('[href], [src]')).not.toBeInTheDocument()
    expect(screen.getByRole('img')).toHaveAttribute('focusable', 'false')
  })
})
