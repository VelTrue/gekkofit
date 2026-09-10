# Workout Tracker Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the workout tracker as a polished light and dark mobile-first journal with editable workouts, natural exercise names, complete anatomical muscle maps, detailed history, and collectible exercise mastery.

**Architecture:** Extend the existing Dexie local-first model with versioned migrations and derived selectors. Split the interface into focused workout, exercise, history, mastery, theme, and anatomy components that share semantic design tokens. Keep mastery and summaries deterministic by deriving them from completed set records rather than increment-only counters.

**Tech Stack:** React 19, TypeScript 6, Dexie 4, Tailwind CSS 4, Motion 13, Vitest 5, Vite 8, vite-plugin-pwa

**Spec:** `docs/superpowers/specs/2026-09-11-workout-tracker-redesign.md`

## Global Constraints

- Never use the Unicode em dash character U+2014 in project-owned files.
- Preserve all existing workouts and stable numeric exercise identifiers.
- Keep offline operation and PWA installation working.
- Support Russian and English UI copy.
- Maintain 44 by 44 CSS pixel minimum touch targets and accessible focus states.
- Use original local anatomical assets. Do not copy third-party product artwork.
- Use test-driven development for every behavioral change.

## File map

- `src/db/schema.ts`: Dexie version 2 schema and shared persisted types.
- `src/db/migrateCatalog.ts`: idempotent catalog metadata update.
- `data/exercises.json`: curated names, aliases, and muscle mappings for 337 exercises.
- `src/data-layer/workoutEditor.ts`: workout title, exercise order, set editing, and deletion.
- `src/data-layer/workoutSummary.ts`: note view and history summaries.
- `src/data-layer/mastery.ts`: deterministic score, records, levels, and statistics.
- `src/theme/ThemeContext.tsx`: theme state and persistence.
- `src/components/anatomy/`: shared original body map and highlights.
- `src/components/workout/`: workout title, mode switch, exercise cards, set rows, and note view.
- `src/components/mastery/`: mastery grid, badge, and detail sheet.
- `src/screens/ExercisePicker.tsx`: searchable visual exercise catalog.
- `src/screens/HomeScreen.tsx`: active workout orchestration.
- `src/screens/HistoryScreen.tsx`: summary list, calendar, and editable detail.
- `src/screens/ProgressScreen.tsx`: mastery collection screen.
- `src/screens/SettingsScreen.tsx`: theme control and existing backup controls.
- `src/theme.css`: semantic tokens for both themes.

---

### Task 1: Add schema version 2 and preserve existing data

**Files:**
- Modify: `src/db/schema.ts`
- Create: `src/db/schemaMigration.test.ts`

**Interfaces:**
- Produces: `BodyView`, extended `Exercise`, extended `Workout`, extended `WorkoutSet`, and `WorkoutExercise`.
- Produces: `db.workoutExercises` indexed by workout and exercise.

- [ ] **Step 1: Write the failing migration test**

```ts
it('upgrades version 1 data without changing ids', async () => {
  const legacy = new Dexie(databaseName)
  legacy.version(1).stores({
    exercises: 'id, muscle_group',
    workouts: 'id, startedAt, finishedAt, updatedAt',
    sets: 'id, workoutId, exerciseId, createdAt, updatedAt',
    exerciseProgress: 'exerciseId',
  })
  await legacy.open()
  await legacy.table('exercises').add({ id: 7, slug: 'bench-7', name_ru: 'Жим лежа', name_en: 'Bench Press', muscle_group: 'ГРУДЬ', sub_group: null, equipment: 'штанга' })
  await legacy.table('workouts').add({ id: 'workout-1', startedAt: '2026-09-10T10:00:00.000Z', finishedAt: null, createdAt: '2026-09-10T10:00:00.000Z', updatedAt: '2026-09-10T10:00:00.000Z' })
  legacy.close()

  const upgraded = new AppDatabase(databaseName)
  await upgraded.open()
  expect((await upgraded.exercises.get(7))?.id).toBe(7)
  expect((await upgraded.workouts.get('workout-1'))?.title).toBe('Тренировка 10 сентября')
})
```

- [ ] **Step 2: Run the migration test and verify failure**

Run: `npm.cmd test -- src/db/schemaMigration.test.ts`

Expected: FAIL because schema version 2 and new fields do not exist.

- [ ] **Step 3: Implement schema version 2**

Add these types and table:

```ts
export type BodyView = 'front' | 'back' | 'both'

export interface WorkoutExercise {
  id: string
  workoutId: string
  exerciseId: number
  order: number
  createdAt: string
  updatedAt: string
}
```

Extend `Exercise` with `aliases_ru`, `primary_muscles`, `secondary_muscles`, and `preferred_body_view`. Extend `Workout` with `title`. Extend `WorkoutSet` with `completed`. Add version 2 indexes:

```ts
this.version(2).stores({
  exercises: 'id, muscle_group, *aliases_ru, *primary_muscles',
  workouts: 'id, startedAt, finishedAt, updatedAt, title',
  workoutExercises: 'id, workoutId, exerciseId, [workoutId+order], &[workoutId+exerciseId]',
  sets: 'id, workoutId, exerciseId, completed, createdAt, updatedAt',
  exerciseProgress: 'exerciseId',
}).upgrade(async (transaction) => {
  const workouts = transaction.table<Workout>('workouts')
  await workouts.toCollection().modify((workout) => {
    workout.title ??= defaultWorkoutTitle(workout.startedAt, 'ru')
  })
  await transaction.table<WorkoutSet>('sets').toCollection().modify((set) => {
    set.completed ??= true
  })
})
```

- [ ] **Step 4: Run schema and existing data-layer tests**

Run: `npm.cmd test -- src/db/schemaMigration.test.ts src/data-layer`

Expected: PASS.

- [ ] **Step 5: Commit the schema migration**

```powershell
git add src/db/schema.ts src/db/schemaMigration.test.ts
git commit -m "feat: add editable workout schema"
```

---

### Task 2: Curate exercise names and muscle metadata

**Files:**
- Modify: `data/exercises.json`
- Create: `src/db/catalogValidation.ts`
- Create: `src/db/catalogValidation.test.ts`
- Create: `src/db/migrateCatalog.ts`
- Modify: `src/db/seedExercises.ts`
- Modify: `src/db/seedExercises.test.ts`

**Interfaces:**
- Produces: `validateExerciseCatalog(exercises: Exercise[]): CatalogIssue[]`.
- Produces: `syncExerciseCatalog(database: AppDatabase, catalog: Exercise[]): Promise<void>`.
- Consumes: extended `Exercise` from Task 1.

- [ ] **Step 1: Write failing catalog validation tests**

```ts
it('requires natural unique Russian names and valid muscle ids', () => {
  expect(validateExerciseCatalog(catalog)).toEqual([])
  expect(catalog.find(({ id }) => id === 4)?.name_ru).toBe('Жим гантелей под наклоном')
  expect(catalog.every(({ primary_muscles }) => primary_muscles.length > 0)).toBe(true)
})

it('keeps all stable ids from 1 through 337', () => {
  expect(catalog.map(({ id }) => id)).toEqual(Array.from({ length: 337 }, (_, index) => index + 1))
})
```

- [ ] **Step 2: Run validation tests and verify failure**

Run: `npm.cmd test -- src/db/catalogValidation.test.ts`

Expected: FAIL because the current records lack aliases and muscle mappings.

- [ ] **Step 3: Define canonical muscle identifiers and validation**

Use a finite union that covers front and back body regions:

```ts
export const muscleIds = ['chest', 'front-deltoids', 'side-deltoids', 'rear-deltoids', 'biceps', 'triceps', 'forearms', 'upper-back', 'lats', 'lower-back', 'abs', 'obliques', 'glutes', 'quadriceps', 'hamstrings', 'adductors', 'calves'] as const
export type MuscleId = typeof muscleIds[number]
```

Validation rejects missing names, duplicate visible Russian names, invalid muscle identifiers, missing primary muscles, duplicate ids, and forbidden U+2014 characters.

- [ ] **Step 4: Curate all 337 catalog records**

For every entry, preserve `id`, `slug`, and `name_en`. Rewrite `name_ru` using the approved movement, equipment, position order. Add prior wording to `aliases_ru`. Assign primary and secondary muscle identifiers and preferred view. Review duplicate Russian labels manually and distinguish them by equipment or position.

- [ ] **Step 5: Replace seed-only behavior with idempotent catalog synchronization**

```ts
export async function syncExerciseCatalog(database: AppDatabase, catalog: Exercise[]): Promise<void> {
  const issues = validateExerciseCatalog(catalog)
  if (issues.length) throw new Error(`INVALID_EXERCISE_CATALOG:${issues[0].code}`)
  await database.transaction('rw', database.exercises, async () => {
    await database.exercises.bulkPut(catalog)
  })
}
```

Call synchronization during startup so existing installations receive corrected metadata without replacing user workout records.

- [ ] **Step 6: Run catalog, seed, and search tests**

Run: `npm.cmd test -- src/db/catalogValidation.test.ts src/db/seedExercises.test.ts src/data-layer/exercises.test.ts`

Expected: PASS with 337 valid records.

- [ ] **Step 7: Commit the curated catalog**

```powershell
git add data/exercises.json src/db/catalogValidation.ts src/db/catalogValidation.test.ts src/db/migrateCatalog.ts src/db/seedExercises.ts src/db/seedExercises.test.ts
git commit -m "feat: curate exercise catalog and muscle maps"
```

---

### Task 3: Build deterministic workout editing operations

**Files:**
- Create: `src/data-layer/workoutEditor.ts`
- Create: `src/data-layer/workoutEditor.test.ts`
- Modify: `src/data-layer/workouts.ts`
- Modify: `src/data-layer/workouts.test.ts`
- Modify: `src/data-layer/sets.ts`
- Modify: `src/data-layer/sets.test.ts`

**Interfaces:**
- Produces: `renameWorkout`, `addExerciseToWorkout`, `removeExerciseFromWorkout`, `reorderWorkoutExercise`, `updateSet`, `deleteSet`, and `discardWorkout`.
- Produces: `getWorkoutEntries(database, workoutId): Promise<WorkoutEntry[]>` including exercises without sets.

- [ ] **Step 1: Write failing workout editor tests**

```ts
it('renames completed workouts and edits their sets', async () => {
  const workout = await startWorkout(database, 'ru')
  await addExerciseToWorkout(database, workout.id, bench.id)
  const set = await addSet(database, workout.id, bench.id, 50, 8)
  await finishWorkout(database, workout.id)
  await renameWorkout(database, workout.id, 'Грудь и трицепс')
  await updateSet(database, set.id, { weight: 52.5, reps: 7, completed: true })
  expect((await database.workouts.get(workout.id))?.title).toBe('Грудь и трицепс')
  expect(await database.sets.get(set.id)).toMatchObject({ weight: 52.5, reps: 7 })
})

it('keeps exercises with no sets in workout order', async () => {
  const workout = await startWorkout(database, 'ru')
  await addExerciseToWorkout(database, workout.id, bench.id)
  expect((await getWorkoutEntries(database, workout.id))[0].sets).toEqual([])
})
```

- [ ] **Step 2: Run editor tests and verify failure**

Run: `npm.cmd test -- src/data-layer/workoutEditor.test.ts`

Expected: FAIL because editing operations do not exist.

- [ ] **Step 3: Implement atomic editing operations**

Validate title length from 1 through 80 characters. Validate finite non-negative weight and positive integer repetitions. Every write updates the parent workout timestamp. Deleting the final set does not remove the workout exercise row. Removing an exercise deletes its workout sets within the same Dexie transaction.

- [ ] **Step 4: Update workout creation**

Change the signature to:

```ts
export async function startWorkout(database: AppDatabase, locale: 'ru' | 'en'): Promise<Workout>
```

Create the localized default title and preserve single-active-workout behavior.

- [ ] **Step 5: Run all data-layer tests**

Run: `npm.cmd test -- src/data-layer`

Expected: PASS.

- [ ] **Step 6: Commit workout editing**

```powershell
git add src/data-layer/workoutEditor.ts src/data-layer/workoutEditor.test.ts src/data-layer/workouts.ts src/data-layer/workouts.test.ts src/data-layer/sets.ts src/data-layer/sets.test.ts
git commit -m "feat: support full workout editing"
```

---

### Task 4: Derive note view, history summaries, and mastery

**Files:**
- Create: `src/data-layer/workoutSummary.ts`
- Create: `src/data-layer/workoutSummary.test.ts`
- Rewrite: `src/data-layer/mastery.ts`
- Rewrite: `src/data-layer/mastery.test.ts`
- Modify: `src/data-layer/exerciseHistory.ts`
- Modify: `src/data-layer/exerciseHistory.test.ts`

**Interfaces:**
- Produces: `summarizeWorkout(detail: WorkoutDetail): WorkoutSummary`.
- Produces: `formatWorkoutAsNote(detail: WorkoutDetail, locale: Locale): NoteExercise[]`.
- Produces: `calculateExerciseMastery(workouts, sets, exerciseId): ExerciseMastery`.
- Produces: `getMasteryCollection(database): Promise<MasteryItem[]>`.

- [ ] **Step 1: Write failing summary tests**

```ts
it('summarizes actual exercises, sets, reps, and volume', () => {
  expect(summarizeWorkout(detail)).toMatchObject({
    exerciseCount: 2,
    setCount: 5,
    repetitionCount: 49,
    volume: 1962,
  })
  expect(formatWorkoutAsNote(detail, 'ru')[0]).toEqual({
    exerciseId: 4,
    title: 'Жим гантелей под наклоном',
    sets: ['14 кг × 12', '14 кг × 10', '16 кг × 7'],
  })
})
```

- [ ] **Step 2: Write failing mastery threshold and recalculation tests**

```ts
it.each([[1, 1], [15, 2], [50, 3], [120, 4], [250, 5]])('maps %s points to level %s', (points, level) => {
  expect(masteryLevel(points).level).toBe(level)
})

it('removes points and records when source sets are deleted', () => {
  const before = calculateExerciseMastery(workouts, sets, 4)
  const after = calculateExerciseMastery(workouts, sets.filter(({ id }) => id !== 'record-set'), 4)
  expect(after.points).toBeLessThan(before.points)
  expect(after.bestWeight).toBeLessThan(before.bestWeight)
})
```

- [ ] **Step 3: Run focused tests and verify failure**

Run: `npm.cmd test -- src/data-layer/workoutSummary.test.ts src/data-layer/mastery.test.ts`

Expected: FAIL because the selectors and unified mastery model do not exist.

- [ ] **Step 4: Implement summaries and deterministic mastery**

Use completed sets only. Grant one point per completed set, two points once per distinct workout with that exercise, and three points when chronological processing encounters a new best weight or Epley estimated maximum. Use `weight * (1 + reps / 30)` for estimated one-repetition maximum. Return exact next-tier threshold and remaining points.

- [ ] **Step 5: Run data-layer tests**

Run: `npm.cmd test -- src/data-layer/workoutSummary.test.ts src/data-layer/mastery.test.ts src/data-layer/exerciseHistory.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit derived statistics**

```powershell
git add src/data-layer/workoutSummary.ts src/data-layer/workoutSummary.test.ts src/data-layer/mastery.ts src/data-layer/mastery.test.ts src/data-layer/exerciseHistory.ts src/data-layer/exerciseHistory.test.ts
git commit -m "feat: derive workout summaries and mastery"
```

---

### Task 5: Create the theme system and visual tokens

**Files:**
- Create: `src/theme/ThemeContext.tsx`
- Create: `src/theme/ThemeContext.test.tsx`
- Modify: `src/main.tsx`
- Rewrite: `src/theme.css`
- Modify: `src/screens/SettingsScreen.tsx`

**Interfaces:**
- Produces: `ThemeMode = 'system' | 'dark' | 'light'`.
- Produces: `useTheme(): { mode: ThemeMode; resolved: 'dark' | 'light'; setMode(mode): void }`.

- [ ] **Step 1: Write failing theme persistence tests**

```tsx
it('persists light mode and applies it to the document', async () => {
  render(<ThemeProvider><ThemeProbe /></ThemeProvider>)
  await userEvent.click(screen.getByRole('button', { name: 'Светлая' }))
  expect(localStorage.getItem('theme-mode')).toBe('light')
  expect(document.documentElement.dataset.theme).toBe('light')
})
```

- [ ] **Step 2: Run the test and verify failure**

Run: `npm.cmd test -- src/theme/ThemeContext.test.tsx`

Expected: FAIL because the theme provider does not exist.

- [ ] **Step 3: Implement theme state and semantic tokens**

Resolve system mode using `matchMedia('(prefers-color-scheme: dark)')` and listen for changes. Define tokens for background, surface, elevated surface, text, muted text, border, accent, accent text, muscle primary, muscle secondary, danger, focus, and five mastery tiers. Components must use tokens instead of embedded theme-specific colors.

- [ ] **Step 4: Add the three-way control to settings**

Use localized visible labels `Системная`, `Темная`, and `Светлая`. Ensure pressed state is available through `aria-pressed`.

- [ ] **Step 5: Run theme and translation tests**

Run: `npm.cmd test -- src/theme/ThemeContext.test.tsx src/i18n/translations.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit themes**

```powershell
git add src/theme/ThemeContext.tsx src/theme/ThemeContext.test.tsx src/main.tsx src/theme.css src/screens/SettingsScreen.tsx src/i18n
git commit -m "feat: add light and dark themes"
```

---

### Task 6: Build the original anatomical renderer

**Files:**
- Create: `src/components/anatomy/body-front.svg`
- Create: `src/components/anatomy/body-back.svg`
- Create: `src/components/anatomy/musclePaths.ts`
- Create: `src/components/anatomy/AnatomyMap.tsx`
- Create: `src/components/anatomy/AnatomyMap.test.tsx`

**Interfaces:**
- Produces: `AnatomyMap({ primary, secondary, view, size, label }: AnatomyMapProps)`.
- Consumes: canonical `MuscleId` values from Task 2.

- [ ] **Step 1: Write the failing renderer test**

```tsx
it('labels and distinguishes primary and secondary muscles', () => {
  render(<AnatomyMap primary={['chest']} secondary={['triceps']} view="front" label="Грудь и трицепс" />)
  expect(screen.getByRole('img', { name: 'Грудь и трицепс' })).toBeVisible()
  expect(screen.getByTestId('muscle-chest')).toHaveAttribute('data-intensity', 'primary')
  expect(screen.getByTestId('muscle-triceps')).toHaveAttribute('data-intensity', 'secondary')
})
```

- [ ] **Step 2: Run the renderer test and verify failure**

Run: `npm.cmd test -- src/components/anatomy/AnatomyMap.test.tsx`

Expected: FAIL because the anatomy component is absent.

- [ ] **Step 3: Draw and integrate original local SVG body maps**

Create neutral front and back human figures with one addressable path group per canonical muscle. Avoid realistic medical detail that becomes unreadable at thumbnail size. Use CSS variables for neutral, primary, and secondary fills. Render both views only when `view` is `both`.

- [ ] **Step 4: Verify responsive and accessible rendering**

Run: `npm.cmd test -- src/components/anatomy/AnatomyMap.test.tsx`

Expected: PASS with no external image requests.

- [ ] **Step 5: Commit anatomy assets**

```powershell
git add src/components/anatomy
git commit -m "feat: add anatomical muscle visualization"
```

---

### Task 7: Rebuild active workout card and note modes

**Files:**
- Create: `src/components/workout/WorkoutTitle.tsx`
- Create: `src/components/workout/ViewModeSwitch.tsx`
- Create: `src/components/workout/SetRow.tsx`
- Create: `src/components/workout/ExerciseCard.tsx`
- Create: `src/components/workout/WorkoutNoteView.tsx`
- Create: `src/components/workout/workoutComponents.test.tsx`
- Rewrite: `src/screens/HomeScreen.tsx`
- Create: `src/screens/HomeScreen.test.tsx`

**Interfaces:**
- Produces: `WorkoutViewMode = 'cards' | 'list'` persisted as `workout-view-mode`.
- Consumes: workout editor operations from Task 3, summaries from Task 4, and anatomy map from Task 6.

- [ ] **Step 1: Write failing interaction tests**

```tsx
it('switches smoothly to the editable note view and remembers it', async () => {
  render(<WorkoutScreenFixture />)
  await userEvent.click(screen.getByRole('button', { name: 'Список' }))
  expect(screen.getByText('14 кг × 12')).toBeVisible()
  expect(localStorage.getItem('workout-view-mode')).toBe('list')
})

it('edits a completed set inline', async () => {
  render(<SetRowFixture />)
  await userEvent.clear(screen.getByLabelText('Вес, подход 1'))
  await userEvent.type(screen.getByLabelText('Вес, подход 1'), '52.5')
  await userEvent.click(screen.getByRole('button', { name: 'Сохранить подход 1' }))
  expect(updateSet).toHaveBeenCalledWith(expect.anything(), 'set-1', expect.objectContaining({ weight: 52.5 }))
})
```

- [ ] **Step 2: Run component tests and verify failure**

Run: `npm.cmd test -- src/components/workout/workoutComponents.test.tsx`

Expected: FAIL because the new components are absent.

- [ ] **Step 3: Implement focused workout components**

Use compact numeric inputs with persistent labels, a completion control, inline validation, and saved-state feedback. Animate only opacity and transform during mode switching. The note view uses wrapping set chips and opens an exercise editor when selected.

- [ ] **Step 4: Rewrite HomeScreen as orchestration**

Keep database loading, active workout state, picker state, timer state, and error boundaries in the screen. Delegate rendering and editing to the focused components. Add visible discard and finish actions with confirmation.

- [ ] **Step 5: Run workout screen tests and production build**

Run: `npm.cmd test -- src/components/workout src/screens/HomeScreen.test.tsx`

Run: `npm.cmd run build`

Expected: PASS.

- [ ] **Step 6: Commit the workout interface**

```powershell
git add src/components/workout src/screens/HomeScreen.tsx src/screens/HomeScreen.test.tsx
git commit -m "feat: redesign workout logging views"
```

---

### Task 8: Rebuild the visual exercise picker

**Files:**
- Modify: `src/data-layer/exercises.ts`
- Modify: `src/data-layer/exercises.test.ts`
- Create: `src/components/exercises/ExerciseListItem.tsx`
- Create: `src/components/exercises/ExerciseDetailSheet.tsx`
- Rewrite: `src/screens/ExercisePicker.tsx`
- Create: `src/screens/ExercisePicker.test.tsx`

**Interfaces:**
- Produces: ranked search across names, aliases, English, muscles, and equipment.
- Consumes: anatomy map and latest result selector.

- [ ] **Step 1: Write failing ranked-search tests**

```ts
it('finds an exercise by an old Russian alias', async () => {
  const result = await searchExercises(database, 'жим лежа наклон гантели')
  expect(result[0].name_ru).toBe('Жим гантелей под наклоном')
})

it('ranks exact name before muscle and equipment matches', async () => {
  const result = await searchExercises(database, 'приседания')
  expect(result[0].name_ru).toBe('Приседания со штангой')
})
```

- [ ] **Step 2: Run picker tests and verify failure**

Run: `npm.cmd test -- src/data-layer/exercises.test.ts src/screens/ExercisePicker.test.tsx`

Expected: FAIL because aliases, ranking, and visual rows are absent.

- [ ] **Step 3: Implement normalized ranked search**

Normalize case, `ё` to `е`, punctuation, and whitespace. Score exact current-name match highest, then current-name prefix, alias match, English match, muscle match, and equipment match. Preserve recent ordering when the query is empty.

- [ ] **Step 4: Implement picker sections and detail sheet**

Show search, recent, frequent, and muscle groups. Each row includes anatomy, name, equipment, and primary muscle. The separate information control opens details without selecting the exercise.

- [ ] **Step 5: Run picker and accessibility tests**

Run: `npm.cmd test -- src/data-layer/exercises.test.ts src/screens/ExercisePicker.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit the exercise picker**

```powershell
git add src/data-layer/exercises.ts src/data-layer/exercises.test.ts src/components/exercises src/screens/ExercisePicker.tsx src/screens/ExercisePicker.test.tsx
git commit -m "feat: redesign visual exercise catalog"
```

---

### Task 9: Rebuild history with real workout content

**Files:**
- Create: `src/components/history/HistoryCard.tsx`
- Create: `src/components/history/HistoryDetail.tsx`
- Rewrite: `src/screens/HistoryScreen.tsx`
- Create: `src/screens/HistoryScreen.test.tsx`

**Interfaces:**
- Consumes: `WorkoutSummary`, `WorkoutEntry`, and workout editor operations.
- Produces: list and calendar routes into the same editable detail view.

- [ ] **Step 1: Write the failing history test**

```tsx
it('shows real exercise names, set counts, and repetitions', async () => {
  render(<HistoryFixture />)
  expect(await screen.findByText('Жим гантелей под наклоном')).toBeVisible()
  expect(screen.getByText('3 подхода, 29 повторений')).toBeVisible()
  expect(screen.queryByText('Жим лежа')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run the history test and verify failure**

Run: `npm.cmd test -- src/screens/HistoryScreen.test.tsx`

Expected: FAIL because list cards currently show only dates.

- [ ] **Step 3: Implement summary cards and editable detail**

Load workout details in one selector instead of issuing one query after every click. Display title, localized date, duration, exercises, per-exercise sets and repetitions, volume, and records. Reuse workout card and note components for editing completed sessions.

- [ ] **Step 4: Add consistent back behavior**

Use a visible localized back control and browser history state. Calendar and list entries must open the same detail component. Closing an editor returns to the originating list or calendar state.

- [ ] **Step 5: Run history tests**

Run: `npm.cmd test -- src/screens/HistoryScreen.test.tsx src/data-layer/workoutSummary.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit history redesign**

```powershell
git add src/components/history src/screens/HistoryScreen.tsx src/screens/HistoryScreen.test.tsx
git commit -m "feat: show detailed editable workout history"
```

---

### Task 10: Build the mastery collection and detail sheet

**Files:**
- Create: `src/components/mastery/MasteryBadge.tsx`
- Create: `src/components/mastery/MasteryGrid.tsx`
- Create: `src/components/mastery/MasteryDetailSheet.tsx`
- Create: `src/components/mastery/masteryComponents.test.tsx`
- Rewrite: `src/screens/ProgressScreen.tsx`
- Create: `src/screens/ProgressScreen.test.tsx`

**Interfaces:**
- Consumes: `MasteryItem[]` and anatomy map.
- Produces: unlocked and all-exercises filters with searchable badge selection.

- [ ] **Step 1: Write failing mastery UI tests**

```tsx
it('shows only the unlocked count without a total', async () => {
  render(<ProgressFixture unlocked={8} total={337} />)
  expect(await screen.findByText('8 упражнений открыто')).toBeVisible()
  expect(screen.queryByText(/из 337/)).not.toBeInTheDocument()
})

it('opens an accessible detail sheet from a badge', async () => {
  render(<ProgressFixture unlocked={1} total={337} />)
  await userEvent.click(await screen.findByRole('button', { name: /Жим гантелей под наклоном, уровень 3/ }))
  expect(screen.getByRole('dialog', { name: 'Жим гантелей под наклоном' })).toBeVisible()
  expect(screen.getByText('До уровня 4')).toBeVisible()
})
```

- [ ] **Step 2: Run mastery UI tests and verify failure**

Run: `npm.cmd test -- src/components/mastery src/screens/ProgressScreen.test.tsx`

Expected: FAIL because the grid and sheet are absent.

- [ ] **Step 3: Implement five original badge frames**

Build the frames with CSS and local SVG geometry, not generated text baked into images. Use tier tokens and distinct shapes or edge treatments so levels remain distinguishable without color. Place the anatomy renderer inside the badge and a numeric level marker outside its primary content area.

- [ ] **Step 4: Implement collection layout and detail sheet**

Use three columns at phone width. Default to unlocked exercises and expose `Все упражнения` plus search. The dialog displays best weight, estimated maximum, volume, workout count, set count, repetition count, last date, record history, and exact next-tier progress.

- [ ] **Step 5: Test dialog focus and responsive grid**

Run: `npm.cmd test -- src/components/mastery src/screens/ProgressScreen.test.tsx`

Expected: PASS, including Escape close and focus restoration.

- [ ] **Step 6: Commit mastery collection**

```powershell
git add src/components/mastery src/screens/ProgressScreen.tsx src/screens/ProgressScreen.test.tsx
git commit -m "feat: add exercise mastery collection"
```

---

### Task 11: Update navigation, translations, backups, and PWA styling

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/NavBar.tsx`
- Modify: `src/i18n/translations.ts`
- Modify: `src/i18n/translations.test.ts`
- Modify: `src/data-layer/backup.ts`
- Modify: `src/data-layer/backup.test.ts`
- Modify: `public/app-icon.svg`
- Modify: `public/favicon.svg`

**Interfaces:**
- Consumes: new schema tables and all localized labels.
- Produces: versioned backup payload containing workout exercise order and extended metadata.

- [ ] **Step 1: Write failing backup round-trip tests**

```ts
it('round-trips titles, completion state, and workout exercise order', async () => {
  const exported = await exportBackup(source)
  await importBackup(target, exported)
  expect(await target.workoutExercises.toArray()).toEqual(await source.workoutExercises.toArray())
  expect((await target.workouts.get('workout-1'))?.title).toBe('Грудь и трицепс')
  expect((await target.sets.get('set-1'))?.completed).toBe(false)
})
```

- [ ] **Step 2: Run backup and translation tests and verify failure**

Run: `npm.cmd test -- src/data-layer/backup.test.ts src/i18n/translations.test.ts`

Expected: FAIL because the new table and labels are missing.

- [ ] **Step 3: Version backup format and validation**

Export all schema version 2 tables. Validate workout exercise uniqueness, order, workout references, exercise references, set references, finite numbers, and supported theme-independent content. Import older backups by supplying default titles, completed sets, and derived exercise order.

- [ ] **Step 4: Complete Russian and English copy**

Add labels for back navigation, themes, workout modes, editing, confirmations, muscle priority, mastery tiers, filters, dialog statistics, loading, empty, and retry states. Remove hard-coded English interface labels from screens.

- [ ] **Step 5: Align navigation and PWA assets with the design system**

Rename the visible progress tab to mastery in both locales. Update local SVG icons with the graphite and lime identity while preserving manifest sizes and installability.

- [ ] **Step 6: Run integration tests and build**

Run: `npm.cmd test`

Run: `npm.cmd run build`

Expected: PASS and generated PWA service worker output.

- [ ] **Step 7: Commit integration changes**

```powershell
git add src/App.tsx src/components/NavBar.tsx src/i18n src/data-layer/backup.ts src/data-layer/backup.test.ts public/app-icon.svg public/favicon.svg
git commit -m "feat: integrate redesigned workout experience"
```

---

### Task 12: Perform full visual and behavioral verification

**Files:**
- Modify only files required to correct verified defects.

**Interfaces:**
- Verifies all deliverables from Tasks 1 through 11.

- [ ] **Step 1: Run the complete automated suite**

Run: `npm.cmd test`

Expected: all tests pass.

- [ ] **Step 2: Run static checks and production build**

Run: `npm.cmd run lint`

Run: `npm.cmd run build`

Expected: both commands exit with code 0.

- [ ] **Step 3: Verify the writing rule**

Run: `rg '\x{2014}' -g '!node_modules/**' -g '!dist/**' .`

Expected: no matches.

- [ ] **Step 4: Run responsive browser checks**

Verify at 360 by 800, 390 by 844, 768 by 1024, and 1440 by 900 in dark and light themes. Check active workout card and list modes, picker, exercise details, history list and calendar, completed workout editing, mastery grid, mastery dialog, settings, empty states, and long Russian names.

- [ ] **Step 5: Run accessibility interaction checks**

Navigate all controls by keyboard, verify visible focus, close every dialog with Escape, verify focus restoration, test reduced motion, and inspect accessible names for icon-only controls and anatomical maps.

- [ ] **Step 6: Verify offline behavior**

Install or load the production PWA once, disable network access, refresh, and confirm that workout logging, history, mastery, themes, and bundled anatomical assets still work.

- [ ] **Step 7: Commit verified corrections**

```powershell
git add src data public
git commit -m "fix: polish redesigned workout experience"
```
