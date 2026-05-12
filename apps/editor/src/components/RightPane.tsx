import { rightTab } from '../state'
import { Inspector } from './Inspector'
import { ThemePanel } from './ThemePanel'
import { TransitionPanel } from './TransitionPanel'

export const RightPane = () => {
  const tab = rightTab.value
  return (
    <div class="right-pane">
      <div class="right-tabs">
        <button
          type="button"
          class={`right-tab${tab === 'inspector' ? ' is-active' : ''}`}
          onClick={() => {
            rightTab.value = 'inspector'
          }}
        >
          Inspector
        </button>
        <button
          type="button"
          class={`right-tab${tab === 'transitions' ? ' is-active' : ''}`}
          onClick={() => {
            rightTab.value = 'transitions'
          }}
        >
          Transitions
        </button>
        <button
          type="button"
          class={`right-tab${tab === 'themes' ? ' is-active' : ''}`}
          onClick={() => {
            rightTab.value = 'themes'
          }}
        >
          Themes
        </button>
      </div>
      <div class="right-tab-body">
        {tab === 'inspector' ? (
          <Inspector />
        ) : tab === 'transitions' ? (
          <TransitionPanel />
        ) : (
          <ThemePanel />
        )}
      </div>
    </div>
  )
}
