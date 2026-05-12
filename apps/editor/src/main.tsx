import { render } from 'preact'
import { App } from './App'

const root = document.getElementById('editor-root')
if (!root) throw new Error('No #editor-root element')
render(<App />, root)
