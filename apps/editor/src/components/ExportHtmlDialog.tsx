import { useEffect, useRef } from 'preact/hooks'

interface ExportHtmlDialogProps {
  open: boolean
  onClose: () => void
  onChoose: (inlineImages: boolean) => void
}

export const ExportHtmlDialog = ({ open, onClose, onChoose }: ExportHtmlDialogProps) => {
  const primaryRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    requestAnimationFrame(() => primaryRef.current?.focus())
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const pick = (inline: boolean) => {
    onChoose(inline)
    onClose()
  }

  return (
    <div
      class="export-dialog-backdrop"
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div
        class="export-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-dialog-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <h2 id="export-dialog-title" class="export-dialog-title">
          Export as HTML
        </h2>
        <p class="export-dialog-body">How should images be handled in the exported file?</p>
        <div class="export-dialog-options">
          <button
            ref={primaryRef}
            type="button"
            class="export-dialog-option export-dialog-option-primary"
            onClick={() => pick(true)}
          >
            <span class="export-dialog-option-title">⤓ Inline images</span>
            <span class="export-dialog-option-desc">
              Encode all images as base64. Larger file, works fully offline.
            </span>
          </button>
          <button type="button" class="export-dialog-option" onClick={() => pick(false)}>
            <span class="export-dialog-option-title">↗ Keep URLs</span>
            <span class="export-dialog-option-desc">
              Leave image src URLs as-is. Smaller file, needs network to render.
            </span>
          </button>
        </div>
        <div class="export-dialog-footer">
          <button type="button" class="export-dialog-cancel" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
