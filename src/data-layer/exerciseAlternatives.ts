import type { Exercise } from '../db/schema'

// Each row describes one movement pattern. Equipment variants share a row;
// exercises that train the same muscles through a different motion do not.
const movementFamilies = [
  [1, 2, 3, 4, 5, 6], [7, 8, 9, 10, 11], [12, 13, 14, 15], [16, 24, 31],
  [18, 19, 20, 21], [22, 23], [25, 26, 27, 28], [29, 30],
  [33, 34, 35, 36, 37, 38], [39, 40, 41, 45], [42, 43, 44], [46, 47],
  [48, 49, 50, 51, 223], [53, 54, 55, 224, 225, 226],
  [56, 57, 58, 59, 60, 61, 62, 63], [64, 65], [66, 67],
  [70, 71, 72, 73, 88, 89, 90], [74, 75, 76], [77, 78, 79, 80, 91],
  [81, 82, 83, 84], [85, 86, 87], [94, 95, 96, 97],
  [99, 100], [101, 102, 103, 156], [104, 105],
  [107, 108, 109], [110, 111, 112], [113, 114, 115],
  [116, 117, 118, 130], [119, 120, 121, 125, 126, 127, 136], [122, 123, 124],
  [128, 129], [131, 132, 133, 134, 135],
  [137, 138, 139, 140, 141], [142, 143, 144],
  [145, 146, 147, 148, 149], [150, 151, 152], [153, 154, 155, 157],
  [158, 159, 160], [161, 162, 163, 164, 165, 166, 167], [168, 169, 170, 171],
  [172, 173, 174, 175, 176], [177, 178, 179, 186],
  [180, 181, 182, 183], [184, 185], [187, 188, 189], [190, 191, 192, 193],
  [196, 197, 198, 199, 200], [201, 202, 203, 204],
  [208, 209, 210, 211, 214, 215], [212, 216, 217], [213, 218, 219],
  [220, 221, 222], [227, 228, 229, 230, 231],
  [232, 233, 234], [235, 236, 237], [238, 239, 240, 241, 242],
  [243, 244], [245, 246], [247, 248, 249], [250, 251, 252],
  [253, 254, 255, 256], [257, 258, 259, 260],
  [261, 262, 263, 264, 265, 268, 269], [266, 267, 270, 271],
  [273, 274, 275], [276, 277, 278, 279, 280], [281, 282, 283], [284, 285],
  [287, 288, 302], [289, 295, 301], [290, 291, 299], [292, 304],
  [293, 294, 303, 300], [296, 297, 298],
  [311, 312, 314, 319],
  [321, 336, 337], [322, 324, 325], [326, 333],
  [330, 334],
]

const familyById = new Map(movementFamilies.flatMap((ids, family) => ids.map((id) => [id, family] as const)))

function overlap(left: string[], right: string[]): number {
  const rightSet = new Set(right)
  return left.reduce((count, muscle) => count + Number(rightSet.has(muscle)), 0)
}

export function getExerciseAlternatives(source: Exercise, catalog: Exercise[], limit = 3): Exercise[] {
  const family = familyById.get(source.id)
  if (family === undefined) return []
  return catalog
    .filter((candidate) => candidate.id !== source.id
      && familyById.get(candidate.id) === family
      && overlap(source.primary_muscles, candidate.primary_muscles) > 0)
    .sort((left, right) => overlap(source.primary_muscles, right.primary_muscles) - overlap(source.primary_muscles, left.primary_muscles)
      || overlap(source.secondary_muscles, right.secondary_muscles) - overlap(source.secondary_muscles, left.secondary_muscles)
      || Number(right.equipment !== source.equipment) - Number(left.equipment !== source.equipment)
      || left.id - right.id)
    .slice(0, Math.max(0, limit))
}
