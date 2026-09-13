import { muscleIds, type MuscleId } from '../db/catalogValidation'
import type { Exercise } from '../db/schema'
import type { Lang } from '../i18n/translations'

const labels: Record<MuscleId, [string, string]> = {
  chest: ['грудь', 'chest'], 'front-deltoids': ['передние дельты', 'front deltoids'],
  'side-deltoids': ['средние дельты', 'side deltoids'], 'rear-deltoids': ['задние дельты', 'rear deltoids'],
  biceps: ['бицепс', 'biceps'], triceps: ['трицепс', 'triceps'], forearms: ['предплечья', 'forearms'],
  'upper-back': ['верх спины', 'upper back'], lats: ['широчайшие', 'lats'], 'lower-back': ['поясница', 'lower back'],
  abs: ['пресс', 'abs'], obliques: ['косые мышцы живота', 'obliques'], glutes: ['ягодицы', 'glutes'],
  quadriceps: ['квадрицепс', 'quadriceps'], hamstrings: ['задняя поверхность бедра', 'hamstrings'],
  adductors: ['приводящие мышцы', 'adductors'], calves: ['икры', 'calves'],
  'hip-flexors': ['сгибатели бедра', 'hip flexors'], 'rotator-cuff': ['вращательная манжета', 'rotator cuff'],
}

const equipmentEnglish: Record<string, string> = {
  'штанга': 'Barbell', 'гантели': 'Dumbbells', 'нижний блок': 'Low cable',
  'тренажер Смита': 'Smith machine', 'тренажер': 'Machine', 'блок': 'Cable',
  'верхний блок': 'High cable', 'гантель': 'Dumbbell', 'свой вес': 'Bodyweight',
  'Т-гриф': 'T-bar', 'фитбол': 'Stability ball', 'блин': 'Weight plate',
  'другое': 'Other equipment', 'гиря': 'Kettlebell', 'медбол': 'Medicine ball',
}

export function equipmentName(equipment: string, lang: Lang): string {
  return lang === 'ru' ? equipment : equipmentEnglish[equipment] ?? equipment
}

export function muscleNames(muscles: string[], lang: Lang): string {
  return validMuscles(muscles).map((muscle) => labels[muscle][lang === 'ru' ? 0 : 1]).join(', ')
}

export function validMuscles(muscles: string[]): MuscleId[] {
  return muscles.filter((muscle): muscle is MuscleId => muscleIds.some((valid) => valid === muscle))
}

export function anatomyLabel(exercise: Exercise, lang: Lang): string {
  return `${lang === 'ru' ? 'Основные мышцы' : 'Primary muscles'}: ${muscleNames(exercise.primary_muscles, lang)}. ${lang === 'ru' ? 'Вспомогательные' : 'Secondary muscles'}: ${muscleNames(exercise.secondary_muscles, lang) || (lang === 'ru' ? 'нет' : 'none')}.`
}

const groups: Record<string, [string, string]> = {
  'ГРУДЬ': ['Грудь', 'Chest'], 'СПИНА': ['Спина', 'Back'], 'НОГИ': ['Ноги', 'Legs'],
  'ПЛЕЧИ': ['Плечи', 'Shoulders'], 'РУКИ': ['Руки', 'Arms'], 'КОРПУС': ['Корпус', 'Core'],
  'ФУЛБОДИ': ['Всё тело', 'Full body'], 'КАРДИО': ['Кардио', 'Cardio'],
}

export function muscleGroupName(group: string, lang: Lang): string {
  return groups[group]?.[lang === 'ru' ? 0 : 1] ?? group
}
