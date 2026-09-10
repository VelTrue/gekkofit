# Workout Tracker Full Redesign

**Status:** Approved in conversation on 2026-09-11

## 1. Goal

Turn the current MVP into a polished mobile-first workout journal with fast set logging, editable workout records, a readable note-style summary, a complete anatomical exercise catalog, and collectible exercise mastery.

The redesign keeps the existing local-first architecture. Accounts and cloud synchronization remain optional future work and must not be required by the new interface.

## 2. Project-wide constraints

- Follow the repository `AGENTS.md` rule that forbids the Unicode em dash character U+2014.
- Preserve existing workout data during database and catalog migrations.
- Keep stable numeric exercise identifiers so old sets continue to reference the correct exercises.
- Keep the application installable and usable offline.
- Support Russian and English UI copy.
- Use accessible contrast and touch targets of at least 44 by 44 CSS pixels.
- Do not copy GymKeeper, Clash Royale, or any referenced product assets, layouts, frames, typography, branding, or illustrations.

## 3. Visual direction

The product uses a focused athletic editorial style derived from the approved mastery concept.

### Dark theme

- Deep graphite page background.
- Slightly lighter solid card surfaces.
- Cold metallic borders for structure.
- Restrained acid-lime accent for primary actions, progress, and selected state.
- Warm coral color for primary muscle highlights.
- Muted coral color for secondary muscle highlights.
- High-contrast near-white text with cool gray supporting text.

### Light theme

- Cold light-gray page background.
- White card surfaces.
- Dark graphite text.
- The same lime and coral semantic accents, adjusted to meet contrast requirements.
- Stronger neutral borders instead of shadows as the primary separation method.

### Interaction and motion

- Use one consistent SVG icon family. Do not use emoji as interface icons.
- Use 150 to 300 millisecond transitions for view switching, sheets, selected states, and set completion.
- Respect `prefers-reduced-motion`.
- Never depend on hover for essential information or actions.
- Preserve layout space while images and anatomical maps load.

The selected theme and workout presentation mode are stored locally. Theme choices are `system`, `dark`, and `light`.

## 4. Navigation

The bottom navigation continues to expose four primary areas:

1. Workout
2. Mastery
3. History
4. Settings

Every nested view has a visible back button. Browser back navigation and the visible control must produce the same result. Modal sheets close before navigation leaves their parent screen. Focus returns to the control that opened a closed modal.

## 5. Workout lifecycle and editing

Starting a workout creates a default localized title based on its date, for example `Тренировка 10 сентября`. The title can be changed during an active workout and after completion.

Both active and completed workouts support:

- renaming the workout;
- adding and removing exercises;
- adding, editing, completing, and deleting sets;
- changing weight and repetitions;
- changing exercise order;
- discarding an accidentally started workout after confirmation.

Edits update timestamps and immediately recalculate derived workout summaries and mastery statistics. A completed workout remains completed after editing.

## 6. Workout presentation modes

A segmented control switches between `Карточки` and `Список`. The transition is animated and the selected mode is remembered locally.

### Card mode

Each exercise card contains:

- anatomical muscle visualization;
- natural exercise name;
- equipment and primary muscle;
- previous session result;
- compact set rows;
- add-set action;
- previous and next exercise controls where relevant.

A set row contains its ordinal number, editable weight, editable repetitions, and a completion control. Completing a set provides immediate visual feedback and starts the rest timer without blocking further input.

The design may use the supplied workout screenshot as a behavioral reference for compact rows and exercise navigation. It must not reproduce that screen's styling or composition.

### List mode

The same workout is rendered as a compact note:

```text
Жим гантелей под наклоном
14 кг × 12   14 кг × 10   16 кг × 7

Жим лежа
50 кг × 8   45 кг × 12
```

The list remains interactive. Selecting an exercise or set opens its editing controls. The representation is derived from the same workout and set records, not stored as separate text.

## 7. Exercise catalog

The catalog contains 337 exercises at the time of this design. Every record keeps its current numeric `id` and gains structured metadata required for display and search.

### Naming rules

Russian names are rewritten into natural phrases:

- start with the movement;
- include the equipment where it distinguishes the exercise;
- add body position or angle as a natural modifier;
- avoid parenthesized fragments and equipment suffixes where a normal phrase works;
- avoid duplicate visible names for different catalog entries.

Example: `Жим лежа (Наклон) - гантели` becomes `Жим гантелей под наклоном`.

Old labels become search aliases. Search matches the current Russian name, previous Russian aliases, English name, muscle group, subgroup, and equipment.

### Catalog organization

The picker shows:

1. Search
2. Recent exercises
3. Frequently used exercises
4. Muscle groups
5. The full filtered result set

Each result displays an anatomical thumbnail, exercise name, equipment, and primary muscle. An information action opens the full muscle map, exercise metadata, and the latest logged result.

## 8. Anatomical visualization

All 337 exercises receive structured mappings for primary and secondary muscles. The interface renders those mappings on an original shared anatomical figure with front and back views.

- Primary muscles use the stronger coral highlight.
- Secondary muscles use a quieter coral highlight.
- Unused muscles remain neutral.
- Each muscle area has a stable machine-readable identifier.
- Exercise metadata determines which body view is shown first.
- The same renderer is used by the picker, exercise details, workout cards, history details, and mastery badges.

This approach creates complete coverage without downloading or copying third-party exercise art. The anatomical artwork must be original project-owned SVG or another locally bundled asset with clear rights.

## 9. History

History supports list and calendar modes.

Each list card shows:

- workout title;
- localized date and duration;
- actual exercise names;
- set count and total repetitions for each exercise;
- total workout volume;
- personal records earned in the workout, if any.

Example:

```text
Тренировка груди
10 сентября, 48 минут

Жим гантелей под наклоном
3 подхода, 29 повторений

Жим лежа
2 подхода, 20 повторений
```

Opening a history record shows the full editable workout in the remembered card or list mode. Calendar selection opens the same detail view. The interface never substitutes a fixed exercise name for real stored data.

## 10. Mastery

Mastery replaces the current separate strength and volume level bars.

### Score calculation

For a single exercise:

- each completed working set grants 1 point;
- the first completed set for that exercise in a distinct workout grants 2 additional points;
- a new best weight or estimated one-repetition maximum grants 3 additional points;
- deleted or incomplete sets grant no points.

Mastery is derived from actual workout records. Editing or deleting data triggers a deterministic recalculation so displayed progress cannot drift from history.

### Levels

1. `Новичок`: first completed performance
2. `Практик`: 15 points
3. `Атлет`: 50 points
4. `Эксперт`: 120 points
5. `Мастер`: 250 points

Each tier has a distinct original frame treatment: graphite, steel, bronze detail, luminous silver, and restrained premium lime.

### Mastery grid

The page header shows only the unlocked count, for example `8 упражнений открыто`. It does not display `X из Y` or the total catalog size.

The default grid contains only exercises with completed work. A search control and `Все упражнения` filter expose unused exercises. The responsive grid uses three columns on common phone widths and increases column count on wider layouts.

Each badge shows the anatomical visualization, short exercise name, and level number. Selecting a badge opens an accessible modal sheet.

### Badge detail sheet

The sheet contains:

- exercise name and large badge;
- current tier and progress to the next tier;
- best weight;
- estimated one-repetition maximum;
- total volume;
- workout, set, and repetition counts;
- last performed date;
- concise personal-record history;
- exact next-level condition;
- action to open the exercise.

## 11. Data model changes

The next Dexie schema version adds fields without changing existing identifiers.

### Exercise

- `aliases_ru: string[]`
- `primary_muscles: string[]`
- `secondary_muscles: string[]`
- `preferred_body_view: 'front' | 'back' | 'both'`

### Workout

- `title: string`

### WorkoutSet

- `completed: boolean`

Exercise ordering in a workout requires a separate ordered workout-exercise record because an exercise may be added before it has any sets. The record contains `id`, `workoutId`, `exerciseId`, `order`, `createdAt`, and `updatedAt`.

Cached mastery rows may exist for fast rendering, but the rebuild operation derives them from workouts and completed sets. Import validation and backup export include every new field and table.

## 12. Error handling and data safety

- Destructive actions require confirmation and name the affected object.
- Invalid weight and repetition values show inline errors and are not persisted.
- Catalog migration is idempotent and updates seeded exercise metadata for existing installations.
- Import validates references between workouts, workout exercises, sets, and exercise identifiers.
- Failed writes preserve the visible draft and show a retry action.
- Empty, loading, and error states exist for catalog, workout, history, and mastery screens.

## 13. Accessibility

- All controls are keyboard accessible.
- Icon-only controls have localized accessible names.
- Modal sheets trap focus, close with Escape, and restore focus.
- Color is never the only indicator of tier, set completion, or muscle priority.
- Anatomical maps include concise alternative text naming the highlighted muscles.
- Charts and mastery progress expose text equivalents.
- Both themes maintain readable focus indicators.

## 14. Verification

Automated tests cover:

- catalog migration and stable identifiers;
- natural-name aliases and search;
- workout title creation and editing;
- completed workout editing;
- workout-exercise ordering;
- set editing and deletion;
- card and list summaries;
- real exercise summaries in history;
- deterministic mastery recalculation and all level thresholds;
- theme persistence and system-theme behavior;
- backup and import of the new schema.

Before delivery run unit tests, lint, production build, the U+2014 repository scan from `AGENTS.md`, and focused responsive UI checks in both themes.

## 15. Out of scope

- User accounts and Yandex Cloud integration
- Social features
- Live coaching
- Copied or downloaded GymKeeper exercise assets
- Unique animated technique demonstrations for all 337 exercises

