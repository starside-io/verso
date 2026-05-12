import type { ComponentDef, LayoutDef, ResolvedRegistry, ThemeDef, VersoConfig } from './types.js'

export interface BuildRegistryInput {
  builtIn?: VersoConfig
  user?: VersoConfig | undefined
}

export const buildRegistry = ({ builtIn, user }: BuildRegistryInput): ResolvedRegistry => {
  const themes = new Map<string, ThemeDef>()
  const layouts = new Map<string, LayoutDef>()
  const components = new Map<string, ComponentDef<any>>()

  for (const t of builtIn?.themes ?? []) themes.set(t.name, t)
  for (const l of builtIn?.layouts ?? []) layouts.set(l.name, l)
  for (const c of builtIn?.components ?? []) components.set(c.name, c)

  for (const t of user?.themes ?? []) themes.set(t.name, t)
  for (const l of user?.layouts ?? []) layouts.set(l.name, l)
  for (const c of user?.components ?? []) components.set(c.name, c)

  return { themes, layouts, components }
}
