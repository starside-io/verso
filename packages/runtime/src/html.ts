const ESCAPE: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export const escapeHtml = (input: string): string =>
  input.replace(/[&<>"']/g, (c) => ESCAPE[c] ?? c)

const RAW = Symbol.for('verso.raw')

export interface RawHtml {
  readonly [RAW]: true
  readonly value: string
}

export const raw = (value: string): RawHtml => ({ [RAW]: true, value })

export const isRaw = (v: unknown): v is RawHtml =>
  typeof v === 'object' && v !== null && (v as { [RAW]?: true })[RAW] === true

const stringify = (value: unknown): string => {
  if (value === null || value === undefined || value === false) return ''
  if (isRaw(value)) return value.value
  if (Array.isArray(value)) return value.map(stringify).join('')
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return escapeHtml(String(value))
}

export const html = (strings: TemplateStringsArray, ...values: unknown[]): RawHtml => {
  let out = strings[0] ?? ''
  for (let i = 0; i < values.length; i++) {
    out += stringify(values[i])
    out += strings[i + 1] ?? ''
  }
  return raw(out)
}

export const renderToString = (value: unknown): string => stringify(value)
