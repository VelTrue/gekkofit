# Quality of Life Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the complete quality-of-life update for workout entry, alternatives, cardio, mastery, and local administration.

**Architecture:** Add focused presentation helpers for alternatives and set metrics, extend IndexedDB records with optional cardio fields, and keep screen state local to the owning flow. Reuse existing dialogs, exercise visuals, localization, and data-layer transaction patterns.

**Tech Stack:** React 19, TypeScript, Dexie, Vitest, Testing Library, Tailwind CSS and project CSS.

**Spec:** `docs/superpowers/specs/2026-09-28-qol-update-design.md`

## Global Constraints

- Preserve offline data through a Dexie migration.
- Support Russian and English UI.
- Touch targets are at least 44 by 44 CSS pixels and interactions cannot rely only on hover.
- Never use the Unicode em dash character.

## Review Focus

- An exercise with fewer than two safe alternatives still renders without breaking the picker.
- Adding an already-added exercise selects the existing card.
- Legacy strength sets remain valid after the cardio schema migration.
- Bulk mastery reset preserves workout and set history.
- Motion is removed when `prefers-reduced-motion` is enabled.

---

### Task 1: Curated exercise alternatives

**Files:** Create `src/data-layer/exerciseAlternatives.ts`; modify `src/components/exercises/ExerciseListItem.tsx`, `src/screens/ExercisePicker.tsx`, styles and tests.

**Interfaces:** Produces `getExerciseAlternatives(exercise, catalog, limit): Exercise[]` and an accessible picker popover.

- [ ] Write failing tests for same-muscle, different-equipment alternatives and pointer/keyboard disclosure.
- [ ] Run focused tests and confirm the missing behavior fails.
- [ ] Implement the helper and UI.
- [ ] Run focused tests and the full suite.

### Task 2: Workout flow controls

**Files:** Modify `src/screens/HomeScreen.tsx`, `src/components/workout/WorkoutViews.tsx`, `src/components/workout/ExerciseCard.tsx`, styles and tests.

**Interfaces:** `WorkoutViews` consumes `selectedExerciseId` and exposes the added-exercise dialog.

- [ ] Write failing tests for recent dialog, visible actions, added list, and selecting a newly added card.
- [ ] Run focused tests and confirm failure.
- [ ] Implement the behavior.
- [ ] Run focused tests and the full suite.

### Task 3: Cardio metrics

**Files:** Modify `src/db/schema.ts`, set data helpers, `SetRow.tsx`, summaries, history/mastery consumers and tests.

**Interfaces:** Cardio sets use optional `distance`, `incline`, `duration`, and `intensity`; strength sets retain `weight` and `reps`.

- [ ] Write failing migration, validation, and editor tests.
- [ ] Run tests and confirm failure.
- [ ] Add schema migration and cardio UI while retaining legacy defaults.
- [ ] Run focused tests and the full suite.

### Task 4: Mastery visuals and filters

**Files:** Modify `ProgressScreen.tsx`, mastery components, theme tokens, styles and tests.

**Interfaces:** Level filter maps displayed levels above five to visual tier five.

- [ ] Write failing tests for level filtering and visual tier semantics.
- [ ] Run tests and confirm failure.
- [ ] Implement filters, contrast, obsidian level five, and transitions.
- [ ] Run focused tests and the full suite.

### Task 5: Administrative resets, navigation, and artwork

**Files:** Modify `admin.ts`, `LocalAdminPanel.tsx`, `NavBar.tsx`, artwork mapping/assets and tests.

**Interfaces:** Produces `clearMasteryForExercises(database, ids)` and `clearAllMastery(database)` without deleting workout data.

- [ ] Write failing tests for partial and full reset plus navigation semantics.
- [ ] Run tests and confirm failure.
- [ ] Implement reset controls, gear icon, and artwork correction.
- [ ] Run focused tests and the full suite.

### Task 6: Verification

**Files:** All touched files.

- [ ] Run `npm test`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Run `rg '\x{2014}'` and remove every project-owned match.
- [ ] Visually verify mobile and desktop layouts in both themes.
