# Exercise artwork

> 2026-11-08: all illustrations are stored as WebP 640x640 (converted from the generated 1254x1254 PNG to shrink the offline cache). New artwork: export WebP 640x640 into `public/exercises/` and register the file in `src/components/mastery/exerciseArtwork.ts`.

Two original illustrations generated with the built-in image_gen tool on 2026-09-24, using the imagegen skill. No GymVisual assets were used; free-use terms could not be verified.

Project assets:

- `public/exercises/barbell-bench-press.webp`
- `public/exercises/treadmill.webp`

Exact catalog slug mapping lives in `src/components/mastery/exerciseArtwork.ts`. Other exercises retain AnatomyMap. Image loading errors also fall back to AnatomyMap. The images are separate from the medallion frame for later mascot replacement.

## Final prompts

### Bench press

Use case: stylized-concept. Asset type: transparent cutout exercise illustration for a small fitness app badge. Create one original polished 3D anatomical-style silver gray adult male athlete wearing dark shorts doing a BARBELL FLAT BENCH PRESS on a compact dark workout bench. Entire athlete, bench and barbell visible, clear three-quarter side view, both feet planted, back resting on horizontal bench, hands gripping straight bar symmetrically above chest, bent elbows in mid press. Subtle orange red highlighting on pectoral muscles and triceps, rest grayscale. Strong readable silhouette at 120px, clean sculpted shading and crisp edges, equipment recognizable, centered composition occupying 88 percent of square. Transparent background with real alpha, no floor, no scene, no hexagon or badge frame, no UI, no text, no watermark, no glow, no extra limbs. This is a standalone illustration, not a screen mockup.

### Treadmill

Use case: stylized-concept. Asset type: transparent cutout exercise illustration for a small fitness app badge. One original polished 3D anatomical-style silver gray adult male athlete wearing dark shorts and running shoes RUNNING ON A TREADMILL. Full athlete and entire compact dark gray treadmill visible, three-quarter side view, upright torso slight forward lean, arms bent naturally in running motion, one foot on belt other leg bent behind, facing treadmill console. Subtle orange red highlighting on quadriceps and calves, rest grayscale. Strong readable silhouette at 120px, clean sculpted shading, crisp edges, clearly recognizable treadmill belt and front console, centered composition occupying 88 percent of square. Genuine transparent alpha background, no floor, no scene, no hexagon frame, no UI, no text, no watermark, no glow, no extra limbs. Standalone illustration, not screen mockup.
