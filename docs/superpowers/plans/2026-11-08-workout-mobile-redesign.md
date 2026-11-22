# Mobile workout and exercise picker redesign

## Goal

Implement the two approved mobile concepts: a compact active workout screen focused on set entry, and an exercise picker that shows four recently completed exercises before the full catalog.

## Scope

- Keep set number on the left, editable values in the middle, and completion check on the right.
- Keep finish and delete workout actions visible above bottom navigation.
- Keep existing desktop behavior, workout persistence, set validation, replacement flow, and detail sheet.
- Search exercise names and aliases only. Muscle and equipment are separate filters.
- Show the full catalog only after a user opens it or uses search or filters.
- Use existing exercise artwork and localized copy. Do not use mockup screenshots as rendered UI.

## Tasks

1. Update picker tests for four recent items, name-only search, combined filters, catalog reveal, replacement, and detail access.
2. Implement picker state and compact rows, then verify picker tests.
3. Update workout component tests for set row, navigation, summary, and visible actions.
4. Implement mobile workout structure and CSS, retaining desktop layout.
5. Run tests, lint, build, and the repository em dash check. Start Vite on localhost and verify HTTP response.

## Risks to check

- Empty history still offers search and catalog access.
- Long exercise names and narrow screens keep controls reachable.
- Cardio sets, multiple sets, and multiple exercises can scroll while workout actions stay visible.
- Localized English labels and light theme remain readable.
