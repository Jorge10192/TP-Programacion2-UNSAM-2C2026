import type { ReactNode } from 'react'
import type { IconName } from './navigation'

const art: Record<IconName, ReactNode> = {
  home: <><path d="m3 10 9-7 9 7"/><path d="M5 9v12h14V9"/><path d="M9 21v-7h6v7"/></>,
  building: <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 21v-5h6v5M8 7h.01M12 7h.01M16 7h.01M8 11h.01M12 11h.01M16 11h.01"/></>,
  pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
  users: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5v1"/></>,
  package: <><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="M3 7v10l9 5 9-5V7M12 12v10"/></>,
  boxes: <><rect x="3" y="4" width="8" height="8" rx="1"/><rect x="13" y="4" width="8" height="8" rx="1"/><rect x="8" y="14" width="8" height="8" rx="1"/></>,
  truck: <><path d="M3 5h11v12H3zM14 9h4l3 4v4h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></>,
  shopping: <><path d="M3 4h2l2 12h12l2-9H6"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></>,
  wallet: <><rect x="3" y="6" width="18" height="15" rx="2"/><path d="M3 10h18M7 6V3h12"/></>,
  book: <><path d="M12 5C8 2 4 3 3 4v16c3-2 6-2 9 0 3-2 6-2 9 0V4c-4-2-7-2-9 1ZM12 5v15"/></>,
  chart: <><path d="M4 20V4M4 20h17M8 16l4-5 4 2 4-7"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/></>,
  credit: <><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  menu: <path d="M4 7h16M4 12h16M4 17h16"/>,
  chevron: <path d="m9 6 6 6-6 6"/>,
  arrow: <path d="M5 12h14m-6-6 6 6-6 6"/>,
  shield: <><path d="M12 2 4 6v6c0 5 3 8 8 10 5-2 8-5 8-10V6Z"/><path d="m9 12 2 2 4-4"/></>,
  close: <path d="M5 5 19 19M19 5 5 19"/>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></>,
  receipt: <><path d="M5 3h14v18l-3-2-4 2-4-2-3 2Z"/><path d="M8 8h8M8 12h8"/></>,
  briefcase: <><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M9 7V4h6v3M3 12h18"/></>,
}

export function Icon({ name, size = 20, className = '' }: { name: IconName; size?: number; className?: string }) {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{art[name]}</svg>
}
