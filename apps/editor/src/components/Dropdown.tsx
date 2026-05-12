import type { ComponentChildren } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'

interface DropdownProps {
  label: ComponentChildren
  disabled?: boolean
  children: (close: () => void) => ComponentChildren
  align?: 'left' | 'right'
}

export const Dropdown = ({ label, disabled, children, align = 'left' }: DropdownProps) => {
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
    <div class="dropdown" ref={ref}>
      <button
        type="button"
        class={`toolbar-btn${open ? ' is-open' : ''}`}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
      >
        {label}
      </button>
      {open && <div class={`dropdown-menu dropdown-menu-${align}`}>{children(close)}</div>}
    </div>
  )
}
