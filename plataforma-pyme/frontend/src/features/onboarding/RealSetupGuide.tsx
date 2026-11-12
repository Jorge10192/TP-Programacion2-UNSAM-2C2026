import { Icon } from '../../app/Icon.tsx'
import { realWorkspaceHref } from '../auth/realWorkspaceNavigation.ts'
import type { RealSetupSuggestion } from './realSetupGuidance.ts'
import './realSetupGuidance.css'

type Props = {
  suggestion: RealSetupSuggestion | null
  businessId: string
  onNavigate: (path: string) => void
}

/** H3: contextual navigation only. No APIs, POSTs, permissions or demo data. */
export function RealSetupGuide({ suggestion, businessId, onNavigate }: Props) {
  if (!suggestion) return null
  return <aside className="e3-h3-guide" aria-label="Orientación para primeros pasos">
    <span className="e3-h3-guide-icon" aria-hidden="true"><Icon name="book" size={21}/></span>
    <div className="e3-h3-guide-copy">
      <strong>{suggestion.title}</strong>
      <p>{suggestion.detail}</p>
    </div>
    <button className="real-auth-secondary e3-h3-guide-action" type="button"
      onClick={() => onNavigate(realWorkspaceHref(businessId, suggestion.route))}>
      {suggestion.actionLabel} <Icon name="arrow" size={16}/>
    </button>
  </aside>
}
