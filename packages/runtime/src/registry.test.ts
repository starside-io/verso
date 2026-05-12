import { describe, expect, it } from 'vitest'
import { defineLayout, defineTheme } from './define.js'
import { buildRegistry } from './registry.js'

describe('buildRegistry', () => {
  it('lets user definitions shadow built-ins by name', () => {
    const builtIn = {
      themes: [
        defineTheme({
          name: 'verso-slate',
          colors: { primary: '#1', secondary: '#2', classic: '#3' },
        }),
      ],
      layouts: [defineLayout({ name: 'two-col', render: () => '<div>builtin</div>' })],
    }
    const user = {
      layouts: [defineLayout({ name: 'two-col', render: () => '<div>user</div>' })],
    }
    const reg = buildRegistry({ builtIn, user })
    expect(reg.themes.size).toBe(1)
    expect((reg.layouts.get('two-col')!.render as () => string)()).toBe('<div>user</div>')
  })

  it('keeps built-ins when no user override is given', () => {
    const builtIn = {
      layouts: [defineLayout({ name: 'two-col', render: () => 'A' })],
    }
    const reg = buildRegistry({ builtIn })
    expect((reg.layouts.get('two-col')!.render as () => string)()).toBe('A')
  })
})
