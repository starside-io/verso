import { useEffect, useRef } from 'preact/hooks'
import { viewerUrl } from '../api'
import { activeBlockPath, activePathId, activeSlideId, hoveredBlockPath, rightTab } from '../state'

export const Preview = () => {
  const pathId = activePathId.value
  const slideId = activeSlideId.value
  const blockPath = activeBlockPath.value
  const hoverPath = hoveredBlockPath.value
  // Hover wins over selection so the user gets immediate feedback as they
  // move through the inspector tree.
  const highlightPath = hoverPath ?? blockPath
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const src = viewerUrl(
    slideId ? { path: pathId, slide: slideId, edit: '1' } : { path: pathId, edit: '1' },
  )

  // Receive selection events from the iframe (clicks on blocks).
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const data = e.data as { type?: string; path?: number[] | null } | null
      if (!data) return
      if (data.type === 'verso-edit/select') {
        activeBlockPath.value = data.path?.length ? data.path : null
        rightTab.value = 'inspector'
      } else if (data.type === 'verso-edit/hover') {
        hoveredBlockPath.value = data.path?.length ? data.path : null
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  // Push the highlight path to the iframe (hover wins over active selection).
  // biome-ignore lint/correctness/useExhaustiveDependencies: iframeRef is a stable ref, no need in deps
  useEffect(() => {
    const send = () => {
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'verso-edit/highlight', path: highlightPath },
        '*',
      )
    }
    send()
    // Also re-send shortly after src changes, since the new iframe needs time to load.
    const t = setTimeout(send, 250)
    return () => clearTimeout(t)
  }, [highlightPath, src])

  return (
    <div class="preview">
      <div class="preview-frame-wrap">
        <iframe ref={iframeRef} class="preview-frame" src={src} title="Slide preview" key={src} />
      </div>
    </div>
  )
}
