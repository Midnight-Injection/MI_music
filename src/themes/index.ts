/**
 * Theme definitions for Jiyu Music
 * Matches lx-music-desktop theme system
 */

export type ThemeColorType = 'green' | 'blue' | 'red' | 'pink' | 'purple' | 'orange' | 'black' | 'grey' | 'custom'
export type ThemeMode = 'light' | 'dark' | 'auto'

export interface ThemeColors {
  primary: string
  hover: string
  active: string
  light: string
}

export interface Theme {
  id: ThemeColorType
  name: string
  colors: ThemeColors
}

export const themes: Theme[] = [
  {
    id: 'green',
    name: 'Green',
    colors: {
      primary: '#1db954',
      hover: '#1ed760',
      active: '#169c46',
      light: '#e8f5ec'
    }
  },
  {
    id: 'blue',
    name: 'Blue',
    colors: {
      primary: '#007bff',
      hover: '#0056b3',
      active: '#004494',
      light: '#e7f1ff'
    }
  },
  {
    id: 'red',
    name: 'Red',
    colors: {
      primary: '#e91e63',
      hover: '#c2185b',
      active: '#880e4f',
      light: '#fce4ec'
    }
  },
  {
    id: 'pink',
    name: 'Pink',
    colors: {
      primary: '#ff4081',
      hover: '#f50057',
      active: '#c51162',
      light: '#fce4ec'
    }
  },
  {
    id: 'purple',
    name: 'Purple',
    colors: {
      primary: '#9c27b0',
      hover: '#7b1fa2',
      active: '#6a1b9a',
      light: '#f3e5f5'
    }
  },
  {
    id: 'orange',
    name: 'Orange',
    colors: {
      primary: '#ff9800',
      hover: '#f57c00',
      active: '#ef6c00',
      light: '#fff3e0'
    }
  },
  {
    id: 'black',
    name: 'Black',
    colors: {
      primary: '#212121',
      hover: '#424242',
      active: '#000000',
      light: '#f5f5f5'
    }
  },
  {
    id: 'grey',
    name: 'Grey',
    colors: {
      primary: '#607d8b',
      hover: '#546e7a',
      active: '#455a64',
      light: '#eceff1'
    }
  }
]

export const getTheme = (id: ThemeColorType): Theme => {
  const theme = themes.find(t => t.id === id)
  if (!theme) {
    return themes[0] // Default to green
  }
  return theme
}

export const getThemeByName = (name: string): Theme | undefined => {
  return themes.find(t => t.name.toLowerCase() === name.toLowerCase())
}

export const createCustomTheme = (color: string): Theme => {
  // Generate a basic color palette from a single color
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null
  }

  const rgbToHex = (r: number, g: number, b: number) => {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16)
      return hex.length === 1 ? '0' + hex : hex
    }).join('')
  }

  const adjustBrightness = (hex: string, factor: number) => {
    const rgb = hexToRgb(hex)
    if (!rgb) return hex

    const adjust = (value: number) => {
      const adjusted = Math.round(value * factor)
      return Math.max(0, Math.min(255, adjusted))
    }

    return rgbToHex(adjust(rgb.r), adjust(rgb.g), adjust(rgb.b))
  }

  const hover = adjustBrightness(color, 0.8)
  const active = adjustBrightness(color, 0.6)
  const light = adjustBrightness(color, 1.9)

  return {
    id: 'custom',
    name: 'Custom',
    colors: {
      primary: color,
      hover,
      active,
      light
    }
  }
}
