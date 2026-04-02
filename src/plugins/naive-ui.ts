import type { GlobalThemeOverrides } from 'naive-ui'

interface NaiveThemePalette {
  primaryColor: string
  primaryHover: string
  primaryActive: string
  fontFamily: string
  panelSurface: string
  modalSurface: string
  borderColor: string
  borderLight: string
  textPrimary: string
  textSecondary: string
  textTertiary: string
  textDisabled: string
  textOnPrimary: string
  inputSurface: string
  inputSurfaceFocus: string
  buttonSecondaryBg: string
  shadowSm: string
  shadowMd: string
}

function withAlpha(color: string, alpha: number): string {
  const normalizedAlpha = Math.max(0, Math.min(1, alpha))
  const hex = color.trim()
  const hexMatch = /^#([0-9a-f]{6})$/i.exec(hex)

  if (hexMatch) {
    const value = hexMatch[1]
    const r = Number.parseInt(value.slice(0, 2), 16)
    const g = Number.parseInt(value.slice(2, 4), 16)
    const b = Number.parseInt(value.slice(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${normalizedAlpha.toFixed(3)})`
  }

  const rgbMatch = /^rgba?\(([^)]+)\)$/i.exec(hex)
  if (rgbMatch) {
    const [r = '0', g = '0', b = '0'] = rgbMatch[1].split(',').map((item) => item.trim())
    return `rgba(${r}, ${g}, ${b}, ${normalizedAlpha.toFixed(3)})`
  }

  return color
}

export function createThemeOverrides(palette: NaiveThemePalette): GlobalThemeOverrides {
  const focusBorder = `1px solid ${withAlpha(palette.primaryColor, 0.52)}`
  const focusRing = `0 0 0 4px ${withAlpha(palette.primaryColor, 0.16)}`

  return {
    common: {
      primaryColor: palette.primaryColor,
      primaryColorHover: palette.primaryHover,
      primaryColorPressed: palette.primaryActive,
      primaryColorSuppl: palette.primaryColor,
      fontFamily: palette.fontFamily,
      borderRadius: '14px',
      borderRadiusSmall: '12px',
      fontSize: '14px',
      fontSizeMedium: '14px',
      fontSizeSmall: '13px',
      fontSizeMini: '12px',
      heightMedium: '38px',
      heightSmall: '34px',
      heightMini: '30px',
      baseColor: palette.panelSurface,
      dividerColor: palette.borderColor,
      borderColor: palette.borderColor,
      inputColor: palette.inputSurface,
      tableColor: 'transparent',
      popoverColor: palette.modalSurface,
      modalColor: palette.modalSurface,
      cardColor: palette.panelSurface,
      textColor1: palette.textPrimary,
      textColor2: palette.textSecondary,
      textColor3: palette.textTertiary,
      textColorDisabled: palette.textDisabled,
      placeholderColor: palette.textTertiary,
      boxShadow1: palette.shadowSm,
      boxShadow2: palette.shadowMd,
    },
    Button: {
      borderRadiusMedium: '999px',
      borderRadiusSmall: '999px',
      borderRadiusTiny: '999px',
      fontSizeMedium: '14px',
      fontSizeSmall: '13px',
      heightMedium: '40px',
      heightSmall: '34px',
      paddingMedium: '0 16px',
      paddingSmall: '0 14px',
      colorPrimary: palette.primaryColor,
      colorHoverPrimary: palette.primaryHover,
      colorPressedPrimary: palette.primaryActive,
      textColorPrimary: palette.textOnPrimary,
      borderPrimary: '1px solid transparent',
      borderHoverPrimary: '1px solid transparent',
      borderPressedPrimary: '1px solid transparent',
    },
    Input: {
      borderRadius: '18px',
      heightMedium: '48px',
      border: `1px solid ${palette.borderColor}`,
      borderHover: `1px solid ${palette.borderLight}`,
      borderFocus: focusBorder,
      color: palette.inputSurface,
      colorFocus: palette.inputSurfaceFocus,
      textColor: palette.textPrimary,
      placeholderColor: palette.textTertiary,
      boxShadowFocus: focusRing,
    },
    Tabs: {
      tabTextColorLine: palette.textSecondary,
      tabTextColorActiveLine: palette.textPrimary,
      tabTextColorHoverLine: palette.textPrimary,
      barColor: palette.primaryColor,
    },
    Switch: {
      railColor: palette.buttonSecondaryBg,
      loadingColor: palette.primaryColor,
    },
    Slider: {
      fillColor: palette.primaryColor,
      fillColorHover: palette.primaryHover,
      dotColor: palette.textPrimary,
      dotBorderColor: palette.primaryColor,
    },
    Select: {
      peers: {
        InternalSelection: {
          borderRadius: '14px',
          border: `1px solid ${palette.borderColor}`,
          borderHover: `1px solid ${palette.borderLight}`,
          borderFocus: focusBorder,
          borderActive: focusBorder,
          color: palette.inputSurface,
          colorActive: palette.inputSurfaceFocus,
          textColor: palette.textPrimary,
        },
      },
    },
    Modal: {
      borderRadius: '24px',
      color: palette.modalSurface,
    },
    Message: {
      borderRadius: '14px',
    },
    Card: {
      borderRadius: '18px',
      color: palette.panelSurface,
      borderColor: palette.borderColor,
    },
    Progress: {
      fillColor: palette.primaryColor,
      railColor: palette.buttonSecondaryBg,
    },
    Checkbox: {
      colorChecked: palette.primaryColor,
      borderChecked: `1px solid ${palette.primaryColor}`,
      checkMarkColor: palette.textOnPrimary,
    },
    Tooltip: {
      borderRadius: '10px',
      color: palette.modalSurface,
      textColor: palette.textPrimary,
    },
    Tag: {
      borderRadius: '999px',
    },
  }
}
