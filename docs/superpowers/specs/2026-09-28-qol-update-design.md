# Quality of Life Update Design

## Goal

Improve the workout, mastery, and local administration flows while preserving existing offline data and bilingual behavior.

## Workout flow

- Recent workouts open in a dedicated dialog below the primary start action.
- Active workout actions use direct, visible controls instead of a disclosure menu.
- Card view includes an "Added" control that opens the ordered exercise list. Adding an exercise selects its card immediately.
- Exercise picker rows expose a question-mark control. Hover, focus, or tap reveals two or three curated alternatives that train the same primary area, preferably with different equipment. Alternatives are advisory and can be selected directly.
- The substitution principle follows ACSM guidance that multiple resistance modalities can be effective and ACE examples of swapping exercises that target the same area.

## Cardio sets

Exercises in the CARDIO catalog group use distance, incline, duration, and intensity. Strength exercises retain weight and repetitions. Existing records remain readable through optional versioned fields.

## Mastery

- Users can filter by visual level 0 through 5 in addition to unlocked and all.
- Levels use clearly distinct surface, rim, and text treatment in both themes. Level 5 is obsidian with a restrained moving highlight.
- Illustration and anatomy transitions fade and slide, with reduced-motion support.

## Local administration

The local admin can clear an individual exercise adjustment, set selected exercises to zero mastery, or reset all mastery adjustments. Destructive bulk actions require confirmation and do not delete workout history.

## Navigation and artwork

Settings uses a conventional gear icon. The dumbbell bench press uses its dedicated corrected artwork asset.

## Quality constraints

- Touch targets are at least 44 by 44 CSS pixels.
- No interaction relies only on hover.
- New behavior is covered by tests before implementation.
- No Unicode em dash may exist in project-owned files.
