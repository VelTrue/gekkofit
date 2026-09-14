import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { ExerciseDetailSheet } from '../components/exercises/ExerciseDetailSheet'
import { ExerciseListItem } from '../components/exercises/ExerciseListItem'
import { WorkoutDialog } from '../components/workout/WorkoutDialog'
import { WorkoutIcon } from '../components/workout/WorkoutIcon'
import { muscleGroupName } from '../data-layer/exerciseLabels'
import { getAllExercises, getFrequentExercises, getRecentExercises, normalizeExerciseQuery, rankExercises } from '../data-layer/exercises'
import { db, type Exercise } from '../db/schema'
import { useLang } from '../i18n/LangContext'
import '../components/workout/workout.css'
import '../components/exercises/exercises.css'

const RECENT_LIMIT = 3
const FREQUENT_LIMIT = 3
const PAGE_SIZE = 40

function ExerciseResultRows({ exercises, count, onMore, onPick, onInfo }: {
  exercises: Exercise[]; count: number; onMore: () => void; onPick: (exercise: Exercise) => void; onInfo: (exercise: Exercise) => void
}) {
  const { t } = useLang()
  const list = useRef<HTMLUListElement>(null)
  useEffect(() => {
    if (count > PAGE_SIZE) list.current?.children[count - PAGE_SIZE]?.querySelector('button')?.focus()
  }, [count])
  return <><ul className="exercise-list" ref={list}>{exercises.slice(0, count).map((exercise) => <ExerciseListItem key={exercise.id} exercise={exercise} onPick={onPick} onInfo={onInfo} />)}</ul>
    {count < exercises.length && <div className="exercise-pagination"><p role="status">{t('showing')} {Math.min(count, exercises.length)} {t('of')} {exercises.length}</p><button type="button" className="workout-button" onClick={onMore}>{t('showMore')}</button></div>}
  </>
}

export function ExercisePicker({ onPick, onClose }: { onPick: (exercise: Exercise) => void; onClose: () => void }) {
  const { lang, t } = useLang()
  const [catalog, setCatalog] = useState<{ all: Exercise[]; recent: Exercise[]; frequent: Exercise[] } | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState('')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [detail, setDetail] = useState<Exercise | null>(null)
  const selected = useRef<Exercise | null>(null)
  const search = useRef<HTMLInputElement>(null)
  const searchId = useId()
  const groupsId = useId()

  useEffect(() => {
    let current = true
    void Promise.all([getAllExercises(db), getRecentExercises(db, RECENT_LIMIT), getFrequentExercises(db)])
      .then(([all, recent, frequent]) => {
        if (!current) return
        const recentIds = new Set(recent.map(({ id }) => id))
        setCatalog({ all, recent, frequent: frequent.filter(({ id }) => !recentIds.has(id)).slice(0, FREQUENT_LIMIT) })
      }).catch(() => { if (current) setFailed(true) })
    return () => { current = false }
  }, [attempt])

  const groups = useMemo(() => [...new Set(catalog?.all.map(({ muscle_group }) => muscle_group) ?? [])], [catalog])
  const isSearching = normalizeExerciseQuery(query).length > 0
  const matches = useMemo(() => catalog ? rankExercises(catalog.all, query, catalog.recent)
    .filter((exercise) => !group || exercise.muscle_group === group) : [], [catalog, query, group])
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
  const clearSearch = () => { changeQuery(''); search.current?.focus() }
  const rows = (exercises: Exercise[]) => <ul className="exercise-list">{exercises.map((exercise) => <ExerciseListItem key={exercise.id} exercise={exercise} onPick={pick} onInfo={setDetail} />)}</ul>
  const section = (label: string, exercises: Exercise[]) => <section className="exercise-section" aria-label={label}><h3>{label}</h3>{rows(exercises)}</section>

  return <WorkoutDialog title={t('chooseExercise')} backLabel={t('backToWorkout')} onClose={close}>
    <div className="exercise-picker">
      <div className="exercise-search"><label htmlFor={searchId}>{t('exerciseSearch')}</label><div className="exercise-search-field"><WorkoutIcon name="search" /><input ref={search} id={searchId} type="search" value={query} onChange={(event) => changeQuery(event.target.value)} placeholder={t('exerciseSearchPlaceholder')} />{query && <button type="button" onClick={clearSearch} aria-label={t('clearSearch')}><WorkoutIcon name="close" /></button>}</div></div>
      {!catalog && !failed && <p className="exercise-message" role="status">{t('exercisesLoading')}</p>}
      {failed && <div className="exercise-message"><p role="alert">{t('exercisesLoadError')}</p><button type="button" className="workout-button" onClick={() => { setFailed(false); setAttempt((value) => value + 1) }}>{t('retry')}</button></div>}
      {catalog && <>
        {!isSearching && !group && <>{catalog.recent.length > 0 && section(t('recent'), catalog.recent)}{catalog.frequent.length > 0 && section(t('frequent'), catalog.frequent)}</>}
        <section className="exercise-section" aria-labelledby={groupsId}><h3 id={groupsId}>{t('muscleGroups')}</h3><div className="exercise-groups"><button type="button" aria-pressed={!group} onClick={() => changeGroup('')}>{t('allGroups')}</button>{groups.map((item) => <button key={item} type="button" aria-pressed={group === item} onClick={() => changeGroup(item)}>{muscleGroupName(item, lang)}</button>)}</div></section>
        <section className="exercise-section" aria-label={t(isSearching ? 'searchResults' : 'allExercises')}>
          <div className="exercise-section-heading"><h3>{t(isSearching ? 'searchResults' : 'allExercises')}</h3><span role="status">{t('found')}: {matches.length}</span></div>
          {matches.length > 0 ? <ExerciseResultRows exercises={matches} count={visibleCount} onMore={() => setVisibleCount((value) => value + PAGE_SIZE)} onPick={pick} onInfo={setDetail} /> : <div className="exercise-message"><strong>{t('noMatches')}</strong><p>{t(catalog.all.length === 0 ? 'reopenCatalog' : 'searchHint')}</p>{group && <button type="button" className="workout-button" onClick={() => changeGroup('')}>{t('clearGroup')}</button>}</div>}
        </section>
      </>}
    </div>
    {detail && <ExerciseDetailSheet exercise={detail} onClose={() => setDetail(null)} />}
  </WorkoutDialog>
}
