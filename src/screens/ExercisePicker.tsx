import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { ExerciseDetailSheet } from '../components/exercises/ExerciseDetailSheet'
import { ExerciseListItem } from '../components/exercises/ExerciseListItem'
import { WorkoutDialog } from '../components/workout/WorkoutDialog'
import { WorkoutIcon } from '../components/workout/WorkoutIcon'
import { muscleGroupName } from '../data-layer/exerciseLabels'
import { getAllExercises, getRecentExercises, normalizeExerciseQuery, rankExercises } from '../data-layer/exercises'
import { getExerciseAlternatives } from '../data-layer/exerciseAlternatives'
import { db, type Exercise } from '../db/schema'
import { useLang } from '../i18n/LangContext'
import '../components/workout/workout.css'
import '../components/exercises/exercises.css'

const RECENT_LIMIT = 4
const PAGE_SIZE = 40
const EQUIPMENT_GROUPS = [
  { value: 'bodyweight', label: 'bodyweightEquipment', values: ['свой вес'] },
  { value: 'dumbbell', label: 'dumbbellEquipment', values: ['гантели', 'гантель'] },
  { value: 'barbell', label: 'barbellEquipment', values: ['штанга'] },
  { value: 'cable', label: 'cableEquipment', values: ['блок', 'верхний блок', 'нижний блок'] },
  { value: 'machine', label: 'machineEquipment', values: ['тренажер', 'тренажер Смита'] },
  { value: 'kettlebell', label: 'kettlebellEquipment', values: ['гиря'] },
  { value: 'other', label: 'otherEquipment', values: ['другое', 'медбол', 'Т-гриф', 'фитбол', 'блин'] },
] as const

function ExerciseResultRows({ exercises, count, onMore, onPick, onInfo }: {
  exercises: Exercise[]; count: number; onMore: () => void; onPick: (exercise: Exercise) => void; onInfo: (exercise: Exercise) => void
}) {
  const { t } = useLang()
  const list = useRef<HTMLUListElement>(null)
  useEffect(() => {
    if (count > PAGE_SIZE) list.current?.children[count - PAGE_SIZE]?.querySelector('button')?.focus()
  }, [count])
  return <><ul className="exercise-list" ref={list}>{exercises.slice(0, count).map((exercise) => <ExerciseListItem key={exercise.id} exercise={exercise} compact onPick={onPick} onInfo={onInfo} />)}</ul>
    {count < exercises.length && <div className="exercise-pagination"><p role="status">{t('showing')} {Math.min(count, exercises.length)} {t('of')} {exercises.length}</p><button type="button" className="workout-button" onClick={onMore}>{t('showMore')}</button></div>}
  </>
}

export function ExercisePicker({ onPick, onClose, replacementFor, excludedExerciseIds = [] }: {
  onPick: (exercise: Exercise) => void; onClose: () => void; replacementFor?: Exercise; excludedExerciseIds?: number[]
}) {
  const { lang, t } = useLang()
  const [catalog, setCatalog] = useState<{ all: Exercise[]; recent: Exercise[] } | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState('')
  const [equipment, setEquipment] = useState('')
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [detail, setDetail] = useState<Exercise | null>(null)
  const selected = useRef<Exercise | null>(null)
  const search = useRef<HTMLInputElement>(null)
  const searchId = useId()
  const groupsId = useId()

  useEffect(() => {
    let current = true
    void Promise.all([getAllExercises(db), getRecentExercises(db, RECENT_LIMIT)])
      .then(([all, recent]) => {
        if (!current) return
        setCatalog({ all, recent })
      }).catch(() => { if (current) setFailed(true) })
    return () => { current = false }
  }, [attempt])

  const groups = useMemo(() => ['ГРУДЬ', 'СПИНА', 'НОГИ', 'ПЛЕЧИ', 'РУКИ', 'КОРПУС', 'ФУЛБОДИ', 'КАРДИО']
    .filter((item) => catalog?.all.some(({ muscle_group }) => muscle_group === item)), [catalog])
  const isSearching = normalizeExerciseQuery(query).length > 0
  const matches = useMemo(() => {
    if (!catalog) return []
    const available = replacementFor
      ? getExerciseAlternatives(replacementFor, catalog.all, Infinity).filter(({ id }) => !excludedExerciseIds.includes(id))
      : catalog.all
    const normalized = normalizeExerciseQuery(query)
    return (replacementFor && !isSearching ? available : rankExercises(available, query))
      .filter((exercise) => replacementFor || !normalized || [exercise.name_ru, exercise.name_en, ...exercise.aliases_ru]
        .some((name) => normalizeExerciseQuery(name).includes(normalized)))
      .filter((exercise) => replacementFor || !group || exercise.muscle_group === group)
      .filter((exercise) => replacementFor || !equipment || EQUIPMENT_GROUPS.find(({ value }) => value === equipment)?.values.some((value) => value === exercise.equipment))
  }, [catalog, query, group, equipment, replacementFor, excludedExerciseIds, isSearching])
  const pick = useCallback((exercise: Exercise) => {
    if (selected.current) return
    selected.current = exercise
    history.back()
  }, [])
  const close = () => {
    if (selected.current) onPick(selected.current)
    else onClose()
  }
  const changeQuery = (value: string) => { setQuery(value); setVisibleCount(PAGE_SIZE) }
  const changeGroup = (value: string) => { setGroup(value); setVisibleCount(PAGE_SIZE) }
  const changeEquipment = (value: string) => { setEquipment(value); setVisibleCount(PAGE_SIZE) }
  const clearSearch = () => { changeQuery(''); search.current?.focus() }
  const rows = (exercises: Exercise[]) => <ul className="exercise-list">{exercises.map((exercise) => <ExerciseListItem key={exercise.id} exercise={exercise} compact onPick={pick} onInfo={setDetail} />)}</ul>
  const showResults = Boolean(replacementFor || isSearching || group || equipment || catalogOpen)
  const resultLabel = replacementFor ? t('similarExercises') : isSearching ? t('searchResults') : group || equipment ? t('matchingExercises') : t('allExercises')

  return <WorkoutDialog title={t(replacementFor ? 'replaceExercise' : 'chooseExercise')} backLabel={t('backToWorkout')} onClose={close}>
    <div className="exercise-picker">
      {!replacementFor && <p className="exercise-picker-subtitle">{t('pickerSubtitle')}</p>}
      <div className="exercise-search"><label className="sr-only" htmlFor={searchId}>{t('exerciseSearch')}</label><div className="exercise-search-field"><WorkoutIcon name="search" /><input ref={search} id={searchId} type="search" value={query} onChange={(event) => changeQuery(event.target.value)} placeholder={t('exerciseSearchPlaceholder')} />{query && <button type="button" onClick={clearSearch} aria-label={t('clearSearch')}><WorkoutIcon name="close" /></button>}</div></div>
      {!catalog && !failed && <p className="exercise-message" role="status">{t('exercisesLoading')}</p>}
      {failed && <div className="exercise-message"><p role="alert">{t('exercisesLoadError')}</p><button type="button" className="workout-button" onClick={() => { setFailed(false); setAttempt((value) => value + 1) }}>{t('retry')}</button></div>}
      {catalog && <>
        {!replacementFor && !isSearching && !group && !equipment && !catalogOpen && catalog.recent.length > 0 && <section className="exercise-section exercise-recent" aria-label={t('recentExercises')}><div className="exercise-recent-heading"><h3>{t('recentExercises')}</h3><p>{t('recentFourHint')}</p></div>{rows(catalog.recent)}</section>}
        {!replacementFor && <section className="exercise-section exercise-discover" aria-labelledby={groupsId}><h3 id={groupsId}>{t('findAnother')}</h3><div className="exercise-filter-row"><label className="exercise-filter"><span className="sr-only">{t('chooseMuscle')}</span><select aria-label={t('chooseMuscle')} value={group} onChange={(event) => changeGroup(event.target.value)}><option value="">{t('chooseMuscle')}</option>{groups.map((item) => <option key={item} value={item}>{muscleGroupName(item, lang)}</option>)}</select><WorkoutIcon name="down" /></label><label className="exercise-filter"><span className="sr-only">{t('chooseEquipment')}</span><select aria-label={t('chooseEquipment')} value={equipment} onChange={(event) => changeEquipment(event.target.value)}><option value="">{t('chooseEquipment')}</option>{EQUIPMENT_GROUPS.map(({ value, label }) => <option key={value} value={value}>{t(label)}</option>)}</select><WorkoutIcon name="down" /></label></div>{!showResults && <button type="button" className="exercise-open-catalog" onClick={() => setCatalogOpen(true)}>{t('openCatalog')} · {catalog.all.length} <WorkoutIcon name="next" /></button>}</section>}
        {showResults && <section className="exercise-section exercise-results" aria-label={resultLabel}>
          <div className="exercise-section-heading"><h3>{resultLabel}</h3><span role="status">{t('found')}: {matches.length}</span></div>
          {matches.length > 0 ? <ExerciseResultRows exercises={matches} count={visibleCount} onMore={() => setVisibleCount((value) => value + PAGE_SIZE)} onPick={pick} onInfo={setDetail} /> : <div className="exercise-message"><strong>{t(replacementFor && !isSearching ? 'noSimilarExercise' : 'noMatches')}</strong><p>{t(replacementFor && !isSearching ? 'noSimilarExerciseHint' : catalog.all.length === 0 ? 'reopenCatalog' : 'searchHint')}</p>{group && <button type="button" className="workout-button" onClick={() => changeGroup('')}>{t('clearGroup')}</button>}</div>}
        </section>}
      </>}
    </div>
    {detail && <ExerciseDetailSheet exercise={detail} compact alternatives={getExerciseAlternatives(detail, catalog?.all ?? [])} onClose={() => setDetail(null)} />}
  </WorkoutDialog>
}
