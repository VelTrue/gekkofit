# Exercise illustration rollout

## Status

- Catalog: 337 exercises.
- Integrated: 9 illustrations (exercise ids 1-8 and 321).
- Remaining: 328 exercises, beginning with id 9, Pec Deck Fly.
- Built-in image generator reached its usage limit while generating id 9. No replacement photo was used.
- All exercise image surfaces use ExerciseVisual: picker, detail sheet, workout cards, workout list, history detail and mastery.
- Horizontal swipe or the button with two dots switches artwork and the original muscle map. Vertical gestures do not change the image. Picker artwork is separate from the add button.
- Exercises awaiting artwork retain their muscle map without an empty slide. Failed image requests also fall back to the muscle map.
- Review this batch before expanding the catalog. Mascot work is out of scope.

## Assets and final generation prompts

Mode: built-in image_gen, using the imagegen skill. Each asset is stored under public/exercises/ and included in the PWA cache.

### dumbbell-bench-press.png

Path: `public/exercises/dumbbell-bench-press.png`

Use case: stylized-concept. Standalone transparent PNG exercise artwork for a fitness app, not a screen mockup. Original polished 3D anatomical-style silver-gray adult male athlete in dark shorts and shoes, sculpted realistic shading, orange-red pectorals and subtle triceps highlights, rest neutral grayscale. Entire athlete and necessary equipment visible, centered three-quarter view with strong readable silhouette at 120px. Occupy 88% of square. Real transparent alpha background, no floor/scene, no text, logos, UI, badge frames, no extra limbs. Correct equipment and coherent pose. Flat dumbbell bench press. Athlete lies supine on a horizontal padded bench, feet planted, holds TWO separate dumbbells above chest, elbows bent about 90 degrees, forearms vertical, palms toward feet. Head, torso and hips on bench. No barbell.

### cable-bench-press.png

Path: `public/exercises/cable-bench-press.png`

Use case: stylized-concept. Standalone transparent PNG exercise artwork for a fitness app, not a screen mockup. Original polished 3D anatomical-style silver-gray adult male athlete in dark shorts and shoes, sculpted realistic shading, orange-red pectorals and subtle triceps highlights, rest neutral grayscale. Entire athlete and necessary equipment visible, centered three-quarter view with strong readable silhouette at 120px. Occupy 88% of square. Real transparent alpha background, no floor/scene, no text, logos, UI, badge frames, no extra limbs. Correct equipment and coherent pose. Flat cable bench press. Athlete lies supine on a horizontal bench between two compact cable towers, feet planted, presses two individual D-handles above chest with elbows bent. Each handle attaches to a taut cable running down/out to its respective low pulley near floor, one on each side. Show cables and low pulleys clearly. No dumbbells or barbell.

### smith-bench-press.png

Path: `public/exercises/smith-bench-press.png`

Use case: stylized-concept. Standalone transparent PNG exercise artwork for a fitness app, not a screen mockup. Original polished 3D anatomical-style silver-gray adult male athlete in dark shorts and shoes, sculpted realistic shading, orange-red pectorals and subtle triceps highlights, rest neutral grayscale. Entire athlete and necessary equipment visible, centered three-quarter view with strong readable silhouette at 120px. Occupy 88% of square. Real transparent alpha background, no floor/scene, no text, logos, UI, badge frames, no extra limbs. Correct equipment and coherent pose. Flat bench press in Smith machine. Athlete lies supine on horizontal bench, feet planted, grips a straight loaded bar over chest. Bar is mechanically attached at both ends to TWO vertical guide rails within compact dark Smith frame. Elbows bent, forearms near vertical. Show guide rails, bench and weights clearly. Not a free barbell.

### seated-machine-chest-press.png

Path: `public/exercises/seated-machine-chest-press.png`

Use case: stylized-concept. Standalone transparent PNG exercise artwork for a fitness app, not a screen mockup. Original polished 3D anatomical-style silver-gray adult male athlete in dark shorts and shoes, sculpted realistic shading, orange-red pectorals and subtle triceps highlights, rest neutral grayscale. Entire athlete and necessary equipment visible, centered three-quarter view with strong readable silhouette at 120px. Occupy 88% of square. Real transparent alpha background, no floor/scene, no text, logos, UI, badge frames, no extra limbs. Correct equipment and coherent pose. Seated machine chest press. Athlete seated upright against vertical back pad, feet planted, hands gripping machine handles at mid chest height, elbows bent. Compact dark chest press machine with hinged press arms and visible weight stack. Press forward horizontally, not overhead. Entire seated body and machine visible.

### standing-cable-chest-press.png

Path: `public/exercises/standing-cable-chest-press.png`

Use case: stylized-concept. Standalone transparent PNG exercise artwork for a fitness app, not a screen mockup. Original polished 3D anatomical-style silver-gray adult male athlete in dark shorts and shoes, sculpted realistic shading, orange-red pectorals and subtle triceps highlights, rest neutral grayscale. Entire athlete and necessary equipment visible, centered three-quarter view with strong readable silhouette at 120px. Occupy 88% of square. Real transparent alpha background, no floor/scene, no text, logos, UI, badge frames, no extra limbs. Correct equipment and coherent pose. Standing cable chest press. Athlete stands in staggered stance between two compact cable towers behind him, slight forward lean, holds two D-handles with palms down at chest height and pushes forwards. Elbows slightly bent, cables run backward from hands to respective chest-height pulleys. Not a fly, not overhead, no bench.

### dumbbell-fly.png

Path: `public/exercises/dumbbell-fly.png`

Use case: stylized-concept. Standalone transparent PNG exercise artwork for a fitness app, not a screen mockup. Original polished 3D anatomical-style silver-gray adult male athlete in dark shorts and shoes, sculpted realistic shading, orange-red pectorals and subtle triceps highlights, rest neutral grayscale. Entire athlete and necessary equipment visible, centered three-quarter view with strong readable silhouette at 120px. Occupy 88% of square. Real transparent alpha background, no floor/scene, no text, logos, UI, badge frames, no extra limbs. Correct equipment and coherent pose. Flat dumbbell fly. Athlete lies supine on a flat padded bench, feet planted, holding TWO dumbbells out to the sides in a wide arc at chest height. Elbows slightly bent with open arms, palms facing each other, unmistakably a fly, NOT a chest press. Entire athlete and bench visible, elevated three-quarter view.

### high-cable-fly.png

Path: `public/exercises/high-cable-fly.png`

Use case: stylized-concept. Standalone transparent PNG exercise artwork for a fitness app, not a screen mockup. Original polished 3D anatomical-style silver-gray adult male athlete in dark shorts and shoes, sculpted realistic shading, orange-red pectorals and subtle triceps highlights, rest neutral grayscale. Entire athlete and necessary equipment visible, centered three-quarter view with strong readable silhouette at 120px. Occupy 88% of square. Real transparent alpha background, no floor/scene, no text, logos, UI, badge frames, no extra limbs. Correct equipment and coherent pose. Standing high cable fly. Athlete standing between two compact cable towers with HIGH pulleys above head level, staggered stance, slight forward lean. Both arms reach diagonally down and forwards with slight elbow bend, hands holding separate D-handles meet in front of lower chest. Taut cables slope up and back to high pulleys, no bench, no dumbbells.

## Next pending prompt

Use case: stylized-concept. Standalone transparent PNG exercise artwork for a fitness app, not a screen mockup. Original polished 3D anatomical-style silver-gray adult male athlete in dark shorts and shoes, sculpted realistic shading, orange-red pectorals and subtle triceps highlights, rest neutral grayscale. Entire athlete and necessary equipment visible, centered three-quarter view with strong readable silhouette at 120px. Occupy 88% of square. Real transparent alpha background, no floor/scene, no text, logos, UI, badge frames, no extra limbs. Correct equipment and coherent pose. Seated pec deck butterfly chest fly. Athlete seated upright against padded vertical backrest of compact dark butterfly machine, feet planted. Upper arms horizontal, elbows bent 90 degrees, forearms upright against TWO thick vertical forearm pads at chest sides, bringing pads together. Show bent elbows and forearm pads clearly, compact weight stack and pivot arms. NOT a machine chest press, no straight pressing handles.
