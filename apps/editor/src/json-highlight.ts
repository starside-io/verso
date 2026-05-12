// Regex-based JSON syntax highlighter. Single pass, no library.
// Returns HTML safe to drop into a <pre>: the input is HTML-escaped first,
// then JSON tokens are wrapped in <span class="json-*">.

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const TOKEN_RE =
  /("(?:[^"\\]|\\.)*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([{}\[\],])/g

export const highlightJson = (text: string): string =>
  escapeHtml(text).replace(TOKEN_RE, (_m, str, colon, lit, num, punct) => {
    if (str) {
      return colon
        ? `<span class="json-key">${str}</span>${colon}`
        : `<span class="json-string">${str}</span>`
    }
    if (lit) return `<span class="json-literal">${lit}</span>`
    if (num) return `<span class="json-num">${num}</span>`
    if (punct) return `<span class="json-punct">${punct}</span>`
    return ''
  })
