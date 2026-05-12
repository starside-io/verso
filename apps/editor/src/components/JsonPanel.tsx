import { Slide } from '@starside-io/verso-schema'
import { useEffect, useRef, useState } from 'preact/hooks'
import { highlightJson } from '../json-highlight'
import { activeSlide, persistActiveSlide } from '../state'

export const JsonPanel = () => {
  const slide = activeSlide.value
  const text = slide ? JSON.stringify(slide, null, 2) : ''
  const [draft, setDraft] = useState(text)
  const [parseError, setParseError] = useState<string | null>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const preRef = useRef<HTMLPreElement>(null)

  useEffect(() => {
    setDraft(text)
    setParseError(null)
  }, [text])

  const save = async () => {
    if (!slide) return
    let parsed: Slide
    try {
      parsed = Slide.parse(JSON.parse(draft))
    } catch (err) {
      setParseError((err as Error).message)
      return
    }
    if (parsed.id !== slide.id) {
      setParseError(`Cannot rename slide id here (was "${slide.id}", now "${parsed.id}").`)
      return
    }
    setParseError(null)
    try {
      await persistActiveSlide(parsed)
    } catch {
      // status pill shows the error
    }
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
      e.preventDefault()
      void save()
    }
  }

  // Sync the highlight overlay's scroll position to the textarea's.
  const onScroll = () => {
    if (preRef.current && taRef.current) {
      preRef.current.scrollTop = taRef.current.scrollTop
      preRef.current.scrollLeft = taRef.current.scrollLeft
    }
  }

  return (
    <div class="json-panel">
      <header class="pane-header pane-header-tight">
        <h2>JSON (active slide)</h2>
        <span class="pane-hint">Cmd+S to save</span>
        {parseError && <span class="pane-error">{parseError}</span>}
        <button
          type="button"
          class="toolbar-btn"
          disabled={!slide || !!parseError || draft === text}
          onClick={save}
        >
          Save
        </button>
      </header>
      {slide ? (
        <div class="json-edit-wrap">
          {/* biome-ignore lint/security/noDangerouslySetInnerHtml: syntax highlighting output is generated locally, not from user input */}
          <pre
            ref={preRef}
            class="json-edit-overlay"
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: `${highlightJson(draft)}\n` }}
          />
          <textarea
            ref={taRef}
            class="json-edit-input"
            value={draft}
            onInput={(e) => setDraft((e.currentTarget as HTMLTextAreaElement).value)}
            onScroll={onScroll}
            onKeyDown={onKeyDown}
            spellcheck={false}
            wrap="off"
          />
        </div>
      ) : (
        <pre class="json-panel-stub">Select a slide to edit its JSON.</pre>
      )}
    </div>
  )
}
