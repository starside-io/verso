import { effect } from '@preact/signals'
import { useEffect, useState } from 'preact/hooks'
import { DeckPropertiesDialog } from './components/DeckPropertiesDialog'
import { ExportHtmlDialog } from './components/ExportHtmlDialog'
import { FindReplace } from './components/FindReplace'
import { IconPicker } from './components/IconPicker'
import { JsonPanel } from './components/JsonPanel'
import { PathsView } from './components/PathsView'
import { Preview } from './components/Preview'
import { RightPane } from './components/RightPane'
import { SlideList } from './components/SlideList'
import { SlideSearch } from './components/SlideSearch'
import { Toolbar } from './components/Toolbar'
import { WatermarkDialog } from './components/WatermarkDialog'
import {
  bootstrap,
  deckPropertiesOpen,
  findReplaceOpen,
  htmlExportOpen,
  htmlExportRunner,
  iconPickerCallback,
  iconPickerOpen,
  iconPickerSeed,
  loadError,
  loaded,
  redo,
  slideSearchOpen,
  undo,
  viewMode,
  watermarkOpen,
} from './state'

export const App = () => {
  const [mode, setMode] = useState(viewMode.value)
  const [searchOpen, setSearchOpen] = useState(slideSearchOpen.value)
  const [htmlOpen, setHtmlOpen] = useState(htmlExportOpen.value)
  const [frOpen, setFrOpen] = useState(findReplaceOpen.value)
  const [deckPropOpen, setDeckPropOpen] = useState(deckPropertiesOpen.value)
  const [wmOpen, setWmOpen] = useState(watermarkOpen.value)
  const [iconOpen, setIconOpen] = useState(iconPickerOpen.value)

  useEffect(
    () =>
      effect(() => {
        setMode(viewMode.value)
      }),
    [],
  )
  useEffect(
    () =>
      effect(() => {
        setSearchOpen(slideSearchOpen.value)
      }),
    [],
  )
  useEffect(
    () =>
      effect(() => {
        setHtmlOpen(htmlExportOpen.value)
      }),
    [],
  )
  useEffect(
    () =>
      effect(() => {
        setFrOpen(findReplaceOpen.value)
      }),
    [],
  )
  useEffect(
    () =>
      effect(() => {
        setDeckPropOpen(deckPropertiesOpen.value)
      }),
    [],
  )
  useEffect(
    () =>
      effect(() => {
        setIconOpen(iconPickerOpen.value)
      }),
    [],
  )
  useEffect(
    () =>
      effect(() => {
        setWmOpen(watermarkOpen.value)
      }),
    [],
  )

  useEffect(() => {
    if (!loaded.value) void bootstrap()
  }, [])

  // Global undo/redo shortcuts. Cmd+Z / Ctrl+Z = undo,
  // Cmd+Shift+Z / Ctrl+Shift+Z = redo. Block-level undo reverts the slide;
  // input fields re-render from the restored slide state, so this works inside
  // text inputs too.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return
      const k = e.key.toLowerCase()
      if (k === 'k') {
        e.preventDefault()
        slideSearchOpen.value = !slideSearchOpen.value
      } else if (k === 'f' && e.shiftKey) {
        e.preventDefault()
        findReplaceOpen.value = !findReplaceOpen.value
      } else if (k === 'z' && !e.shiftKey) {
        e.preventDefault()
        void undo()
      } else if ((k === 'z' && e.shiftKey) || k === 'y') {
        e.preventDefault()
        void redo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div class="editor-shell">
      <header class="editor-toolbar">
        <Toolbar />
      </header>
      {loadError.value ? (
        <div class="editor-error">
          Failed to load deck: {loadError.value}
          <p>Is a viewer running for this project?</p>
        </div>
      ) : mode === 'paths' ? (
        <PathsView />
      ) : (
        <main class="editor-main">
          <aside class="editor-pane editor-pane-left">
            <SlideList />
          </aside>
          <section class="editor-pane editor-pane-center">
            <Preview />
            <div class="editor-json">
              <JsonPanel />
            </div>
          </section>
          <aside class="editor-pane editor-pane-right">
            <RightPane />
          </aside>
        </main>
      )}
      <SlideSearch
        open={searchOpen}
        onClose={() => {
          slideSearchOpen.value = false
        }}
      />
      <FindReplace
        open={frOpen}
        onClose={() => {
          findReplaceOpen.value = false
        }}
      />
      <DeckPropertiesDialog
        open={deckPropOpen}
        onClose={() => {
          deckPropertiesOpen.value = false
        }}
      />
      <WatermarkDialog
        open={wmOpen}
        onClose={() => {
          watermarkOpen.value = false
        }}
      />
      <ExportHtmlDialog
        open={htmlOpen}
        onClose={() => {
          htmlExportOpen.value = false
        }}
        onChoose={(inline) => htmlExportRunner.value?.(inline)}
      />
      <IconPicker
        open={iconOpen}
        initialName={iconPickerSeed.value?.name}
        initialWeight={
          iconPickerSeed.value?.weight as
            | 'thin'
            | 'light'
            | 'regular'
            | 'bold'
            | 'fill'
            | 'duotone'
            | undefined
        }
        onPick={(next) => iconPickerCallback.value?.(next)}
        onClose={() => {
          iconPickerOpen.value = false
          iconPickerCallback.value = null
          iconPickerSeed.value = null
        }}
      />
    </div>
  )
}
