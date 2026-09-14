export const masteryTierNames = {
  ru: ['Не открыто', 'Новичок', 'Практик', 'Атлет', 'Эксперт', 'Мастер'],
  en: ['Locked', 'Novice', 'Practitioner', 'Athlete', 'Expert', 'Master'],
} as const

export function masteryVisualTier(level: number): 0 | 1 | 2 | 3 | 4 | 5 {
  return Math.max(0, Math.min(5, Math.floor(level))) as 0 | 1 | 2 | 3 | 4 | 5
}
