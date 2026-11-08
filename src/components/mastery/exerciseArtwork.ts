/** Match exact catalog slugs; variants need their own exercise illustrations. */
const artwork: Record<string, string> = {
  'zhim-lezha-shtanga-1': 'barbell-bench-press.webp',
  'zhim-lezha-ganteli-2': 'dumbbell-bench-press-v2.webp',
  'zhim-lezha-nizhniy-blok-3': 'cable-bench-press.webp',
  'zhim-lezha-trenazher-smita-4': 'smith-bench-press.webp',
  'zhim-ot-grudi-sidya-trenazher-5': 'seated-machine-chest-press.webp',
  'zhim-ot-grudi-stoya-blok-6': 'standing-cable-chest-press.webp',
  'svedenie-ruk-lezha-ganteli-7': 'dumbbell-fly.webp',
  'svedenie-ruk-stoya-verhniy-blok-8': 'high-cable-fly.webp',
  'begovaya-dorozhka-trenazher-321': 'treadmill.webp',
}

export function exerciseArtwork(slug: string): string | undefined {
  const file = artwork[slug]
  return file ? `${import.meta.env.BASE_URL}exercises/${file}` : undefined
}
