import { useUnsavedChanges } from '../../app/unsavedChanges'
import { useAppData } from '../../data/dataContext'

export function useOnlineDraft(dirty: boolean, busy: boolean) {
  const { mode } = useAppData()
  return useUnsavedChanges(mode === 'api' && dirty, mode === 'api' && busy)
}
