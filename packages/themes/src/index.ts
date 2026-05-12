import { defineTheme } from '@starside-io/verso-runtime'

export const versoSlate = defineTheme({
  name: 'verso-slate',
  colors: {
    primary: '#1A3C6E',
    secondary: '#4A90D9',
    classic: '#F4F4F4',
    accent: '#E8A23C',
  },
})

export const versoWarm = defineTheme({
  name: 'verso-warm',
  colors: {
    primary: '#C0622F',
    secondary: '#E8B26A',
    classic: '#FAF6F1',
    accent: '#3F8E7C',
  },
})

export const versoMono = defineTheme({
  name: 'verso-mono',
  colors: {
    primary: '#1C1C1C',
    secondary: '#5A5A5A',
    classic: '#FFFFFF',
    accent: '#E63946',
  },
})

// Cyberpunk dark — hot magenta + electric cyan on a near-black backdrop.
export const versoNeon = defineTheme({
  name: 'verso-neon',
  colors: {
    primary: '#FF2E88',
    secondary: '#00E5FF',
    classic: '#0B0E1F',
    accent: '#C7FF3D',
    surface: '#161B33',
    muted: '#5C6688',
    background: '#0B0E1F',
    foreground: '#E8F4FF',
  },
})

// Mars dark — rust red + dust pink on a deep ochre backdrop.
export const versoMars = defineTheme({
  name: 'verso-mars',
  colors: {
    primary: '#E25C3C',
    secondary: '#F5A582',
    classic: '#1A0E0A',
    accent: '#F2C94C',
    surface: '#2B1812',
    muted: '#7A4A3A',
    background: '#1A0E0A',
    foreground: '#F5E6DD',
  },
})

export const builtInThemes = [versoSlate, versoWarm, versoMono, versoNeon, versoMars]
