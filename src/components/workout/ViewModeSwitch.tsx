import { useLang } from '../../i18n/LangContext'
import { WorkoutIcon } from './WorkoutIcon'

export type WorkoutViewMode = 'cards' | 'list'

export function ViewModeSwitch({ value, onChange }: { value: WorkoutViewMode; onChange: (value: WorkoutViewMode) => void }) {
  const { t } = useLang()
  return <div className="workout-mode" role="group" aria-label={t('workoutView')}>
    <span aria-hidden="true" className="workout-mode-selection" style={{ transform: `translateX(${value === 'list' ? 100 : 0}%)` }} />
    {(['cards', 'list'] as const).map((mode) => <button key={mode} type="button" aria-pressed={value === mode} onClick={() => onChange(mode)}>
      <WorkoutIcon name={mode} />{t(mode === 'cards' ? 'workoutCards' : 'workoutList')}
    </button>)}
  </div>
}
