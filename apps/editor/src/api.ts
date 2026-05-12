import { Manifest, Slide, type SlideOrderEntry, Theme } from '@starside-io/verso-schema'

declare const __VERSO_VIEWER_URL__: string

const fetchJson = async (path: string): Promise<unknown> => {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`${path}: ${res.status} ${res.statusText}`)
  return res.json()
}

export const fetchManifest = async (): Promise<Manifest> => {
  const raw = await fetchJson('/__verso/manifest')
  return Manifest.parse(raw)
}

export const fetchSlides = async (): Promise<Map<string, Slide>> => {
  const raw = (await fetchJson('/__verso/slides')) as Record<string, unknown>
  const out = new Map<string, Slide>()
  for (const [id, value] of Object.entries(raw)) {
    try {
      const slide = Slide.parse(value)
      out.set(slide.id, slide)
    } catch (err) {
      console.warn(`Slide "${id}" failed validation:`, err)
    }
  }
  return out
}

export const fetchThemes = async (): Promise<Theme[]> => {
  const raw = (await fetchJson('/__verso/themes')) as unknown[]
  const out: Theme[] = []
  for (const value of raw) {
    try {
      out.push(Theme.parse(value))
    } catch (err) {
      console.warn('Theme failed validation:', err)
    }
  }
  return out
}

export const viewerUrl = (params: Record<string, string>): string => {
  const url = new URL(__VERSO_VIEWER_URL__)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return url.toString()
}

const send = async (path: string, method: string, body?: unknown): Promise<unknown> => {
  const res = await fetch(path, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let parsed: unknown = null
  if (text) {
    try {
      parsed = JSON.parse(text)
    } catch {
      // non-JSON body
    }
  }
  if (!res.ok) {
    const msg = (parsed as { error?: string })?.error ?? text ?? `${res.status}`
    throw new Error(msg)
  }
  return parsed
}

export const saveSlide = (slide: Slide): Promise<unknown> =>
  send(`/__verso/slide/${encodeURIComponent(slide.id)}`, 'PUT', slide)

export const saveManifest = (m: Manifest): Promise<unknown> => send('/__verso/manifest', 'PUT', m)

export const saveTheme = (theme: Theme): Promise<unknown> =>
  send(`/__verso/theme/${encodeURIComponent(theme.name)}`, 'PUT', theme)

export const reorderSlides = (order: SlideOrderEntry[]): Promise<unknown> =>
  send('/__verso/slide/reorder', 'POST', { order })

export const createSlide = (id: string, layout?: string): Promise<{ slide: Slide }> =>
  send('/__verso/slide/new', 'POST', { id, layout }) as Promise<{ slide: Slide }>

export const deleteSlide = (id: string): Promise<unknown> =>
  send(`/__verso/slide/${encodeURIComponent(id)}`, 'DELETE')

export interface BuildPdfFile {
  pathId: string
  file: string
  bytes: number
  slides: number
}

export const buildPdf = (
  pathId?: string,
  options?: { open?: boolean },
): Promise<{ files: BuildPdfFile[] }> =>
  send('/__verso/build-pdf', 'POST', {
    ...(pathId ? { pathId } : {}),
    ...(options?.open ? { open: true } : {}),
  }) as Promise<{ files: BuildPdfFile[] }>

export const buildHtml = (
  pathId?: string,
  options?: { open?: boolean; inlineImages?: boolean },
): Promise<{ files: BuildPdfFile[] }> =>
  send('/__verso/build-html', 'POST', {
    ...(pathId ? { pathId } : {}),
    ...(options?.open ? { open: true } : {}),
    ...(options?.inlineImages === false ? { inlineImages: false } : {}),
  }) as Promise<{ files: BuildPdfFile[] }>

export interface BuildPngFile {
  pathId: string
  slideId: string
  file: string
  bytes: number
}

export const buildPng = (
  pathId: string | null,
  slideId: string,
  options?: { open?: boolean },
): Promise<BuildPngFile> =>
  send('/__verso/build-png', 'POST', {
    ...(pathId ? { pathId } : {}),
    slideId,
    ...(options?.open ? { open: true } : {}),
  }) as Promise<BuildPngFile>

export interface UploadAssetResult {
  path: string
  bytes: number
}

// Uploads a file to <project>/assets/ and returns the project-relative path
// (e.g. "assets/foo.png") that should be stored in slide.image.src. Filename
// is sanitized server-side and collisions get a numeric suffix.
export const uploadAsset = async (file: File): Promise<UploadAssetResult> => {
  const filename = file.name || 'image'
  const res = await fetch(`/__verso/asset/${encodeURIComponent(filename)}`, {
    method: 'POST',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  })
  const text = await res.text()
  let parsed: unknown = null
  if (text) {
    try {
      parsed = JSON.parse(text)
    } catch {
      /* */
    }
  }
  if (!res.ok) {
    const msg = (parsed as { error?: string })?.error ?? text ?? `${res.status}`
    throw new Error(msg)
  }
  return parsed as UploadAssetResult
}

export const presentUrl = (
  pathId: string | null,
  slideId?: string | null,
  mode: 'present' | 'speaker' = 'present',
): string => {
  const params: Record<string, string> = { mode }
  if (pathId) params.path = pathId
  if (slideId) params.slide = slideId
  return viewerUrl(params)
}
