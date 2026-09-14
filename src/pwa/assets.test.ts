import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

function pngSize(path: string) {
  const data = readFileSync(new URL(path, import.meta.url))
  expect(data.subarray(1, 4).toString()).toBe('PNG')
  expect(data.byteLength).toBeGreaterThan(2_000)
  return [data.readUInt32BE(16), data.readUInt32BE(20)]
}

describe('PWA identity assets', () => {
  it('ships correctly sized raster icons and aligned graphite manifest colors', () => {
    expect(pngSize('../../public/icon-192.png')).toEqual([192, 192])
    expect(pngSize('../../public/icon-512.png')).toEqual([512, 512])
    const config = readFileSync(new URL('../../vite.config.ts', import.meta.url), 'utf8')
    expect(config.match(/#15171a/g)).toHaveLength(2)
    expect(config).toContain("src: 'icon-192.png'")
    expect(config).toContain("src: 'icon-512.png'")
  })
})
