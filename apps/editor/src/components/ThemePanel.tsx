import { Theme, type ThemeColors } from '@starside-io/verso-schema'
import { useRef, useState } from 'preact/hooks'
import {
  activeThemeName,
  loaded,
  persistTheme,
  projectThemes,
  setActiveTheme,
  status,
  themes,
} from '../state'

type ColorRoleKey = keyof ThemeColors

const ACCENT_ROLES: ColorRoleKey[] = ['primary', 'secondary', 'accent']

const roleLabel: Record<ColorRoleKey, string> = {
  primary: 'primary',
  secondary: 'secondary',
  classic: 'classic',
  accent: 'accent',
  surface: 'surface',
  muted: 'muted',
  background: 'bg',
  foreground: 'fg',
}

const isProjectTheme = (name: string): boolean => projectThemes.value.some((t) => t.name === name)

const updateThemeColor = (theme: Theme, role: ColorRoleKey, value: string): Theme => {
  return Theme.parse({
    ...theme,
    colors: { ...theme.colors, [role]: value },
  })
}

const duplicateThemeName = (base: string): string => {
  let suggestion = `${base}-copy`
  let i = 2
  while (themes.value.some(({ theme }) => theme.name === suggestion)) {
    suggestion = `${base}-copy-${i++}`
  }
  const raw = window.prompt('Name for the project copy:', suggestion)?.trim()
  if (!raw) return ''
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(raw)) {
    alert(`Invalid theme name "${raw}". Use letters, numbers, hyphens.`)
    return ''
  }
  return raw
}

export const ThemePanel = () => {
  const list = themes.value
  const active = activeThemeName.value
  const isLoaded = loaded.value
  const [openName, setOpenName] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const onColorChange = async (theme: Theme, role: ColorRoleKey, value: string) => {
    if (!isProjectTheme(theme.name)) return
    await persistTheme(updateThemeColor(theme, role, value))
  }

  const onDuplicate = async (theme: Theme) => {
    const newName = duplicateThemeName(theme.name)
    if (!newName) return
    const copy = Theme.parse({ ...theme, name: newName })
    await persistTheme(copy)
    setOpenName(newName)
  }

  const onImportClick = () => fileRef.current?.click()

  const onImportFile = async (e: Event) => {
    const input = e.currentTarget as HTMLInputElement
    const file = input.files?.[0]
    // Reset so picking the same file twice still triggers `change`.
    input.value = ''
    if (!file) return
    try {
      const text = await file.text()
      const parsed = Theme.parse(JSON.parse(text))
      const exists = themes.value.some(({ theme }) => theme.name === parsed.name)
      if (
        exists &&
        !window.confirm(
          `A theme named "${parsed.name}" already exists. Overwrite the project copy?`,
        )
      ) {
        return
      }
      await persistTheme(parsed)
      setOpenName(parsed.name)
    } catch (err) {
      status.value = { kind: 'error', message: `Import failed: ${(err as Error).message}` }
    }
  }

  return (
    <div class="theme-panel">
      <header class="pane-header">
        <h2>Themes</h2>
        <button
          type="button"
          class="pane-action pane-action-wide"
          title="Import a theme JSON from disk"
          onClick={onImportClick}
        >
          Import…
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={onImportFile}
        />
      </header>
      <ul class="theme-list">
        {!isLoaded ? (
          <li class="theme-list-empty">Loading…</li>
        ) : list.length === 0 ? (
          <li class="theme-list-empty">No themes available.</li>
        ) : (
          list.map(({ theme, source }) => {
            const isActive = theme.name === active
            const isOpen = openName === theme.name
            const isProject = source === 'project'
            const onCardClick = (e: MouseEvent) => {
              // Clicks inside interactive controls (swatches, color/text
              // inputs, action buttons) shouldn't also activate the theme.
              const t = e.target as HTMLElement | null
              if (t?.closest('button, input, label')) return
              void setActiveTheme(theme.name)
            }
            return (
              // biome-ignore lint/a11y/useKeyWithClickEvents: theme cards expose interactive buttons inside; card-click is a convenience
              <li
                key={theme.name}
                class={`theme-list-item${isActive ? ' is-active' : ''}`}
                onClick={onCardClick}
                title={`Apply "${theme.name}"`}
              >
                <div class="theme-row-head">
                  <span class="theme-name">{theme.name}</span>
                  {isActive && <span class="theme-badge">active</span>}
                  <span class="theme-source">{source}</span>
                </div>
                <div class="theme-swatches">
                  {(() => {
                    // BG: prefer the explicit `background` role, fall back to
                    // `classic` (the page bg color in this design system).
                    const bgRole: ColorRoleKey = theme.colors.background ? 'background' : 'classic'
                    const bgValue = theme.colors[bgRole]
                    return (
                      <div class="theme-swatch-group">
                        <span class="theme-swatch-group-label">BG</span>
                        {/* biome-ignore lint/a11y/noLabelWithoutControl: label wraps a conditional color input rendered only for project themes */}
                        <label
                          class={`theme-swatch-wrap${isProject ? ' is-editable' : ''}`}
                          title={`${bgRole} ${bgValue ?? '(unset)'}`}
                        >
                          <span
                            class="theme-pill"
                            style={{
                              background: bgValue || 'transparent',
                              border: !bgValue ? '1px solid rgba(0,0,0,0.15)' : 'none',
                            }}
                          />
                          {isProject && (
                            <input
                              type="color"
                              class="theme-swatch-input"
                              value={bgValue || '#ffffff'}
                              onChange={(e) =>
                                void onColorChange(
                                  theme,
                                  bgRole,
                                  (e.currentTarget as HTMLInputElement).value,
                                )
                              }
                            />
                          )}
                        </label>
                      </div>
                    )
                  })()}
                  <div class="theme-swatch-group">
                    <span class="theme-swatch-group-label">ACCENTS</span>
                    <div class="theme-pill-row">
                      {ACCENT_ROLES.map((role) => {
                        const v = theme.colors[role]
                        if (!v && role === 'accent') return null
                        return (
                          // biome-ignore lint/a11y/noLabelWithoutControl: label wraps a conditional color input rendered only for project themes
                          <label
                            key={role}
                            class={`theme-swatch-wrap${isProject ? ' is-editable' : ''}`}
                            title={`${role} ${v ?? '(unset)'}`}
                          >
                            <span
                              class="theme-pill"
                              style={{
                                background: v || 'transparent',
                                border: !v ? '1px solid rgba(0,0,0,0.15)' : 'none',
                              }}
                            />
                            {isProject && (
                              <input
                                type="color"
                                class="theme-swatch-input"
                                value={v || '#ffffff'}
                                onChange={(e) =>
                                  void onColorChange(
                                    theme,
                                    role,
                                    (e.currentTarget as HTMLInputElement).value,
                                  )
                                }
                              />
                            )}
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </div>
                <div class="theme-actions">
                  {isProject ? (
                    <button
                      type="button"
                      class="toolbar-btn theme-action-btn"
                      onClick={() => setOpenName(isOpen ? null : theme.name)}
                    >
                      {isOpen ? 'Hide details' : 'Edit details'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      class="toolbar-btn theme-action-btn"
                      onClick={() => void onDuplicate(theme)}
                      title="Built-in themes are read-only. Make a project copy to edit."
                    >
                      Duplicate to project
                    </button>
                  )}
                </div>
                {isOpen && isProject && (
                  <div class="theme-detail">
                    {(
                      [
                        'primary',
                        'secondary',
                        'classic',
                        'accent',
                        'surface',
                        'muted',
                        'background',
                        'foreground',
                      ] as ColorRoleKey[]
                    ).map((role) => {
                      const v = theme.colors[role] ?? ''
                      return (
                        <label key={role} class="theme-detail-row">
                          <span class="theme-detail-label">{roleLabel[role]}</span>
                          <input
                            type="color"
                            class="theme-detail-color"
                            value={v || '#ffffff'}
                            onChange={(e) =>
                              void onColorChange(
                                theme,
                                role,
                                (e.currentTarget as HTMLInputElement).value,
                              )
                            }
                          />
                          <input
                            type="text"
                            class="theme-detail-text"
                            value={v}
                            placeholder={
                              role === 'primary' || role === 'secondary' || role === 'classic'
                                ? 'required'
                                : 'unset'
                            }
                            onChange={(e) => {
                              const val = (e.currentTarget as HTMLInputElement).value.trim()
                              if (
                                !val &&
                                (role === 'primary' || role === 'secondary' || role === 'classic')
                              )
                                return
                              void onColorChange(theme, role, val)
                            }}
                          />
                        </label>
                      )
                    })}
                  </div>
                )}
              </li>
            )
          })
        )}
      </ul>
    </div>
  )
}
