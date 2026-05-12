import type { JSX } from 'preact'

// 24x24 stroke-based icons. All paths use currentColor so they pick up the
// containing button's text color in both light and dark editor themes.
// Adding a new glyph: drop a new entry into PATHS and reference it by name.
type IconName =
  | 'slide-plus'
  | 'block-plus'
  | 'layout'
  | 'align'
  | 'settings'
  | 'search'
  | 'undo'
  | 'redo'
  | 'play'
  | 'download'
  | 'paths'
  | 'sun'
  | 'moon'
  | 'check'
  | 'chevron-down'
  | 'speaker'
  | 'file-pdf'
  | 'file-html'
  | 'file-image'
  | 'watermark'

const PATHS: Record<IconName, JSX.Element> = {
  'slide-plus': (
    <>
      <rect x="3" y="5" width="14" height="11" rx="1.5" />
      <path d="M19 13v6m-3-3h6" />
    </>
  ),
  'block-plus': (
    <>
      <rect x="4" y="4" width="16" height="16" rx="1.5" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  layout: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 9v12" />
    </>
  ),
  align: (
    <>
      <path d="M4 6h16M4 12h10M4 18h16" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  undo: (
    <>
      <path d="M3 7v6h6" />
      <path d="M3 13a9 9 0 1 1 3 6.7" />
    </>
  ),
  redo: (
    <>
      <path d="M21 7v6h-6" />
      <path d="M21 13a9 9 0 1 0-3 6.7" />
    </>
  ),
  play: (
    <>
      <path d="M6 4.5v15l13-7.5z" fill="currentColor" stroke="none" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v12m-5-5 5 5 5-5" />
      <path d="M4 19h16" />
    </>
  ),
  paths: (
    <>
      <circle cx="6" cy="5" r="2" />
      <circle cx="6" cy="19" r="2" />
      <circle cx="18" cy="12" r="2" />
      <path d="M6 7v3a4 4 0 0 0 4 4h6M6 17v-3a4 4 0 0 1 4-4h6" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </>
  ),
  moon: (
    <>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </>
  ),
  check: (
    <>
      <path d="m5 12 5 5 9-11" />
    </>
  ),
  'chevron-down': (
    <>
      <path d="m6 9 6 6 6-6" />
    </>
  ),
  speaker: (
    <>
      <path d="M3 10v4a1 1 0 0 0 1 1h3l5 4V5L7 9H4a1 1 0 0 0-1 1z" />
      <path d="M16 8a5 5 0 0 1 0 8M19 5a9 9 0 0 1 0 14" />
    </>
  ),
  'file-pdf': (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 14h1.5a1.5 1.5 0 0 1 0 3H9zM13.5 14v3h1.2a1.3 1.3 0 0 0 1.3-1.3v-.4a1.3 1.3 0 0 0-1.3-1.3zM18.5 14H17v3" />
    </>
  ),
  'file-html': (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="m9 14-1.5 1.5L9 17M15 14l1.5 1.5L15 17M12.5 13.5l-1 4" />
    </>
  ),
  'file-image': (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <circle cx="9.5" cy="13.5" r="1" />
      <path d="m6 19 4-4 3 3 2-2 4 4" />
    </>
  ),
  watermark: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 17h6" stroke-opacity="0.55" />
      <path d="M14 17h3" stroke-opacity="0.55" />
    </>
  ),
}

interface IconProps {
  name: IconName
  size?: number
  class?: string
  'aria-label'?: string
}

export const Icon = ({ name, size = 16, class: cls, 'aria-label': label }: IconProps) => {
  const path = PATHS[name]
  return (
    <svg
      class={`icon${cls ? ` ${cls}` : ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden={label ? undefined : 'true'}
      role={label ? 'img' : undefined}
      aria-label={label}
    >
      {path}
    </svg>
  )
}

export type { IconName }
