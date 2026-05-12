import type { ComponentDef, LayoutDef, ThemeDef, VersoConfig } from './types.js'

export const defineConfig = (config: VersoConfig): VersoConfig => config

export const defineLayout = (layout: LayoutDef): LayoutDef => layout

export const defineTheme = (theme: ThemeDef): ThemeDef => theme

export const defineComponent = <P>(component: ComponentDef<P>): ComponentDef<P> => component
