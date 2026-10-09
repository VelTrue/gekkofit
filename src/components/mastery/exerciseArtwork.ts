/** Match exact catalog slugs; variants need their own exercise illustrations. */
const artwork: Record<string, string> = {
  'zhim-lezha-shtanga-1': 'barbell-bench-press.png',
  'zhim-lezha-ganteli-2': 'dumbbell-bench-press-v2.png',
  'zhim-lezha-nizhniy-blok-3': 'cable-bench-press.png',
  'zhim-lezha-trenazher-smita-4': 'smith-bench-press.png',
  'zhim-ot-grudi-sidya-trenazher-5': 'seated-machine-chest-press.png',
  'zhim-ot-grudi-stoya-blok-6': 'standing-cable-chest-press.png',
  'svedenie-ruk-lezha-ganteli-7': 'dumbbell-fly.png',
  'svedenie-ruk-stoya-verhniy-blok-8': 'high-cable-fly.png',
  'begovaya-dorozhka-trenazher-321': 'treadmill.png',
}

export function exerciseArtwork(slug: string): string | undefined {
  const file = artwork[slug]
  return file ? `${import.meta.env.BASE_URL}exercises/${file}` : undefined
}
