import type { MouseEvent, ReactNode } from 'react'
import type { Navigate } from './types'

export function AppLink({
  to,
  navigate,
  children,
  className,
  onNavigate,
  ariaLabel,
  title,
  ariaCurrent,
}: {
  to: string
  navigate: Navigate
  children: ReactNode
  className?: string
  onNavigate?: () => void
  ariaLabel?: string
  title?: string
  ariaCurrent?: 'page'
}) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    navigate(to)
    onNavigate?.()
  }

  return <a href={to} onClick={handleClick} className={className} aria-label={ariaLabel} title={title} aria-current={ariaCurrent}>{children}</a>
}
