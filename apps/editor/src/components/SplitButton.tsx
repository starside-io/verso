import type { ComponentChildren } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import { Icon } from './Icon'

interface SplitButtonProps {
  label: ComponentChildren
  title?: string
  disabled?: boolean
  onPrimaryClick: () => void
  children: (close: () => void) => ComponentChildren
  align?: 'left' | 'right'
}

// A two-part button: clicking the main face runs `onPrimaryClick`; clicking
// the chevron opens the dropdown menu. Mirrors the PowerPoint/Keynote
// "Present ▾" pattern.
export const SplitButton = ({
  label,
  title,
  disabled,
  onPrimaryClick,
  children,
  align = 'right',
}: SplitButtonProps) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const close = () => setOpen(false)

  return (
    <div class="dropdown split-button" ref={ref}>
      <button
        type="button"
        class="toolbar-btn split-button-main"
        disabled={disabled}
        title={title}
        onClick={() => {
          setOpen(false)
          onPrimaryClick()
        }}
      >
        {label}
      </button>
      <button
        type="button"
        class={`toolbar-btn split-button-caret${open ? ' is-open' : ''}`}
        disabled={disabled}
        aria-label="Open menu"
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="chevron-down" />
      </button>
      {open && <div class={`dropdown-menu dropdown-menu-${align}`}>{children(close)}</div>}
    </div>
  )
}
