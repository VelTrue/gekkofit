import { useLang } from '../../i18n/LangContext'

export type WorkoutViewMode = 'cards' | 'list'

export function ViewModeSwitch({ value, onChange }: { value: WorkoutViewMode; onChange: (value: WorkoutViewMode) => void }) {
  const { t } = useLang()
  return <label className="workout-mode">
    <span>{t('viewShort')}:</span>
    <select aria-label={t('workoutView')} value={value} onChange={(event) => onChange(event.target.value as WorkoutViewMode)}>
      <option value="cards">{t('workoutCards')}</option>
      <option value="list">{t('workoutList')}</option>
    </select>
  </label>
}
