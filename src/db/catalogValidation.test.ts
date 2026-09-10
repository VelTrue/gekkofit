import { describe, expect, it } from 'vitest'
import catalogJson from '../../data/exercises.json'
import { validateExerciseCatalog } from './catalogValidation'
import type { Exercise } from './schema'

const catalog = catalogJson as Exercise[]
const validExercise: Exercise = {
  id: 1,
  slug: 'bench-1',
  name_ru: 'Жим штанги лежа',
  name_en: 'Barbell Bench Press',
  muscle_group: 'ГРУДЬ',
  sub_group: 'Середина',
  equipment: 'штанга',
  aliases_ru: ['Жим лежа'],
  primary_muscles: ['chest'],
  secondary_muscles: ['front-deltoids', 'triceps'],
  preferred_body_view: 'front',
}

describe('validateExerciseCatalog', () => {
  it('accepts the curated catalog with unique names and complete muscle metadata', () => {
    expect(validateExerciseCatalog(catalog)).toEqual([])
    expect(catalog.find(({ id }) => id === 19)?.name_ru).toBe('Жим гантелей под наклоном')
    expect(catalog.every(({ primary_muscles }) => primary_muscles.length > 0)).toBe(true)
    expect(catalog.every(({ aliases_ru }) => aliases_ru.length > 0)).toBe(true)
  })

  it('keeps all stable ids from 1 through 337 in order', () => {
    expect(catalog.map(({ id }) => id)).toEqual(Array.from({ length: 337 }, (_, index) => index + 1))
  })

  it.each([
    ['missing Russian name', { name_ru: ' ' }, 'MISSING_NAME'],
    ['missing English name', { name_en: '' }, 'MISSING_NAME'],
    ['missing primary muscles', { primary_muscles: [] }, 'MISSING_PRIMARY_MUSCLES'],
    ['absent primary muscles', { primary_muscles: undefined }, 'MISSING_PRIMARY_MUSCLES'],
    ['unknown primary muscle', { primary_muscles: ['pecs'] }, 'INVALID_MUSCLE_ID'],
    ['unknown secondary muscle', { secondary_muscles: ['shoulder'] }, 'INVALID_MUSCLE_ID'],
    ['absent aliases', { aliases_ru: undefined }, 'INVALID_ALIASES'],
    ['blank alias', { aliases_ru: [' '] }, 'INVALID_ALIASES'],
    ['absent secondary muscles', { secondary_muscles: undefined }, 'INVALID_SECONDARY_MUSCLES'],
    ['invalid body view', { preferred_body_view: 'side' }, 'INVALID_BODY_VIEW'],
    ['forbidden punctuation in name', { name_ru: 'Жим\u2014лежа' }, 'FORBIDDEN_CHARACTER'],
    ['forbidden punctuation in alias', { aliases_ru: ['Жим\u2014лежа'] }, 'FORBIDDEN_CHARACTER'],
    ['forbidden punctuation in equipment', { equipment: 'гриф\u2014штанга' }, 'FORBIDDEN_CHARACTER'],
  ])('rejects %s', (_, change, code) => {
    const exercise = { ...validExercise, ...change } as Exercise
    expect(validateExerciseCatalog([exercise])).toContainEqual(expect.objectContaining({ code, exerciseId: 1 }))
  })

  it('rejects duplicate stable ids', () => {
    const duplicate = { ...validExercise, name_ru: 'Жим гантелей лежа' }
    expect(validateExerciseCatalog([validExercise, duplicate])).toContainEqual({ code: 'DUPLICATE_ID', exerciseId: 1 })
  })

  it('rejects Russian names that differ only by case, whitespace, or yo spelling', () => {
    const first = { ...validExercise, name_ru: 'Жим штанги лёжа' }
    const duplicate = { ...validExercise, id: 2, name_ru: '  ЖИМ   ШТАНГИ ЛЕЖА  ' }
    expect(validateExerciseCatalog([first, duplicate])).toContainEqual({ code: 'DUPLICATE_RUSSIAN_NAME', exerciseId: 2 })
  })

  it('accepts isolated movements with no secondary muscles and the extra anatomical regions', () => {
    const hipFlexion = { ...validExercise, primary_muscles: ['hip-flexors'], secondary_muscles: [] }
    const rotation = { ...validExercise, id: 2, name_ru: 'Вращение плеча на блоке', primary_muscles: ['rotator-cuff'], secondary_muscles: [] }
    expect(validateExerciseCatalog([hipFlexion, rotation])).toEqual([])
  })

  it.each([
    [19, ['chest'], ['front-deltoids', 'triceps']],
    [99, ['hip-flexors'], ['quadriceps', 'abs']],
    [100, ['hip-flexors'], ['quadriceps']],
    [206, ['rotator-cuff'], ['chest', 'lats']],
    [207, ['rotator-cuff'], ['rear-deltoids']],
    [285, ['glutes', 'hamstrings'], ['lower-back']],
  ])('maps exercise %i by its movement rather than the legacy category', (id, primary, secondary) => {
    expect(catalog.find((exercise) => exercise.id === id)).toMatchObject({ primary_muscles: primary, secondary_muscles: secondary })
  })
})
