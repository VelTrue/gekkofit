import type { Exercise } from '../db/schema'

export function ExercisePicker({ onClose }: { onPick: (exercise: Exercise) => void; onClose: () => void }) {
  return <div className="fixed inset-0 z-30 bg-[var(--color-bg)] p-4"><button type="button" onClick={onClose} className="min-h-11 px-3">← Close</button></div>
}
