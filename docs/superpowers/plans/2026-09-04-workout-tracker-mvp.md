# Workout Tracker MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working local-only PWA workout tracker MVP - log sets/reps/weight per exercise, see progress via a two-scale mastery/leveling system, browse history (list + calendar), export/import data for backup, RU/EN interface.

**Architecture:** React + Vite SPA. All data lives in IndexedDB via Dexie - no backend, no network calls for data. A thin data-layer module is the only interface between UI components and Dexie. Pure functions compute mastery XP/levels from stored counters. Export/Import serializes the three data tables to/from a JSON file. PWA via vite-plugin-pwa for offline app-shell caching and install support.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS v4, Dexie.js (IndexedDB), Motion (animations), vite-plugin-pwa, Vitest + fake-indexeddb (tests).

**Spec:** `docs/superpowers/specs/2026-09-04-fitness-tracker-mvp-design.md`

## Global Constraints

- No backend, no network calls for app data - everything reads/writes through the data-layer to Dexie only (spec §3).
- User-created `workouts` and `sets` use locally generated UUID primary keys plus `createdAt`/`updatedAt`; do not add accounts, `userId`, sync queues, tombstones, or cloud dependencies in the MVP (spec §4).
- UI components never touch Dexie directly - always through `src/data-layer/*` functions (spec §3).
- Weight unit is kilograms only, no unit toggle (spec §2).
- No user-added custom exercises, no workout templates, no separate body-weight tracking, no PR badges screen, no set editing/deletion UI - none of these are in the approved MVP scope (spec §2). Do not add them.
- Mastery level is never stored - always computed from `totalSets`/`totalXp` via pure functions (spec §4, §5).
- XP formula constants: `XP_BASE = 10`, qualifying reps for full reps-factor = 5, level-cost growth = ×1.25 per level (spec §5).
- Dark theme by default, single accent color, no multicolor palette (spec §10).
- UI-facing strings must go through the i18n dictionary (RU/EN) - no hardcoded interface text in components (spec §7).

---

## File Structure

```
package.json, vite.config.ts, tsconfig.json, index.html
src/
  main.tsx                     - app entry, mounts <App/>
  App.tsx                      - top-level layout, tab navigation, screen routing
  theme.css                    - Tailwind import + dark theme tokens (accent color, etc.)
  db/
    schema.ts                  - Dexie DB class + TypeScript row types
    seedExercises.ts           - loads data/exercises.json into `exercises` table on first run
  data-layer/
    mastery.ts                 - pure XP/level math (no Dexie dependency)
    mastery.test.ts
    workouts.ts                - startWorkout, finishWorkout, getActiveWorkout, getWorkoutHistory, getWorkoutDetail
    workouts.test.ts
    sets.ts                    - addSet, getLastSetForExercise, getWorkoutExercisesWithSets
    sets.test.ts
    exercises.ts                - searchExercises, getRecentExercises, getAllExercises, groupExercisesByMuscleGroup
    exercises.test.ts
    backup.ts                  - exportData, importData, serializeBackup, parseBackup
    backup.test.ts
  i18n/
    translations.ts             - RU/EN string dictionary + t()
    LangContext.tsx             - React context/provider + useLang() hook
  components/
    Stepper.tsx                 - +/- numeric input with tap-to-edit
    LevelBar.tsx                - mastery progress bar (used in Progress screen)
    NavBar.tsx                  - bottom tab bar (mobile) / side nav (desktop)
  screens/
    HomeScreen.tsx               - start/active workout, set logging
    ExercisePicker.tsx           - recent + search + group tree, modal/overlay
    ProgressScreen.tsx           - mastery list + detail
    HistoryScreen.tsx            - list/calendar toggle
    SettingsScreen.tsx           - language, export, import
  test/
    setup.ts                    - imports fake-indexeddb/auto for Vitest
data/exercises.json              - already exists (337 entries), consumed by seedExercises.ts
```

---

### Task 1: Project scaffold (Vite + React + TypeScript + Tailwind)

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `.gitignore`
- Create: `src/main.tsx`, `src/App.tsx`, `src/theme.css`
- Create: `src/test/setup.ts`

**Interfaces:**
- Produces: a running Vite dev server, `npm test` runner wired to Vitest with `fake-indexeddb` auto-installed for every test file.

- [ ] **Step 1: Scaffold the Vite React-TS project**

Run:
```bash
npm create vite@latest . -- --template react-ts
```
When prompted about the non-empty directory (it already contains `research.md`, `data/`, `docs/`), confirm to proceed in the current directory.

- [ ] **Step 2: Install runtime and dev dependencies**

Run:
```bash
npm install dexie motion
npm install -D tailwindcss @tailwindcss/vite vitest fake-indexeddb vite-plugin-pwa
```

- [ ] **Step 3: Configure Tailwind in `vite.config.ts`**

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
})
```

- [ ] **Step 4: Create the Vitest setup file**

```ts
// src/test/setup.ts
import 'fake-indexeddb/auto'
```

- [ ] **Step 5: Create the dark theme stylesheet**

```css
/* src/theme.css */
@import "tailwindcss";

:root {
  --color-bg: #0b0b0f;
  --color-surface: #16161d;
  --color-accent: #7cff6b;
  --color-text: #f2f2f5;
  --color-text-muted: #9a9aa5;
}

body {
  background-color: var(--color-bg);
  color: var(--color-text);
}
```

- [ ] **Step 6: Wire the stylesheet and confirm the app boots**

```tsx
// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './theme.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

```tsx
// src/App.tsx
export default function App() {
  return <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">Workout Tracker</div>
}
```

Run: `npm run dev`
Expected: dev server starts, browser shows dark page with "Workout Tracker" text, no console errors.

- [ ] **Step 7: Add `package.json` test script and verify Vitest runs**

Ensure `package.json` `scripts` includes:
```json
"test": "vitest run"
```

Run: `npm test`
Expected: "No test files found" (passes, no failures - confirms Vitest + fake-indexeddb wiring loads without error).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite React-TS project with Tailwind and Vitest"
```

---

### Task 2: Dexie schema and exercise catalog seeding

**Files:**
- Create: `src/db/schema.ts`
- Create: `src/db/seedExercises.ts`
- Test: `src/db/seedExercises.test.ts`

**Interfaces:**
- Consumes: `data/exercises.json` (337 entries: `{id, slug, name_ru, name_en, muscle_group, sub_group, equipment}`).
- Produces:
  - `interface Exercise { id: number; slug: string; name_ru: string; name_en: string; muscle_group: string; sub_group: string | null; equipment: string }`
  - `interface Workout { id: string; startedAt: string; finishedAt: string | null; createdAt: string; updatedAt: string }`
  - `interface WorkoutSet { id: string; workoutId: string; exerciseId: number; weight: number; reps: number; setOrder: number; createdAt: string; updatedAt: string }`
  - `interface ExerciseProgress { exerciseId: number; totalSets: number; totalXp: number; bestWeightEver: number }`
  - `class AppDatabase extends Dexie` with tables `exercises`, `workouts`, `sets`, `exerciseProgress`
  - `export const db = new AppDatabase()`
  - `async function seedExercisesIfEmpty(db: AppDatabase, exercises: Exercise[]): Promise<void>`

- [ ] **Step 1: Write the Dexie schema**

```ts
// src/db/schema.ts
import Dexie, { type EntityTable } from 'dexie'

export interface Exercise {
  id: number
  slug: string
  name_ru: string
  name_en: string
  muscle_group: string
  sub_group: string | null
  equipment: string
}

export interface Workout {
  id: string
  startedAt: string
  finishedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface WorkoutSet {
  id: string
  workoutId: string
  exerciseId: number
  weight: number
  reps: number
  setOrder: number
  createdAt: string
  updatedAt: string
}

export interface ExerciseProgress {
  exerciseId: number
  totalSets: number
  totalXp: number
  bestWeightEver: number
}

export class AppDatabase extends Dexie {
  exercises!: EntityTable<Exercise, 'id'>
  workouts!: EntityTable<Workout, 'id'>
  sets!: EntityTable<WorkoutSet, 'id'>
  exerciseProgress!: EntityTable<ExerciseProgress, 'exerciseId'>

  constructor(name = 'WorkoutTrackerDB') {
    super(name)
    this.version(1).stores({
      exercises: 'id, muscle_group',
      workouts: 'id, startedAt, finishedAt, updatedAt',
      sets: 'id, workoutId, exerciseId, createdAt, updatedAt',
      exerciseProgress: 'exerciseId',
    })
  }
}

export const db = new AppDatabase()
```

- [ ] **Step 2: Write the failing seeding test**

```ts
// src/db/seedExercises.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { AppDatabase } from './schema'
import { seedExercisesIfEmpty } from './seedExercises'
import type { Exercise } from './schema'

const sample: Exercise[] = [
  { id: 1, slug: 'barbell-bench-press-1', name_ru: 'Жим лежа', name_en: 'Barbell Bench Press', muscle_group: 'ГРУДЬ', sub_group: 'Середина', equipment: 'штанга' },
  { id: 2, slug: 'barbell-squat-2', name_ru: 'Приседания', name_en: 'Barbell Squat', muscle_group: 'НОГИ', sub_group: 'Квадрицепс', equipment: 'штанга' },
]

describe('seedExercisesIfEmpty', () => {
  let db: AppDatabase

  beforeEach(() => {
    db = new AppDatabase(`test-db-${Math.random()}`)
  })

  it('populates the exercises table when empty', async () => {
    await seedExercisesIfEmpty(db, sample)
    const count = await db.exercises.count()
    expect(count).toBe(2)
    const first = await db.exercises.get(1)
    expect(first?.name_en).toBe('Barbell Bench Press')
  })

  it('does not duplicate rows when called twice', async () => {
    await seedExercisesIfEmpty(db, sample)
    await seedExercisesIfEmpty(db, sample)
    const count = await db.exercises.count()
    expect(count).toBe(2)
  })
})
```

- [ ] **Step 3: Run test, verify it fails**

Run: `npm test -- seedExercises`
Expected: FAIL - `seedExercisesIfEmpty` is not defined / module not found.

- [ ] **Step 4: Implement seeding**

```ts
// src/db/seedExercises.ts
import type { AppDatabase, Exercise } from './schema'

export async function seedExercisesIfEmpty(db: AppDatabase, exercises: Exercise[]): Promise<void> {
  const count = await db.exercises.count()
  if (count > 0) return
  await db.exercises.bulkAdd(exercises)
}
```

- [ ] **Step 5: Run test, verify it passes**

Run: `npm test -- seedExercises`
Expected: PASS (2 tests).

- [ ] **Step 6: Wire real seeding on app startup**

```ts
// add to src/db/seedExercises.ts
import exercisesJson from '../../data/exercises.json'
import { db } from './schema'

export async function initExerciseCatalog(): Promise<void> {
  await seedExercisesIfEmpty(db, exercisesJson as Exercise[])
}
```

Call `initExerciseCatalog()` once from `src/main.tsx` before rendering (await it, show nothing or a blank screen until it resolves - this is near-instant since it's a local bulk insert).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add Dexie schema and exercise catalog seeding"
```

---

### Task 3: Mastery calculation engine (pure functions)

**Files:**
- Create: `src/data-layer/mastery.ts`
- Test: `src/data-layer/mastery.test.ts`

**Interfaces:**
- Consumes: `ExerciseProgress` type from `src/db/schema.ts`.
- Produces:
  - `const XP_BASE = 10`
  - `const MIN_QUALIFYING_REPS = 5`
  - `const LEVEL_GROWTH = 1.25`
  - `const STRENGTH_LEVEL_1_THRESHOLD = 100`
  - `const VOLUME_LEVEL_1_THRESHOLD = 10`
  - `function xpForSet(weight: number, reps: number, priorBestWeight: number): number`
  - `interface LevelInfo { level: number; currentInLevel: number; neededForNextLevel: number }`
  - `function levelInfo(totalAmount: number, level1Threshold: number, growth: number): LevelInfo`
  - `function volumeLevelInfo(totalSets: number): LevelInfo`
  - `function strengthLevelInfo(totalXp: number): LevelInfo`
  - `function applySetToProgress(progress: ExerciseProgress, weight: number, reps: number): ExerciseProgress`

- [ ] **Step 1: Write failing tests for `xpForSet`**

```ts
// src/data-layer/mastery.test.ts
import { describe, it, expect } from 'vitest'
import { xpForSet, levelInfo, volumeLevelInfo, strengthLevelInfo, applySetToProgress } from './mastery'

describe('xpForSet', () => {
  it('gives full XP for the very first set ever (no prior best)', () => {
    expect(xpForSet(50, 5, 0)).toBe(10)
  })

  it('gives full XP when reps and weight both meet the qualifying bar', () => {
    expect(xpForSet(100, 5, 100)).toBe(10)
    expect(xpForSet(100, 8, 100)).toBe(10)
  })

  it('reduces XP proportionally for a single low-rep set', () => {
    expect(xpForSet(100, 1, 100)).toBeCloseTo(2, 5)
  })

  it('reduces XP proportionally for a light set relative to prior best', () => {
    expect(xpForSet(20, 5, 100)).toBeCloseTo(2, 5)
  })

  it('caps the weight factor at 1 even if this set beats prior best', () => {
    expect(xpForSet(120, 5, 100)).toBe(10)
  })

  it('returns 0 XP for a zero-weight set with no prior best (bodyweight edge case)', () => {
    expect(xpForSet(0, 5, 0)).toBe(0)
  })
})

describe('levelInfo', () => {
  it('starts at level 1 with 0 progress', () => {
    expect(levelInfo(0, 100, 1.25)).toEqual({ level: 1, currentInLevel: 0, neededForNextLevel: 100 })
  })

  it('levels up exactly at the threshold', () => {
    expect(levelInfo(100, 100, 1.25)).toEqual({ level: 2, currentInLevel: 0, neededForNextLevel: 125 })
  })

  it('tracks partial progress into the next level', () => {
    expect(levelInfo(150, 100, 1.25)).toEqual({ level: 2, currentInLevel: 50, neededForNextLevel: 125 })
  })

  it('compounds thresholds across multiple level-ups', () => {
    // level1->2 costs 100, level2->3 costs 125: total 225 to reach level 3
    expect(levelInfo(225, 100, 1.25)).toEqual({ level: 3, currentInLevel: 0, neededForNextLevel: Math.round(125 * 1.25) })
  })
})

describe('volumeLevelInfo / strengthLevelInfo', () => {
  it('uses the volume constant for sets-based leveling', () => {
    expect(volumeLevelInfo(10)).toEqual({ level: 2, currentInLevel: 0, neededForNextLevel: 13 })
  })

  it('uses the strength constant for XP-based leveling', () => {
    expect(strengthLevelInfo(0).level).toBe(1)
  })
})

describe('applySetToProgress', () => {
  const empty = { exerciseId: 1, totalSets: 0, totalXp: 0, bestWeightEver: 0 }

  it('records the first set as a full-XP, full-reps set', () => {
    const result = applySetToProgress(empty, 50, 5)
    expect(result).toEqual({ exerciseId: 1, totalSets: 1, totalXp: 10, bestWeightEver: 50 })
  })

  it('uses the PRIOR best (not this set) when computing weight factor', () => {
    const afterFirst = applySetToProgress(empty, 50, 5) // bestWeightEver becomes 50
    const afterSecond = applySetToProgress(afterFirst, 25, 5) // half of prior best
    expect(afterSecond.totalXp).toBeCloseTo(10 + 5, 5)
    expect(afterSecond.bestWeightEver).toBe(50)
  })

  it('raises bestWeightEver when a new PR is set', () => {
    const afterFirst = applySetToProgress(empty, 50, 5)
    const afterPr = applySetToProgress(afterFirst, 60, 5)
    expect(afterPr.bestWeightEver).toBe(60)
    expect(afterPr.totalXp).toBeCloseTo(10 + 10, 5)
  })
})
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm test -- mastery`
Expected: FAIL - `src/data-layer/mastery.ts` does not exist.

- [ ] **Step 3: Implement the mastery engine**

```ts
// src/data-layer/mastery.ts
import type { ExerciseProgress } from '../db/schema'

export const XP_BASE = 10
export const MIN_QUALIFYING_REPS = 5
export const LEVEL_GROWTH = 1.25
export const STRENGTH_LEVEL_1_THRESHOLD = 100
export const VOLUME_LEVEL_1_THRESHOLD = 10

export function xpForSet(weight: number, reps: number, priorBestWeight: number): number {
  const effectiveBest = Math.max(priorBestWeight, weight)
  const weightFactor = effectiveBest > 0 ? weight / effectiveBest : 0
  const repsFactor = Math.min(reps / MIN_QUALIFYING_REPS, 1)
  return XP_BASE * weightFactor * repsFactor
}

export interface LevelInfo {
  level: number
  currentInLevel: number
  neededForNextLevel: number
}

export function levelInfo(totalAmount: number, level1Threshold: number, growth: number): LevelInfo {
  let level = 1
  let thresholdForThisLevel = level1Threshold
  let cumulativeAtLevelStart = 0
  while (totalAmount >= cumulativeAtLevelStart + thresholdForThisLevel) {
    cumulativeAtLevelStart += thresholdForThisLevel
    level += 1
    thresholdForThisLevel = Math.round(thresholdForThisLevel * growth)
  }
  return {
    level,
    currentInLevel: totalAmount - cumulativeAtLevelStart,
    neededForNextLevel: thresholdForThisLevel,
  }
}

export function volumeLevelInfo(totalSets: number): LevelInfo {
  return levelInfo(totalSets, VOLUME_LEVEL_1_THRESHOLD, LEVEL_GROWTH)
}

export function strengthLevelInfo(totalXp: number): LevelInfo {
  return levelInfo(totalXp, STRENGTH_LEVEL_1_THRESHOLD, LEVEL_GROWTH)
}

export function applySetToProgress(progress: ExerciseProgress, weight: number, reps: number): ExerciseProgress {
  const xpGained = xpForSet(weight, reps, progress.bestWeightEver)
  return {
    exerciseId: progress.exerciseId,
    totalSets: progress.totalSets + 1,
    totalXp: progress.totalXp + xpGained,
    bestWeightEver: Math.max(progress.bestWeightEver, weight),
  }
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npm test -- mastery`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: implement mastery XP and leveling engine"
```

**Known limitation (document, do not fix now):** a zero-weight set (e.g. an unweighted bodyweight exercise) always yields 0 strength XP since `weightFactor` is 0 when `effectiveBest` is 0. Volume-scale leveling still works normally for these. Out of scope for MVP per spec §2 (no separate bodyweight handling requested).

---

### Task 4: Data layer - workouts and sets

**Files:**
- Create: `src/data-layer/workouts.ts`
- Test: `src/data-layer/workouts.test.ts`
- Create: `src/data-layer/sets.ts`
- Test: `src/data-layer/sets.test.ts`

**Interfaces:**
- Consumes: `AppDatabase`, `Workout`, `WorkoutSet`, `Exercise`, `ExerciseProgress` (Task 2); `applySetToProgress` (Task 3).
- Produces:
  - `async function startWorkout(db: AppDatabase): Promise<Workout>`
  - `async function finishWorkout(db: AppDatabase, workoutId: string): Promise<void>`
  - `async function getActiveWorkout(db: AppDatabase): Promise<Workout | undefined>`
  - `async function getWorkoutHistory(db: AppDatabase): Promise<Workout[]>` (finished workouts, newest first)
  - `async function getWorkoutDetail(db: AppDatabase, workoutId: string): Promise<{ workout: Workout; entries: Array<{ exercise: Exercise; sets: WorkoutSet[] }> }>`
  - `async function addSet(db: AppDatabase, workoutId: string, exerciseId: number, weight: number, reps: number): Promise<WorkoutSet>`
  - `async function getLastSetForExercise(db: AppDatabase, exerciseId: number): Promise<WorkoutSet | undefined>`
  - `async function getWorkoutExercisesWithSets(db: AppDatabase, workoutId: string): Promise<Array<{ exercise: Exercise; sets: WorkoutSet[] }>>`

**Note on scope:** no set editing or deletion functions - not in MVP scope per spec §2/§7 (the spec's set-logging flow has no delete/edit step; adding one would be scope creep).

- [ ] **Step 1: Write failing tests for `workouts.ts`**

```ts
// src/data-layer/workouts.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { AppDatabase } from '../db/schema'
import { startWorkout, finishWorkout, getActiveWorkout, getWorkoutHistory } from './workouts'

describe('workouts data layer', () => {
  let db: AppDatabase

  beforeEach(() => {
    db = new AppDatabase(`test-db-${Math.random()}`)
  })

  it('starts a workout with no finishedAt', async () => {
    const w = await startWorkout(db)
    expect(w.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(w.finishedAt).toBeNull()
    expect(w.createdAt).toBe(w.updatedAt)
  })

  it('returns the active (unfinished) workout', async () => {
    const w = await startWorkout(db)
    const active = await getActiveWorkout(db)
    expect(active?.id).toBe(w.id)
  })

  it('returns undefined when there is no active workout', async () => {
    const active = await getActiveWorkout(db)
    expect(active).toBeUndefined()
  })

  it('finishing a workout clears active status and adds it to history', async () => {
    const w = await startWorkout(db)
    await finishWorkout(db, w.id!)
    expect(await getActiveWorkout(db)).toBeUndefined()
    const history = await getWorkoutHistory(db)
    expect(history).toHaveLength(1)
    expect(history[0].finishedAt).not.toBeNull()
  })

  it('history is sorted newest first', async () => {
    const w1 = await startWorkout(db)
    await finishWorkout(db, w1.id!)
    const w2 = await startWorkout(db)
    await finishWorkout(db, w2.id!)
    const history = await getWorkoutHistory(db)
    expect(history.map((w) => w.id)).toEqual([w2.id, w1.id])
  })
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm test -- workouts`
Expected: FAIL - `src/data-layer/workouts.ts` does not exist.

- [ ] **Step 3: Implement `workouts.ts`**

```ts
// src/data-layer/workouts.ts
import type { AppDatabase, Workout, Exercise, WorkoutSet } from '../db/schema'
import { getWorkoutExercisesWithSets } from './sets'

export async function startWorkout(db: AppDatabase): Promise<Workout> {
  const now = new Date().toISOString()
  const workout: Workout = {
    id: crypto.randomUUID(),
    startedAt: now,
    finishedAt: null,
    createdAt: now,
    updatedAt: now,
  }
  await db.workouts.add(workout)
  return workout
}

export async function finishWorkout(db: AppDatabase, workoutId: string): Promise<void> {
  const now = new Date().toISOString()
  await db.workouts.update(workoutId, { finishedAt: now, updatedAt: now })
}

export async function getActiveWorkout(db: AppDatabase): Promise<Workout | undefined> {
  const all = await db.workouts.toArray()
  return all.find((w) => w.finishedAt === null)
}

export async function getWorkoutHistory(db: AppDatabase): Promise<Workout[]> {
  const all = await db.workouts.toArray()
  return all
    .filter((w) => w.finishedAt !== null)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
}

export async function getWorkoutDetail(
  db: AppDatabase,
  workoutId: string,
): Promise<{ workout: Workout; entries: Array<{ exercise: Exercise; sets: WorkoutSet[] }> }> {
  const workout = await db.workouts.get(workoutId)
  if (!workout) throw new Error(`Workout ${workoutId} not found`)
  const entries = await getWorkoutExercisesWithSets(db, workoutId)
  return { workout, entries }
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npm test -- workouts`
Expected: PASS (5 tests). Note: this will still fail to compile until `sets.ts` exists (next step) since `workouts.ts` imports from it - implement Steps 5-8 before re-running.

- [ ] **Step 5: Write failing tests for `sets.ts`**

```ts
// src/data-layer/sets.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { AppDatabase } from '../db/schema'
import type { Exercise } from '../db/schema'
import { startWorkout } from './workouts'
import { addSet, getLastSetForExercise, getWorkoutExercisesWithSets } from './sets'

const benchPress: Exercise = {
  id: 1,
  slug: 'barbell-bench-press-1',
  name_ru: 'Жим лежа',
  name_en: 'Barbell Bench Press',
  muscle_group: 'ГРУДЬ',
  sub_group: 'Середина',
  equipment: 'штанга',
}

describe('sets data layer', () => {
  let db: AppDatabase

  beforeEach(async () => {
    db = new AppDatabase(`test-db-${Math.random()}`)
    await db.exercises.add(benchPress)
  })

  it('adds a set tied to a workout and exercise, with incrementing order', async () => {
    const workout = await startWorkout(db)
    const set1 = await addSet(db, workout.id!, benchPress.id, 60, 8)
    const set2 = await addSet(db, workout.id!, benchPress.id, 60, 8)
    expect(set1.setOrder).toBe(0)
    expect(set2.setOrder).toBe(1)
    expect(set1.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(set1.createdAt).toBe(set1.updatedAt)
  })

  it('updates exerciseProgress as a side effect of adding a set', async () => {
    const workout = await startWorkout(db)
    await addSet(db, workout.id!, benchPress.id, 60, 8)
    const progress = await db.exerciseProgress.get(benchPress.id)
    expect(progress?.totalSets).toBe(1)
    expect(progress?.bestWeightEver).toBe(60)
  })

  it('returns the most recently logged set for an exercise, across workouts', async () => {
    const w1 = await startWorkout(db)
    await addSet(db, w1.id!, benchPress.id, 50, 8)
    const w2 = await startWorkout(db)
    await addSet(db, w2.id!, benchPress.id, 55, 8)
    const last = await getLastSetForExercise(db, benchPress.id)
    expect(last?.weight).toBe(55)
  })

  it('returns undefined when the exercise has never been logged', async () => {
    const last = await getLastSetForExercise(db, 999)
    expect(last).toBeUndefined()
  })

  it('groups sets by exercise for a given workout', async () => {
    const workout = await startWorkout(db)
    await addSet(db, workout.id!, benchPress.id, 60, 8)
    await addSet(db, workout.id!, benchPress.id, 62.5, 6)
    const grouped = await getWorkoutExercisesWithSets(db, workout.id!)
    expect(grouped).toHaveLength(1)
    expect(grouped[0].exercise.name_ru).toBe('Жим лежа')
    expect(grouped[0].sets).toHaveLength(2)
  })
})
```

- [ ] **Step 6: Run test, verify it fails**

Run: `npm test -- sets`
Expected: FAIL - `src/data-layer/sets.ts` does not exist.

- [ ] **Step 7: Implement `sets.ts`**

```ts
// src/data-layer/sets.ts
import type { AppDatabase, WorkoutSet, Exercise } from '../db/schema'
import { applySetToProgress } from './mastery'

export async function addSet(
  db: AppDatabase,
  workoutId: string,
  exerciseId: number,
  weight: number,
  reps: number,
): Promise<WorkoutSet> {
  return db.transaction('rw', db.sets, db.exerciseProgress, async () => {
    const existingCount = await db.sets.where({ workoutId, exerciseId }).count()
    const now = new Date().toISOString()
    const set: WorkoutSet = {
      id: crypto.randomUUID(),
      workoutId,
      exerciseId,
      weight,
      reps,
      setOrder: existingCount,
      createdAt: now,
      updatedAt: now,
    }
    await db.sets.add(set)

    const currentProgress = (await db.exerciseProgress.get(exerciseId)) ?? {
      exerciseId,
      totalSets: 0,
      totalXp: 0,
      bestWeightEver: 0,
    }
    const updatedProgress = applySetToProgress(currentProgress, weight, reps)
    await db.exerciseProgress.put(updatedProgress)

    return set
  })
}

export async function getLastSetForExercise(db: AppDatabase, exerciseId: number): Promise<WorkoutSet | undefined> {
  const sets = await db.sets.where({ exerciseId }).toArray()
  if (sets.length === 0) return undefined
  return sets.reduce((latest, s) => (s.createdAt > latest.createdAt ? s : latest))
}

export async function getWorkoutExercisesWithSets(
  db: AppDatabase,
  workoutId: string,
): Promise<Array<{ exercise: Exercise; sets: WorkoutSet[] }>> {
  const sets = await db.sets.where({ workoutId }).toArray()
  const exerciseIds = [...new Set(sets.map((s) => s.exerciseId))]
  const exercises = await db.exercises.bulkGet(exerciseIds)

  return exerciseIds.map((exerciseId, i) => ({
    exercise: exercises[i]!,
    sets: sets.filter((s) => s.exerciseId === exerciseId).sort((a, b) => a.setOrder - b.setOrder),
  }))
}
```

- [ ] **Step 8: Run both test files, verify all pass**

Run: `npm test -- workouts sets`
Expected: PASS (10 tests total).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add workouts and sets data layer with mastery side-effects"
```

---

### Task 5: Data layer - exercise search and grouping

**Files:**
- Create: `src/data-layer/exercises.ts`
- Test: `src/data-layer/exercises.test.ts`

**Interfaces:**
- Consumes: `AppDatabase`, `Exercise` (Task 2).
- Produces:
  - `async function getAllExercises(db: AppDatabase): Promise<Exercise[]>`
  - `async function searchExercises(db: AppDatabase, query: string): Promise<Exercise[]>`
  - `async function getRecentExercises(db: AppDatabase, limit?: number): Promise<Exercise[]>`
  - `type ExerciseTree = Record<string, Record<string, Exercise[]>>` (muscle_group → sub_group ("_none" if null) → exercises)
  - `function groupExercisesByMuscleGroup(exercises: Exercise[]): ExerciseTree`

- [ ] **Step 1: Write failing tests**

```ts
// src/data-layer/exercises.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { AppDatabase } from '../db/schema'
import type { Exercise } from '../db/schema'
import { startWorkout } from './workouts'
import { addSet } from './sets'
import { getAllExercises, searchExercises, getRecentExercises, groupExercisesByMuscleGroup } from './exercises'

const bench: Exercise = { id: 1, slug: 'bench-1', name_ru: 'Жим лежа', name_en: 'Barbell Bench Press', muscle_group: 'ГРУДЬ', sub_group: 'Середина', equipment: 'штанга' }
const squat: Exercise = { id: 2, slug: 'squat-2', name_ru: 'Приседания', name_en: 'Barbell Squat', muscle_group: 'НОГИ', sub_group: 'Квадрицепс', equipment: 'штанга' }
const plank: Exercise = { id: 3, slug: 'plank-3', name_ru: 'Планка', name_en: 'Plank', muscle_group: 'ФУЛБОДИ', sub_group: null, equipment: 'свой вес' }

describe('exercises data layer', () => {
  let db: AppDatabase

  beforeEach(async () => {
    db = new AppDatabase(`test-db-${Math.random()}`)
    await db.exercises.bulkAdd([bench, squat, plank])
  })

  it('returns all exercises', async () => {
    expect(await getAllExercises(db)).toHaveLength(3)
  })

  it('searches case-insensitively across RU and EN names', async () => {
    expect((await searchExercises(db, 'жим')).map((e) => e.id)).toEqual([1])
    expect((await searchExercises(db, 'SQUAT')).map((e) => e.id)).toEqual([2])
  })

  it('returns an empty array for no matches', async () => {
    expect(await searchExercises(db, 'zzz')).toEqual([])
  })

  it('returns recently used exercises, most recent first, deduplicated', async () => {
    const w = await startWorkout(db)
    await addSet(db, w.id!, bench.id, 60, 8)
    await addSet(db, w.id!, squat.id, 80, 5)
    await addSet(db, w.id!, bench.id, 62.5, 6) // bench used again - should not duplicate, moves to front
    const recent = await getRecentExercises(db, 10)
    expect(recent.map((e) => e.id)).toEqual([2, 1])
  })

  it('groups exercises by muscle group and sub group, bucketing null sub_group under "_none"', () => {
    const tree = groupExercisesByMuscleGroup([bench, squat, plank])
    expect(tree['ГРУДЬ']['Середина']).toEqual([bench])
    expect(tree['НОГИ']['Квадрицепс']).toEqual([squat])
    expect(tree['ФУЛБОДИ']['_none']).toEqual([plank])
  })
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm test -- exercises`
Expected: FAIL - `src/data-layer/exercises.ts` does not exist.

- [ ] **Step 3: Implement `exercises.ts`**

```ts
// src/data-layer/exercises.ts
import type { AppDatabase, Exercise } from '../db/schema'

export async function getAllExercises(db: AppDatabase): Promise<Exercise[]> {
  return db.exercises.toArray()
}

export async function searchExercises(db: AppDatabase, query: string): Promise<Exercise[]> {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const all = await db.exercises.toArray()
  return all.filter((e) => e.name_ru.toLowerCase().includes(q) || e.name_en.toLowerCase().includes(q))
}

export async function getRecentExercises(db: AppDatabase, limit = 10): Promise<Exercise[]> {
  const sets = await db.sets.orderBy('id').reverse().toArray()
  const seen = new Set<number>()
  const orderedIds: number[] = []
  for (const s of sets) {
    if (!seen.has(s.exerciseId)) {
      seen.add(s.exerciseId)
      orderedIds.push(s.exerciseId)
    }
    if (orderedIds.length >= limit) break
  }
  const exercises = await db.exercises.bulkGet(orderedIds)
  return exercises.filter((e): e is Exercise => e !== undefined)
}

export type ExerciseTree = Record<string, Record<string, Exercise[]>>

export function groupExercisesByMuscleGroup(exercises: Exercise[]): ExerciseTree {
  const tree: ExerciseTree = {}
  for (const e of exercises) {
    const sub = e.sub_group ?? '_none'
    tree[e.muscle_group] ??= {}
    tree[e.muscle_group][sub] ??= []
    tree[e.muscle_group][sub].push(e)
  }
  return tree
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npm test -- exercises`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add exercise search, recent list, and grouping"
```

---

### Task 6: Export/Import (backup) module

**Files:**
- Create: `src/data-layer/backup.ts`
- Test: `src/data-layer/backup.test.ts`

**Interfaces:**
- Consumes: `AppDatabase`, `Workout`, `WorkoutSet`, `ExerciseProgress` (Task 2).
- Produces:
  - `interface BackupData { version: 1; exportedAt: string; workouts: Workout[]; sets: WorkoutSet[]; exerciseProgress: ExerciseProgress[] }`
  - `async function exportData(db: AppDatabase): Promise<BackupData>`
  - `async function importData(db: AppDatabase, data: BackupData): Promise<void>` (full replace)
  - `function serializeBackup(data: BackupData): string`
  - `function parseBackup(json: string): BackupData` (throws `Error('INVALID_BACKUP_FILE')` on malformed input)

- [ ] **Step 1: Write failing tests**

```ts
// src/data-layer/backup.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { AppDatabase } from '../db/schema'
import { startWorkout, finishWorkout } from './workouts'
import { addSet } from './sets'
import { exportData, importData, serializeBackup, parseBackup } from './backup'

describe('backup module', () => {
  let db: AppDatabase

  beforeEach(async () => {
    db = new AppDatabase(`test-db-${Math.random()}`)
    await db.exercises.add({ id: 1, slug: 'bench-1', name_ru: 'Жим лежа', name_en: 'Bench Press', muscle_group: 'ГРУДЬ', sub_group: null, equipment: 'штанга' })
  })

  it('exports all workouts, sets, and exercise progress', async () => {
    const w = await startWorkout(db)
    await addSet(db, w.id!, 1, 60, 8)
    await finishWorkout(db, w.id!)

    const backup = await exportData(db)
    expect(backup.version).toBe(1)
    expect(backup.workouts).toHaveLength(1)
    expect(backup.sets).toHaveLength(1)
    expect(backup.exerciseProgress).toHaveLength(1)
  })

  it('round-trips through serialize/parse without data loss', async () => {
    const w = await startWorkout(db)
    await addSet(db, w.id!, 1, 60, 8)
    const original = await exportData(db)

    const json = serializeBackup(original)
    const parsed = parseBackup(json)

    expect(parsed).toEqual(original)
  })

  it('importData fully replaces existing data', async () => {
    const w1 = await startWorkout(db)
    await addSet(db, w1.id!, 1, 60, 8)
    const backupBeforeSecondWorkout = await exportData(db)

    const w2 = await startWorkout(db)
    await addSet(db, w2.id!, 1, 999, 1) // this should be wiped out by import

    await importData(db, backupBeforeSecondWorkout)

    const afterImport = await exportData(db)
    expect(afterImport.workouts).toHaveLength(1)
    expect(afterImport.workouts[0].id).toBe(w1.id)
  })

  it('parseBackup rejects malformed JSON structure', () => {
    expect(() => parseBackup(JSON.stringify({ foo: 'bar' }))).toThrow('INVALID_BACKUP_FILE')
    expect(() => parseBackup('not json')).toThrow()
  })
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm test -- backup`
Expected: FAIL - `src/data-layer/backup.ts` does not exist.

- [ ] **Step 3: Implement `backup.ts`**

```ts
// src/data-layer/backup.ts
import type { AppDatabase, Workout, WorkoutSet, ExerciseProgress } from '../db/schema'

export interface BackupData {
  version: 1
  exportedAt: string
  workouts: Workout[]
  sets: WorkoutSet[]
  exerciseProgress: ExerciseProgress[]
}

export async function exportData(db: AppDatabase): Promise<BackupData> {
  const [workouts, sets, exerciseProgress] = await Promise.all([
    db.workouts.toArray(),
    db.sets.toArray(),
    db.exerciseProgress.toArray(),
  ])
  return { version: 1, exportedAt: new Date().toISOString(), workouts, sets, exerciseProgress }
}

export async function importData(db: AppDatabase, data: BackupData): Promise<void> {
  await db.transaction('rw', db.workouts, db.sets, db.exerciseProgress, async () => {
    await Promise.all([db.workouts.clear(), db.sets.clear(), db.exerciseProgress.clear()])
    await Promise.all([
      db.workouts.bulkAdd(data.workouts),
      db.sets.bulkAdd(data.sets),
      db.exerciseProgress.bulkAdd(data.exerciseProgress),
    ])
  })
}

export function serializeBackup(data: BackupData): string {
  return JSON.stringify(data, null, 2)
}

export function parseBackup(json: string): BackupData {
  const parsed = JSON.parse(json)
  if (
    parsed?.version !== 1 ||
    !Array.isArray(parsed.workouts) ||
    !Array.isArray(parsed.sets) ||
    !Array.isArray(parsed.exerciseProgress)
  ) {
    throw new Error('INVALID_BACKUP_FILE')
  }
  return parsed as BackupData
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npm test -- backup`
Expected: PASS (4 tests).

- [ ] **Step 5: Run the full test suite so far**

Run: `npm test`
Expected: PASS - all test files (mastery, workouts, sets, exercises, backup, seedExercises) green.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add export/import backup module with round-trip tests"
```

---

### Task 7: i18n (RU/EN interface dictionary)

**Files:**
- Create: `src/i18n/translations.ts`
- Test: `src/i18n/translations.test.ts`
- Create: `src/i18n/LangContext.tsx`

**Interfaces:**
- Produces:
  - `type Lang = 'ru' | 'en'`
  - `type TranslationKey` (union of all dictionary keys)
  - `function t(lang: Lang, key: TranslationKey): string`
  - `function LangProvider({ children }: { children: React.ReactNode }): JSX.Element`
  - `function useLang(): { lang: Lang; setLang: (l: Lang) => void; t: (key: TranslationKey) => string }`
  - Persists selected language to `localStorage` key `"lang"`, defaults to `'ru'`.

- [ ] **Step 1: Write the failing test for `t()`**

```ts
// src/i18n/translations.test.ts
import { describe, it, expect } from 'vitest'
import { t } from './translations'

describe('t (translation lookup)', () => {
  it('returns the Russian string for a known key', () => {
    expect(t('ru', 'startWorkout')).toBe('Начать тренировку')
  })

  it('returns the English string for the same key', () => {
    expect(t('en', 'startWorkout')).toBe('Start Workout')
  })
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm test -- translations`
Expected: FAIL - `src/i18n/translations.ts` does not exist.

- [ ] **Step 3: Implement the dictionary**

```ts
// src/i18n/translations.ts
export type Lang = 'ru' | 'en'

export const translations = {
  ru: {
    startWorkout: 'Начать тренировку',
    continueWorkout: 'Продолжить тренировку',
    finishWorkout: 'Завершить тренировку',
    addExercise: '+ Добавить упражнение',
    recent: 'Недавние',
    search: 'Поиск',
    setDone: 'Подход выполнен',
    tabWorkout: 'Тренировка',
    tabProgress: 'Прогресс',
    tabHistory: 'История',
    tabSettings: 'Настройки',
    historyList: 'Список',
    historyCalendar: 'Календарь',
    settingsLanguage: 'Язык',
    settingsExport: 'Экспорт данных',
    settingsImport: 'Импорт данных',
    importConfirm: 'Это заменит текущие данные. Продолжить?',
    emptyHomeHint: 'Первый подход займёт 10 секунд',
    volumeLevel: 'Объём',
    strengthLevel: 'Сила',
  },
  en: {
    startWorkout: 'Start Workout',
    continueWorkout: 'Continue Workout',
    finishWorkout: 'Finish Workout',
    addExercise: '+ Add Exercise',
    recent: 'Recent',
    search: 'Search',
    setDone: 'Set done',
    tabWorkout: 'Workout',
    tabProgress: 'Progress',
    tabHistory: 'History',
    tabSettings: 'Settings',
    historyList: 'List',
    historyCalendar: 'Calendar',
    settingsLanguage: 'Language',
    settingsExport: 'Export data',
    settingsImport: 'Import data',
    importConfirm: 'This will replace your current data. Continue?',
    emptyHomeHint: 'Your first set takes 10 seconds',
    volumeLevel: 'Volume',
    strengthLevel: 'Strength',
  },
} as const

export type TranslationKey = keyof typeof translations.ru

export function t(lang: Lang, key: TranslationKey): string {
  return translations[lang][key]
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npm test -- translations`
Expected: PASS (2 tests).

- [ ] **Step 5: Implement the language context (no test - thin React wiring)**

```tsx
// src/i18n/LangContext.tsx
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { type Lang, type TranslationKey, t } from './translations'

interface LangContextValue {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: TranslationKey) => string
}

const LangContext = createContext<LangContextValue | null>(null)

function readInitialLang(): Lang {
  const stored = localStorage.getItem('lang')
  return stored === 'en' ? 'en' : 'ru'
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readInitialLang)

  const setLang = useCallback((l: Lang) => {
    localStorage.setItem('lang', l)
    setLangState(l)
  }, [])

  const translate = useCallback((key: TranslationKey) => t(lang, key), [lang])

  return <LangContext.Provider value={{ lang, setLang, t: translate }}>{children}</LangContext.Provider>
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang must be used within LangProvider')
  return ctx
}
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add RU/EN i18n dictionary and language context"
```

---

### Task 8: App shell - theme tokens, tab navigation, screen routing

**Files:**
- Modify: `src/theme.css`
- Create: `src/components/NavBar.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `LangProvider`, `useLang` (Task 7).
- Produces:
  - `type ScreenName = 'workout' | 'progress' | 'history' | 'settings'`
  - `function NavBar({ active, onChange }: { active: ScreenName; onChange: (s: ScreenName) => void }): JSX.Element`
  - `App.tsx` renders `LangProvider` at the root and switches between the four screens by local state (no router library - four screens, YAGNI).

This task has no automated tests per spec §11 ("UI components - manual verification is enough for MVP"). Each step ends in a manual browser check instead.

- [ ] **Step 1: Extend theme tokens for surfaces/borders used across screens**

```css
/* src/theme.css - append after existing :root block */
:root {
  --color-border: #26262f;
  --radius-card: 16px;
}
```

- [ ] **Step 2: Build the tab navigation component**

```tsx
// src/components/NavBar.tsx
import { useLang } from '../i18n/LangContext'

export type ScreenName = 'workout' | 'progress' | 'history' | 'settings'

const TABS: { id: ScreenName; labelKey: 'tabWorkout' | 'tabProgress' | 'tabHistory' | 'tabSettings' }[] = [
  { id: 'workout', labelKey: 'tabWorkout' },
  { id: 'progress', labelKey: 'tabProgress' },
  { id: 'history', labelKey: 'tabHistory' },
  { id: 'settings', labelKey: 'tabSettings' },
]

export function NavBar({ active, onChange }: { active: ScreenName; onChange: (s: ScreenName) => void }) {
  const { t } = useLang()
  return (
    <nav className="fixed bottom-0 left-0 right-0 flex justify-around border-t border-[var(--color-border)] bg-[var(--color-surface)] py-2 md:static md:flex-col md:justify-start md:border-t-0 md:border-r md:h-screen md:w-48 md:py-4">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-3 py-2 text-sm rounded-lg ${active === tab.id ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'}`}
        >
          {t(tab.labelKey)}
        </button>
      ))}
    </nav>
  )
}
```

- [ ] **Step 3: Wire routing and providers in `App.tsx`**

```tsx
// src/App.tsx
import { useState } from 'react'
import { LangProvider } from './i18n/LangContext'
import { NavBar, type ScreenName } from './components/NavBar'
import { HomeScreen } from './screens/HomeScreen'
import { ProgressScreen } from './screens/ProgressScreen'
import { HistoryScreen } from './screens/HistoryScreen'
import { SettingsScreen } from './screens/SettingsScreen'

function Screen({ name }: { name: ScreenName }) {
  switch (name) {
    case 'workout':
      return <HomeScreen />
    case 'progress':
      return <ProgressScreen />
    case 'history':
      return <HistoryScreen />
    case 'settings':
      return <SettingsScreen />
  }
}

export default function App() {
  const [active, setActive] = useState<ScreenName>('workout')

  return (
    <LangProvider>
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] md:flex">
        <NavBar active={active} onChange={setActive} />
        <main className="flex-1 pb-20 md:pb-0 p-4">
          <Screen name={active} />
        </main>
      </div>
    </LangProvider>
  )
}
```

Note: this task creates placeholder imports for `HomeScreen`, `ProgressScreen`, `HistoryScreen`, `SettingsScreen` that don't exist yet - implemented in Tasks 9, 11, 12, 13. Create minimal stub components now so the app compiles:

```tsx
// src/screens/HomeScreen.tsx (stub, replaced in Task 9)
export function HomeScreen() { return <div>Workout screen</div> }
```
```tsx
// src/screens/ProgressScreen.tsx (stub, replaced in Task 11)
export function ProgressScreen() { return <div>Progress screen</div> }
```
```tsx
// src/screens/HistoryScreen.tsx (stub, replaced in Task 12)
export function HistoryScreen() { return <div>History screen</div> }
```
```tsx
// src/screens/SettingsScreen.tsx (stub, replaced in Task 13)
export function SettingsScreen() { return <div>Settings screen</div> }
```

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, open in browser, resize to a narrow (mobile) width and a wide (desktop) width.
Expected: at narrow width, tabs show as a bottom bar; at wide width, tabs show as a left sidebar. Clicking each tab swaps the visible stub screen. No console errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add app shell with responsive tab navigation"
```

---

### Task 9: Stepper component and Home/Workout screen

**Files:**
- Create: `src/components/Stepper.tsx`
- Create: `src/screens/ExercisePicker.tsx` (stub - real implementation in Task 10)
- Modify: `src/screens/HomeScreen.tsx` (replaces the Task 8 stub)

**Interfaces:**
- Consumes: `db` (Task 2); `startWorkout`, `finishWorkout`, `getActiveWorkout`, `getWorkoutHistory` (Task 4); `addSet`, `getLastSetForExercise`, `getWorkoutExercisesWithSets` (Task 4); `useLang` (Task 7).
- Produces:
  - `function Stepper({ value, step, onChange, min }: { value: number; step: number; onChange: (v: number) => void; min?: number }): JSX.Element`
  - `function ExercisePicker({ onPick, onClose }: { onPick: (e: Exercise) => void; onClose: () => void }): JSX.Element` (stub for now)
  - `REST_SECONDS = 90` - rest timer duration constant, tunable later.

No automated tests (spec §11 - manual verification for UI). Steps end in browser checks.

- [ ] **Step 1: Implement the Stepper component**

```tsx
// src/components/Stepper.tsx
import { useState } from 'react'

interface StepperProps {
  value: number
  step: number
  onChange: (v: number) => void
  min?: number
}

export function Stepper({ value, step, onChange, min = 0 }: StepperProps) {
  const [editing, setEditing] = useState(false)

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))}
        className="h-10 w-10 rounded-full bg-[var(--color-surface)] text-xl"
      >
        −
      </button>
      {editing ? (
        <input
          type="number"
          value={value}
          autoFocus
          onChange={(e) => onChange(Number(e.target.value))}
          onBlur={() => setEditing(false)}
          className="w-16 rounded-lg bg-[var(--color-surface)] p-2 text-center text-xl font-bold"
        />
      ) : (
        <button onClick={() => setEditing(true)} className="w-16 text-center text-2xl font-bold">
          {value}
        </button>
      )}
      <button
        onClick={() => onChange(+(value + step).toFixed(2))}
        className="h-10 w-10 rounded-full bg-[var(--color-surface)] text-xl"
      >
        +
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Create the ExercisePicker stub (real version in Task 10)**

```tsx
// src/screens/ExercisePicker.tsx (stub)
import type { Exercise } from '../db/schema'

export function ExercisePicker({ onPick, onClose }: { onPick: (e: Exercise) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-[var(--color-bg)] p-4">
      <button onClick={onClose}>close</button>
    </div>
  )
}
```

- [ ] **Step 3: Implement the Home/Workout screen**

```tsx
// src/screens/HomeScreen.tsx
import { useEffect, useState, useCallback } from 'react'
import { db } from '../db/schema'
import type { Workout, Exercise, WorkoutSet } from '../db/schema'
import { startWorkout, finishWorkout, getActiveWorkout, getWorkoutHistory } from '../data-layer/workouts'
import { addSet, getLastSetForExercise, getWorkoutExercisesWithSets } from '../data-layer/sets'
import { useLang } from '../i18n/LangContext'
import { Stepper } from '../components/Stepper'
import { ExercisePicker } from './ExercisePicker'

const REST_SECONDS = 90

type Entry = { exercise: Exercise; sets: WorkoutSet[] }

export function HomeScreen() {
  const { t } = useLang()
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [entries, setEntries] = useState<Entry[]>([])
  const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [draft, setDraft] = useState<Record<number, { weight: number; reps: number }>>({})
  const [restSecondsLeft, setRestSecondsLeft] = useState<number | null>(null)

  const refreshEntries = useCallback(async (workoutId: string) => {
    setEntries(await getWorkoutExercisesWithSets(db, workoutId))
  }, [])

  useEffect(() => {
    ;(async () => {
      const active = await getActiveWorkout(db)
      setWorkout(active ?? null)
      if (active?.id) await refreshEntries(active.id)
      else setRecentWorkouts((await getWorkoutHistory(db)).slice(0, 4))
    })()
  }, [refreshEntries])

  useEffect(() => {
    if (restSecondsLeft === null || restSecondsLeft <= 0) return
    const id = setTimeout(() => setRestSecondsLeft((s) => (s ?? 1) - 1), 1000)
    return () => clearTimeout(id)
  }, [restSecondsLeft])

  async function handleStart() {
    const w = await startWorkout(db)
    setWorkout(w)
    setEntries([])
  }

  async function handleFinish() {
    if (!workout?.id) return
    await finishWorkout(db, workout.id)
    setWorkout(null)
    setEntries([])
    setRecentWorkouts((await getWorkoutHistory(db)).slice(0, 4))
  }

  async function handlePickExercise(exercise: Exercise) {
    setPickerOpen(false)
    const last = await getLastSetForExercise(db, exercise.id)
    setDraft((d) => ({ ...d, [exercise.id]: { weight: last?.weight ?? 20, reps: last?.reps ?? 8 } }))
    setEntries((e) => (e.some((x) => x.exercise.id === exercise.id) ? e : [...e, { exercise, sets: [] }]))
  }

  async function handleSetDone(exercise: Exercise) {
    if (!workout?.id) return
    const values = draft[exercise.id] ?? { weight: 20, reps: 8 }
    await addSet(db, workout.id, exercise.id, values.weight, values.reps)
    await refreshEntries(workout.id)
    setRestSecondsLeft(REST_SECONDS)
  }

  if (!workout) {
    return (
      <div className="flex flex-col items-center gap-6 pt-12">
        <button onClick={handleStart} className="rounded-full bg-[var(--color-accent)] px-8 py-4 text-lg font-bold text-black">
          {t('startWorkout')}
        </button>
        <p className="text-sm text-[var(--color-text-muted)]">{t('emptyHomeHint')}</p>
        <ul className="w-full max-w-sm space-y-2">
          {recentWorkouts.map((w) => (
            <li key={w.id} className="rounded-[var(--radius-card)] bg-[var(--color-surface)] p-3 text-sm">
              {new Date(w.startedAt).toLocaleDateString()}
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {restSecondsLeft !== null && (
        <div className="rounded-[var(--radius-card)] bg-[var(--color-surface)] p-3 text-center font-bold text-[var(--color-accent)]">
          {restSecondsLeft}s
        </div>
      )}

      {entries.map(({ exercise, sets }) => (
        <div key={exercise.id} className="rounded-[var(--radius-card)] bg-[var(--color-surface)] p-4">
          <h3 className="mb-2 font-bold">{exercise.name_ru}</h3>
          <ul className="mb-3 space-y-1 text-sm text-[var(--color-text-muted)]">
            {sets.map((s) => (
              <li key={s.id}>
                {s.weight}кг × {s.reps}
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-4">
            <Stepper
              value={draft[exercise.id]?.weight ?? 20}
              step={2.5}
              onChange={(v) => setDraft((d) => ({ ...d, [exercise.id]: { weight: v, reps: d[exercise.id]?.reps ?? 8 } }))}
            />
            <Stepper
              value={draft[exercise.id]?.reps ?? 8}
              step={1}
              onChange={(v) => setDraft((d) => ({ ...d, [exercise.id]: { weight: d[exercise.id]?.weight ?? 20, reps: v } }))}
            />
            <button
              onClick={() => handleSetDone(exercise)}
              className="ml-auto rounded-full bg-[var(--color-accent)] px-4 py-2 font-bold text-black"
            >
              ✓
            </button>
          </div>
        </div>
      ))}

      <button onClick={() => setPickerOpen(true)} className="w-full rounded-[var(--radius-card)] border border-[var(--color-border)] p-3">
        {t('addExercise')}
      </button>
      <button onClick={handleFinish} className="w-full rounded-full bg-[var(--color-surface)] p-3 font-bold">
        {t('finishWorkout')}
      </button>

      {pickerOpen && <ExercisePicker onPick={handlePickExercise} onClose={() => setPickerOpen(false)} />}
    </div>
  )
}
```

- [ ] **Step 4: Manual verification**

Run: `npm run dev`. In the browser: click "Начать тренировку" → click "+ Добавить упражнение" → the stub picker opens and closes via its close button (real exercise list comes in Task 10, so picking isn't testable yet) → click "Завершить тренировку" → confirm you're back at the empty state and the finished workout doesn't reappear as active on page reload.
Expected: no console errors; workout starts/finishes correctly; state persists across a page reload (confirms Dexie writes are working).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Stepper and Home/Workout screen with set logging"
```

---

### Task 10: Exercise picker screen

**Files:**
- Modify: `src/screens/ExercisePicker.tsx` (replaces the Task 9 stub)

**Interfaces:**
- Consumes: `db` (Task 2); `getAllExercises`, `getRecentExercises`, `searchExercises`, `groupExercisesByMuscleGroup` (Task 5); `useLang` (Task 7).
- Produces: same `ExercisePicker` signature as the Task 9 stub - drop-in replacement, `HomeScreen.tsx` needs no changes.

No automated tests (spec §11). Steps end in browser checks.

- [ ] **Step 1: Implement the real picker**

```tsx
// src/screens/ExercisePicker.tsx
import { useEffect, useState } from 'react'
import { db } from '../db/schema'
import type { Exercise } from '../db/schema'
import { getAllExercises, getRecentExercises, searchExercises, groupExercisesByMuscleGroup } from '../data-layer/exercises'
import { useLang } from '../i18n/LangContext'

export function ExercisePicker({ onPick, onClose }: { onPick: (e: Exercise) => void; onClose: () => void }) {
  const { t, lang } = useLang()
  const [recent, setRecent] = useState<Exercise[]>([])
  const [all, setAll] = useState<Exercise[]>([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Exercise[] | null>(null)

  useEffect(() => {
    ;(async () => {
      setRecent(await getRecentExercises(db, 10))
      setAll(await getAllExercises(db))
    })()
  }, [])

  useEffect(() => {
    if (!query.trim()) {
      setResults(null)
      return
    }
    searchExercises(db, query).then(setResults)
  }, [query])

  const tree = groupExercisesByMuscleGroup(all)
  const name = (e: Exercise) => (lang === 'ru' ? e.name_ru : e.name_en)

  return (
    <div className="fixed inset-0 z-10 overflow-y-auto bg-[var(--color-bg)] p-4">
      <button onClick={onClose} className="mb-4 text-[var(--color-text-muted)]">
        ✕
      </button>

      {!query && recent.length > 0 && (
        <div className="mb-4">
          <h4 className="mb-2 text-sm text-[var(--color-text-muted)]">{t('recent')}</h4>
          <div className="flex flex-wrap gap-2">
            {recent.map((e) => (
              <button key={e.id} onClick={() => onPick(e)} className="rounded-full bg-[var(--color-surface)] px-3 py-2 text-sm">
                {name(e)}
              </button>
            ))}
          </div>
        </div>
      )}

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('search')}
        className="mb-4 w-full rounded-lg bg-[var(--color-surface)] p-3"
      />

      {results ? (
        <ul className="space-y-1">
          {results.map((e) => (
            <li key={e.id}>
              <button onClick={() => onPick(e)} className="w-full rounded-lg p-2 text-left hover:bg-[var(--color-surface)]">
                {name(e)} · {e.equipment}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        Object.entries(tree).map(([group, subGroups]) => (
          <div key={group} className="mb-3">
            <h4 className="mb-1 font-bold">{group}</h4>
            {Object.entries(subGroups).map(([sub, list]) => (
              <div key={sub} className="mb-2 pl-2">
                {sub !== '_none' && <h5 className="mb-1 text-sm text-[var(--color-text-muted)]">{sub}</h5>}
                <ul className="space-y-1">
                  {list.map((e) => (
                    <li key={e.id}>
                      <button onClick={() => onPick(e)} className="w-full rounded-lg p-2 text-left hover:bg-[var(--color-surface)]">
                        {name(e)} · {e.equipment}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  )
}
```

- [ ] **Step 2: Manual verification**

Run: `npm run dev`. Start a workout, open the picker: confirm the muscle-group tree renders all 8 groups from `data/exercises.json`, search for "жим" narrows results, and picking an exercise adds it to the workout screen with autofilled weight/reps once you've logged it once before (log a set, finish workout, start a new one, re-add the same exercise, confirm the stepper starts at your last values).
Expected: no console errors; recent list populates after at least one set is logged; search matches both RU and EN queries.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: implement exercise picker with recent list, search, and group tree"
```

---

### Task 11: Progress / Mastery screen

**Files:**
- Create: `src/data-layer/exerciseHistory.ts`
- Test: `src/data-layer/exerciseHistory.test.ts`
- Create: `src/components/LevelBar.tsx`
- Modify: `src/screens/ProgressScreen.tsx` (replaces the Task 8 stub)

**Interfaces:**
- Consumes: `AppDatabase`, `Exercise`, `ExerciseProgress`, `WorkoutSet` (Task 2); `volumeLevelInfo`, `strengthLevelInfo`, `LevelInfo` (Task 3); `useLang` (Task 7).
- Produces:
  - `async function getExercisesWithProgress(db: AppDatabase): Promise<Array<{ exercise: Exercise; progress: ExerciseProgress }>>`
  - `interface WeightPoint { date: string; weight: number }`
  - `async function getExerciseWeightHistory(db: AppDatabase, exerciseId: number): Promise<WeightPoint[]>` (sorted oldest → newest)
  - `function LevelBar({ label, info }: { label: string; info: LevelInfo }): JSX.Element`

- [ ] **Step 1: Write failing tests for the new data-layer functions**

```ts
// src/data-layer/exerciseHistory.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { AppDatabase } from '../db/schema'
import type { Exercise } from '../db/schema'
import { startWorkout, finishWorkout } from './workouts'
import { addSet } from './sets'
import { getExercisesWithProgress, getExerciseWeightHistory } from './exerciseHistory'

const bench: Exercise = { id: 1, slug: 'bench-1', name_ru: 'Жим лежа', name_en: 'Bench Press', muscle_group: 'ГРУДЬ', sub_group: null, equipment: 'штанга' }

describe('exerciseHistory data layer', () => {
  let db: AppDatabase

  beforeEach(async () => {
    db = new AppDatabase(`test-db-${Math.random()}`)
    await db.exercises.add(bench)
  })

  it('returns only exercises that have logged progress', async () => {
    expect(await getExercisesWithProgress(db)).toEqual([])
    const w = await startWorkout(db)
    await addSet(db, w.id!, bench.id, 60, 8)
    const result = await getExercisesWithProgress(db)
    expect(result).toHaveLength(1)
    expect(result[0].exercise.id).toBe(bench.id)
    expect(result[0].progress.totalSets).toBe(1)
  })

  it('returns weight history sorted oldest to newest, using workout start date', async () => {
    const w1 = await startWorkout(db)
    await addSet(db, w1.id!, bench.id, 50, 8)
    await finishWorkout(db, w1.id!)

    const w2 = await startWorkout(db)
    await addSet(db, w2.id!, bench.id, 55, 8)
    await finishWorkout(db, w2.id!)

    const history = await getExerciseWeightHistory(db, bench.id)
    expect(history.map((p) => p.weight)).toEqual([50, 55])
  })
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm test -- exerciseHistory`
Expected: FAIL - `src/data-layer/exerciseHistory.ts` does not exist.

- [ ] **Step 3: Implement `exerciseHistory.ts`**

```ts
// src/data-layer/exerciseHistory.ts
import type { AppDatabase, Exercise, ExerciseProgress } from '../db/schema'

export async function getExercisesWithProgress(
  db: AppDatabase,
): Promise<Array<{ exercise: Exercise; progress: ExerciseProgress }>> {
  const progress = await db.exerciseProgress.toArray()
  const exerciseIds = progress.map((p) => p.exerciseId)
  const exercises = await db.exercises.bulkGet(exerciseIds)
  return progress
    .map((p, i) => ({ exercise: exercises[i], progress: p }))
    .filter((x): x is { exercise: Exercise; progress: ExerciseProgress } => x.exercise !== undefined)
}

export interface WeightPoint {
  date: string
  weight: number
}

export async function getExerciseWeightHistory(db: AppDatabase, exerciseId: number): Promise<WeightPoint[]> {
  const sets = await db.sets.where({ exerciseId }).toArray()
  const workoutIds = [...new Set(sets.map((s) => s.workoutId))]
  const workouts = await db.workouts.bulkGet(workoutIds)
  const startedAtById = new Map(workouts.filter((w) => w !== undefined).map((w) => [w!.id!, w!.startedAt]))

  return sets
    .map((s) => ({ date: startedAtById.get(s.workoutId) ?? '', weight: s.weight }))
    .filter((p) => p.date !== '')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npm test -- exerciseHistory`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit the data layer**

```bash
git add -A
git commit -m "feat: add exercise progress listing and weight history queries"
```

- [ ] **Step 6: Implement the LevelBar component (no test - presentational)**

```tsx
// src/components/LevelBar.tsx
import type { LevelInfo } from '../data-layer/mastery'

export function LevelBar({ label, info }: { label: string; info: LevelInfo }) {
  const pct = Math.min(100, Math.round((info.currentInLevel / info.neededForNextLevel) * 100))
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-[var(--color-text-muted)]">
        <span>
          {label} · Lv.{info.level}
        </span>
        <span>
          {Math.round(info.currentInLevel)}/{info.neededForNextLevel}
        </span>
      </div>
      <div className="h-2 rounded-full bg-[var(--color-border)]">
        <div className="h-2 rounded-full bg-[var(--color-accent)] transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Implement the Progress screen (list + detail, with an inline SVG line chart)**

```tsx
// src/screens/ProgressScreen.tsx
import { useEffect, useState } from 'react'
import { db } from '../db/schema'
import type { Exercise, ExerciseProgress } from '../db/schema'
import { getExercisesWithProgress, getExerciseWeightHistory, type WeightPoint } from '../data-layer/exerciseHistory'
import { volumeLevelInfo, strengthLevelInfo } from '../data-layer/mastery'
import { useLang } from '../i18n/LangContext'
import { LevelBar } from '../components/LevelBar'

function MiniLineChart({ points }: { points: WeightPoint[] }) {
  if (points.length === 0) return null
  const weights = points.map((p) => p.weight)
  const min = Math.min(...weights)
  const max = Math.max(...weights)
  const range = max - min || 1
  const w = 300
  const h = 80
  const stepX = points.length > 1 ? w / (points.length - 1) : 0
  const coords = points.map((p, i) => `${i * stepX},${h - ((p.weight - min) / range) * h}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-20 w-full">
      <polyline points={coords} fill="none" stroke="var(--color-accent)" strokeWidth="2" />
    </svg>
  )
}

export function ProgressScreen() {
  const { t, lang } = useLang()
  const [list, setList] = useState<Array<{ exercise: Exercise; progress: ExerciseProgress }>>([])
  const [selected, setSelected] = useState<Exercise | null>(null)
  const [history, setHistory] = useState<WeightPoint[]>([])

  useEffect(() => {
    getExercisesWithProgress(db).then(setList)
  }, [])

  useEffect(() => {
    if (!selected) return
    getExerciseWeightHistory(db, selected.id).then(setHistory)
  }, [selected])

  const name = (e: Exercise) => (lang === 'ru' ? e.name_ru : e.name_en)

  if (selected) {
    const entry = list.find((x) => x.exercise.id === selected.id)!
    return (
      <div>
        <button onClick={() => setSelected(null)} className="mb-4 text-[var(--color-text-muted)]">
          ← {name(selected)}
        </button>
        <MiniLineChart points={history} />
        <div className="mt-4 space-y-3">
          <LevelBar label={t('volumeLevel')} info={volumeLevelInfo(entry.progress.totalSets)} />
          <LevelBar label={t('strengthLevel')} info={strengthLevelInfo(entry.progress.totalXp)} />
        </div>
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {list.map(({ exercise, progress }) => (
        <li key={exercise.id}>
          <button
            onClick={() => setSelected(exercise)}
            className="w-full rounded-[var(--radius-card)] bg-[var(--color-surface)] p-4 text-left"
          >
            <h3 className="mb-2 font-bold">{name(exercise)}</h3>
            <div className="space-y-2">
              <LevelBar label={t('volumeLevel')} info={volumeLevelInfo(progress.totalSets)} />
              <LevelBar label={t('strengthLevel')} info={strengthLevelInfo(progress.totalXp)} />
            </div>
          </button>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 8: Manual verification**

Run: `npm run dev`. Log a few sets across 2-3 exercises in one or more workouts, then open the Progress tab.
Expected: each logged exercise appears with two level bars; tapping one opens a detail view with a line chart of weight over time and the same two bars; no console errors.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: implement Progress/Mastery screen with level bars and weight chart"
```

---

### Task 12: History screen (list + calendar)

**Files:**
- Modify: `src/screens/HistoryScreen.tsx` (replaces the Task 8 stub)

**Interfaces:**
- Consumes: `db` (Task 2); `getWorkoutHistory`, `getWorkoutDetail` (Task 4); `useLang` (Task 7).
- Produces: no new exported functions consumed elsewhere - this screen is a leaf.

No automated tests (spec §11). Steps end in browser checks.

- [ ] **Step 1: Implement the History screen with list/calendar toggle**

```tsx
// src/screens/HistoryScreen.tsx
import { useEffect, useState } from 'react'
import { db } from '../db/schema'
import type { Workout, Exercise, WorkoutSet } from '../db/schema'
import { getWorkoutHistory, getWorkoutDetail } from '../data-layer/workouts'
import { useLang } from '../i18n/LangContext'

type ViewMode = 'list' | 'calendar'
type WorkoutDetail = { workout: Workout; entries: Array<{ exercise: Exercise; sets: WorkoutSet[] }> }

function dateKey(iso: string) {
  return iso.slice(0, 10) // YYYY-MM-DD
}

export function HistoryScreen() {
  const { t, lang } = useLang()
  const [mode, setMode] = useState<ViewMode>('list')
  const [history, setHistory] = useState<Workout[]>([])
  const [dayDetails, setDayDetails] = useState<WorkoutDetail[] | null>(null)

  useEffect(() => {
    getWorkoutHistory(db).then(setHistory)
  }, [])

  async function openDay(workoutIds: string[]) {
    if (workoutIds.length === 0) return
    setDayDetails(await Promise.all(workoutIds.map((id) => getWorkoutDetail(db, id))))
  }

  if (dayDetails) {
    return (
      <div>
        <button onClick={() => setDayDetails(null)} className="mb-4 text-[var(--color-text-muted)]">
          ← {new Date(dayDetails[0].workout.startedAt).toLocaleDateString()}
        </button>
        {dayDetails.map(({ workout, entries }) => (
          <div key={workout.id} className="mb-4">
            {entries.map(({ exercise, sets }) => (
              <div key={exercise.id} className="mb-3 rounded-[var(--radius-card)] bg-[var(--color-surface)] p-4">
                <h3 className="mb-2 font-bold">{lang === 'ru' ? exercise.name_ru : exercise.name_en}</h3>
                <ul className="space-y-1 text-sm text-[var(--color-text-muted)]">
                  {sets.map((s) => (
                    <li key={s.id}>
                      {s.weight}кг × {s.reps}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex gap-4">
        <button
          onClick={() => setMode('list')}
          className={mode === 'list' ? 'font-bold text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'}
        >
          {t('historyList')}
        </button>
        <button
          onClick={() => setMode('calendar')}
          className={mode === 'calendar' ? 'font-bold text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'}
        >
          {t('historyCalendar')}
        </button>
      </div>

      {mode === 'list' ? (
        <ul className="space-y-2">
          {history.map((w) => (
            <li key={w.id}>
              <button
                onClick={() => openDay([w.id!])}
                className="w-full rounded-[var(--radius-card)] bg-[var(--color-surface)] p-3 text-left"
              >
                {new Date(w.startedAt).toLocaleDateString()}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <CalendarView history={history} onSelectDay={openDay} />
      )}
    </div>
  )
}

function CalendarView({ history, onSelectDay }: { history: Workout[]; onSelectDay: (workoutIds: string[]) => void }) {
  const [monthOffset, setMonthOffset] = useState(0)

  const byDate = new Map<string, string[]>()
  for (const w of history) {
    const key = dateKey(w.startedAt)
    byDate.set(key, [...(byDate.get(key) ?? []), w.id!])
  }

  const base = new Date()
  base.setDate(1)
  base.setMonth(base.getMonth() + monthOffset)
  const year = base.getFullYear()
  const month = base.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstWeekday = new Date(year, month, 1).getDay()
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button onClick={() => setMonthOffset((o) => o - 1)}>←</button>
        <span>{base.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
        <button onClick={() => setMonthOffset((o) => o + 1)}>→</button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />
          const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const workoutIds = byDate.get(key) ?? []
          const hasWorkout = workoutIds.length > 0
          return (
            <button
              key={i}
              onClick={() => onSelectDay(workoutIds)}
              className={`aspect-square rounded-lg text-sm ${
                hasWorkout ? 'bg-[var(--color-accent)] font-bold text-black' : 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'
              }`}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Manual verification**

Run: `npm run dev`. Finish a couple of workouts on different days (or manually adjust system clock / log via console for testing multiple dates), open History.
Expected: list view shows finished workouts newest-first; calendar view highlights days with a workout, month navigation (←/→) works, tapping a highlighted day opens that day's exercises/sets; tapping an empty day does nothing (no crash).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: implement History screen with list and calendar views"
```

---

### Task 13: Settings screen - language, export, import, backup reminder

**Files:**
- Create: `src/data-layer/backupReminder.ts`
- Test: `src/data-layer/backupReminder.test.ts`
- Modify: `src/screens/SettingsScreen.tsx` (replaces the Task 8 stub)

**Interfaces:**
- Consumes: `db` (Task 2); `exportData`, `importData`, `serializeBackup`, `parseBackup` (Task 6); `getWorkoutHistory` (Task 4); `useLang` (Task 7).
- Produces:
  - `function shouldShowBackupReminder(lastExportAt: string | null, workoutCount: number, now?: Date): boolean`
  - Reads/writes `localStorage` key `"lastExportAt"`.

- [ ] **Step 1: Write the failing test for the reminder rule**

```ts
// src/data-layer/backupReminder.test.ts
import { describe, it, expect } from 'vitest'
import { shouldShowBackupReminder } from './backupReminder'

describe('shouldShowBackupReminder', () => {
  it('does not remind a brand new user with few workouts and no export yet', () => {
    expect(shouldShowBackupReminder(null, 2)).toBe(false)
  })

  it('reminds a user who never exported once they have enough workouts', () => {
    expect(shouldShowBackupReminder(null, 5)).toBe(true)
  })

  it('does not remind shortly after a recent export', () => {
    const now = new Date('2026-09-04T12:00:00Z')
    const fiveDaysAgo = new Date('2026-08-30T12:00:00Z').toISOString()
    expect(shouldShowBackupReminder(fiveDaysAgo, 50, now)).toBe(false)
  })

  it('reminds once 14+ days have passed since the last export', () => {
    const now = new Date('2026-09-04T12:00:00Z')
    const fifteenDaysAgo = new Date('2026-08-20T12:00:00Z').toISOString()
    expect(shouldShowBackupReminder(fifteenDaysAgo, 50, now)).toBe(true)
  })
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm test -- backupReminder`
Expected: FAIL - `src/data-layer/backupReminder.ts` does not exist.

- [ ] **Step 3: Implement the reminder rule**

```ts
// src/data-layer/backupReminder.ts
const REMINDER_AFTER_DAYS = 14
const REMINDER_AFTER_WORKOUTS_IF_NEVER_EXPORTED = 5

export function shouldShowBackupReminder(lastExportAt: string | null, workoutCount: number, now: Date = new Date()): boolean {
  if (lastExportAt === null) return workoutCount >= REMINDER_AFTER_WORKOUTS_IF_NEVER_EXPORTED
  const daysSince = (now.getTime() - new Date(lastExportAt).getTime()) / (1000 * 60 * 60 * 24)
  return daysSince >= REMINDER_AFTER_DAYS
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npm test -- backupReminder`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit the data layer**

```bash
git add -A
git commit -m "feat: add backup reminder rule"
```

- [ ] **Step 6: Implement the Settings screen**

```tsx
// src/screens/SettingsScreen.tsx
import { useEffect, useRef, useState } from 'react'
import { db } from '../db/schema'
import { exportData, importData, serializeBackup, parseBackup } from '../data-layer/backup'
import { getWorkoutHistory } from '../data-layer/workouts'
import { shouldShowBackupReminder } from '../data-layer/backupReminder'
import { useLang } from '../i18n/LangContext'

export function SettingsScreen() {
  const { t, lang, setLang } = useLang()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showReminder, setShowReminder] = useState(false)

  useEffect(() => {
    ;(async () => {
      const lastExportAt = localStorage.getItem('lastExportAt')
      const workoutCount = (await getWorkoutHistory(db)).length
      setShowReminder(shouldShowBackupReminder(lastExportAt, workoutCount))
    })()
  }, [])

  async function handleExport() {
    const data = await exportData(db)
    const json = serializeBackup(data)
    const filename = `workout-backup-${new Date().toISOString().slice(0, 10)}.json`
    const blob = new Blob([json], { type: 'application/json' })

    const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean }
    const file = new File([blob], filename, { type: 'application/json' })
    if (nav.share && nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file] })
    } else {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    }

    localStorage.setItem('lastExportAt', new Date().toISOString())
    setShowReminder(false)
  }

  function handleImportClick() {
    fileInputRef.current?.click()
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!confirm(t('importConfirm'))) return
    try {
      const text = await file.text()
      const data = parseBackup(text)
      await importData(db, data)
      location.reload()
    } catch {
      alert('Import failed: invalid backup file')
    }
  }

  return (
    <div className="space-y-6">
      {showReminder && (
        <div className="rounded-[var(--radius-card)] bg-[var(--color-surface)] p-3 text-sm text-[var(--color-text-muted)]">
          {t('settingsExport')}?
        </div>
      )}

      <div>
        <h4 className="mb-2 text-sm text-[var(--color-text-muted)]">{t('settingsLanguage')}</h4>
        <div className="flex gap-2">
          <button onClick={() => setLang('ru')} className={lang === 'ru' ? 'font-bold text-[var(--color-accent)]' : ''}>
            RU
          </button>
          <button onClick={() => setLang('en')} className={lang === 'en' ? 'font-bold text-[var(--color-accent)]' : ''}>
            EN
          </button>
        </div>
      </div>

      <button onClick={handleExport} className="w-full rounded-[var(--radius-card)] bg-[var(--color-surface)] p-3 text-left">
        {t('settingsExport')}
      </button>

      <button onClick={handleImportClick} className="w-full rounded-[var(--radius-card)] bg-[var(--color-surface)] p-3 text-left">
        {t('settingsImport')}
      </button>
      <input ref={fileInputRef} type="file" accept="application/json" onChange={handleFileSelected} className="hidden" />
    </div>
  )
}
```

Note: `confirm`/`alert` are used here as the simplest possible functional implementation for the MVP's confirmation and error dialogs (spec §8 requires an explicit confirming dialog before import-replace, and §11 requires a readable error on a corrupt file - both satisfied). Swapping these for custom-styled modals is a pure polish pass that can happen later without touching the data flow.

- [ ] **Step 7: Manual verification**

Run: `npm run dev`. Log a few sets, go to Settings, click "Экспорт данных" - confirm a `.json` file downloads (or the share sheet opens on mobile) and contains your workouts. Click "Импорт данных", select that same file, confirm the dialog, verify the app reloads with the same data. Try importing a non-JSON file and confirm you get the "Import failed" alert instead of a crash. Switch language RU/EN and confirm all screens' text updates.
Expected: no console errors; export/import round-trips correctly; language switch is instant and persists across a page reload.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: implement Settings screen with export/import and backup reminder"
```

---

### Task 14: PWA setup

**Files:**
- Modify: `vite.config.ts`
- Create: `public/icon-192.png`, `public/icon-512.png` (placeholder app icons - see Step 1)
- Modify: `src/App.tsx` (install prompt + update banner)

**Interfaces:**
- Produces: an installable, offline-capable app shell via `vite-plugin-pwa`; a captured `beforeinstallprompt` event exposed through a small hook `useInstallPrompt()`.

No automated tests (spec §11 - PWA behavior is verified manually, it can't be meaningfully unit tested). Steps end in browser/build checks.

- [ ] **Step 1: Add placeholder app icons**

Generate two solid-color PNG placeholders (192×192 and 512×512, using the accent color `#7cff6b` on the dark background `#0b0b0f`) and save them to `public/icon-192.png` and `public/icon-512.png`. These are functional placeholders - replace with real artwork whenever a designed icon is available; nothing else in the app depends on their appearance.

- [ ] **Step 2: Configure `vite-plugin-pwa`**

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      manifest: {
        name: 'Workout Tracker',
        short_name: 'Workout',
        description: 'Local-first gym workout tracker',
        display: 'standalone',
        background_color: '#0b0b0f',
        theme_color: '#0b0b0f',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,json}'],
      },
    }),
  ],
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
})
```

- [ ] **Step 3: Build and verify the service worker is generated**

Run: `npm run build`
Expected: build succeeds; `dist/sw.js` and `dist/manifest.webmanifest` exist.

Run: `npm run preview`, open the printed local URL in a Chromium-based browser, open DevTools → Application → Service Workers.
Expected: a service worker is registered and activated; Application → Manifest shows the configured name/icons; reloading with DevTools' "Offline" network throttling enabled still loads the app shell.

- [ ] **Step 4: Add a deferred, custom install prompt**

```tsx
// add to src/App.tsx, above the App component
import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
}

function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    function handler(e: Event) {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  return {
    canInstall: deferred !== null,
    promptInstall: async () => {
      await deferred?.prompt()
      setDeferred(null)
    },
  }
}
```

Wire an "Install app" button using `useInstallPrompt()` into `SettingsScreen.tsx` (only rendered when `canInstall` is true) - this satisfies spec §9's requirement to offer install from Settings rather than an intrusive prompt on first visit:

```tsx
// add near the top of SettingsScreen's returned JSX, Task 13's component
{canInstall && (
  <button onClick={promptInstall} className="w-full rounded-[var(--radius-card)] bg-[var(--color-accent)] p-3 font-bold text-black">
    Install app
  </button>
)}
```

(Import and call `useInstallPrompt()` at the top of `SettingsScreen`, destructuring `canInstall`/`promptInstall`.)

- [ ] **Step 5: Add an update-available banner**

```tsx
// add to src/App.tsx
import { useRegisterSW } from 'virtual:pwa-register/react'

function UpdateBanner() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW()
  if (!needRefresh) return null
  return (
    <div className="fixed top-0 left-0 right-0 z-20 bg-[var(--color-accent)] p-2 text-center text-sm font-bold text-black">
      <button onClick={() => updateServiceWorker(true)}>Доступно обновление - нажмите, чтобы обновить</button>
    </div>
  )
}
```

Render `<UpdateBanner />` inside `App`'s returned JSX, above `<NavBar />`.

- [ ] **Step 6: Manual verification**

Run: `npm run build && npm run preview`. Confirm the app installs from the browser's install affordance and/or the custom "Install app" button in Settings works and results in an installed app icon; confirm reloading offline (DevTools Network → Offline) still renders the full app.
Expected: no console errors; app is installable; app shell loads fully offline.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add PWA support with custom install prompt and update banner"
```

---

### Task 15: Level-up animation

**Files:**
- Modify: `src/components/LevelBar.tsx`

**Interfaces:**
- Consumes: `motion`/`AnimatePresence` from the `motion` package (installed in Task 1); `LevelInfo` (Task 3).
- Produces: same `LevelBar` props as before - drop-in replacement, no callers change.

No automated tests (spec §11 - animation is inherently a manual/visual check).

- [ ] **Step 1: Add a spring-animated fill and a level-up badge**

```tsx
// src/components/LevelBar.tsx
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { LevelInfo } from '../data-layer/mastery'

export function LevelBar({ label, info }: { label: string; info: LevelInfo }) {
  const pct = Math.min(100, Math.round((info.currentInLevel / info.neededForNextLevel) * 100))
  const prevLevel = useRef(info.level)
  const [leveledUp, setLeveledUp] = useState(false)

  useEffect(() => {
    if (info.level > prevLevel.current) {
      setLeveledUp(true)
      const id = setTimeout(() => setLeveledUp(false), 1200)
      prevLevel.current = info.level
      return () => clearTimeout(id)
    }
    prevLevel.current = info.level
  }, [info.level])

  return (
    <div className="relative">
      <div className="mb-1 flex justify-between text-xs text-[var(--color-text-muted)]">
        <span>
          {label} · Lv.{info.level}
        </span>
        <span>
          {Math.round(info.currentInLevel)}/{info.neededForNextLevel}
        </span>
      </div>
      <div className="h-2 rounded-full bg-[var(--color-border)]">
        <motion.div
          className="h-2 rounded-full bg-[var(--color-accent)]"
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </div>
      <AnimatePresence>
        {leveledUp && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute -top-6 right-0 rounded-full bg-[var(--color-accent)] px-2 py-0.5 text-xs font-bold text-black"
          >
            Level up!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
```

- [ ] **Step 2: Manual verification**

Run: `npm run dev`, open Progress screen for an exercise close to a level boundary (or temporarily lower `VOLUME_LEVEL_1_THRESHOLD`/`STRENGTH_LEVEL_1_THRESHOLD` in `mastery.ts` to 2 for a quick manual check, then revert), log a set that crosses the threshold, and re-open/re-render the Progress screen.
Expected: the bar fill animates smoothly (spring easing, not an instant jump) and the "Level up!" badge appears briefly then fades out when a level boundary is crossed; no animation/badge when progress increases without crossing a level.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: animate mastery level-up with Motion"
```

---
