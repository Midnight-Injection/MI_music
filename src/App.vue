<template>
  <NConfigProvider :theme="naiveTheme" :theme-overrides="naiveThemeOverrides" :cls-prefix="undefined">
    <NMessageProvider>
      <NDialogProvider>
        <NNotificationProvider>
          <AppBootstrap v-slot="{ isReady, errorMessage }">
            <!-- PC 模式: 桌面窗口 Shell -->
            <DesktopWindowShell v-if="uiMode.isPC" :caption="windowCaption" :is-ready="isReady" :error-message="errorMessage">
              <AppLayoutShell />
            </DesktopWindowShell>
            <!-- TV 模式: 全屏无边框 -->
            <div v-else-if="uiMode.isTV" class="tv-shell">
              <AppLayoutShell />
            </div>
            <!-- Mobile 模式: 全屏 + 底部导航 -->
            <div v-else class="mobile-shell">
              <AppLayoutShell />
            </div>
          </AppBootstrap>
        </NNotificationProvider>
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { darkTheme, NConfigProvider, NMessageProvider, NDialogProvider, NNotificationProvider } from 'naive-ui'
import AppBootstrap from './components/app/AppBootstrap.vue'
import AppLayoutShell from './components/layout/AppLayoutShell.vue'
import DesktopWindowShell from './components/layout/DesktopWindowShell.vue'
import { createThemeOverrides } from './plugins/naive-ui'
import { useThemeStore } from './store/theme'
import { useUIModeStore } from './store/uiMode'
import { FONT_FAMILY_STACKS } from './types/settings'

function withAlpha(color: string, alpha: number) {
  const normalized = Math.max(0, Math.min(1, alpha))
  const hex = color.trim()
  const hexMatch = /^#([0-9a-f]{6})$/i.exec(hex)

  if (!hexMatch) {
    return color
  }

  const value = hexMatch[1]
  const r = Number.parseInt(value.slice(0, 2), 16)
  const g = Number.parseInt(value.slice(2, 4), 16)
  const b = Number.parseInt(value.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${normalized.toFixed(3)})`
}

const route = useRoute()
const themeStore = useThemeStore()
const uiMode = useUIModeStore()
const windowCaption = computed(() => String(route.meta.title || '极域音乐'))
const naiveTheme = computed(() => (themeStore.resolvedMode === 'dark' ? darkTheme : null))
const naiveThemeOverrides = computed(() => {
  const theme = themeStore.getCurrentTheme()
  const isDark = themeStore.resolvedMode === 'dark'
  const textPrimary = themeStore.settings.textColorPrimary
  const textSecondary = themeStore.settings.textColorSecondary

  return createThemeOverrides({
    primaryColor: theme.colors.primary,
    primaryHover: theme.colors.hover,
    primaryActive: theme.colors.active,
    fontFamily: FONT_FAMILY_STACKS[themeStore.settings.fontFamilyPreset],
    panelSurface: isDark ? 'rgba(8, 14, 24, 0.78)' : 'rgba(24, 38, 63, 0.56)',
    modalSurface: isDark ? 'rgba(5, 12, 24, 0.84)' : 'rgba(17, 27, 45, 0.78)',
    borderColor: isDark ? 'rgba(255, 255, 255, 0.13)' : 'rgba(255, 255, 255, 0.18)',
    borderLight: isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.3)',
    textPrimary,
    textSecondary,
    textTertiary: withAlpha(textSecondary, 0.72),
    textDisabled: withAlpha(textSecondary, 0.46),
    textOnPrimary: '#ffffff',
    inputSurface: 'rgba(255, 255, 255, 0.12)',
    inputSurfaceFocus: 'rgba(255, 255, 255, 0.18)',
    buttonSecondaryBg: 'rgba(255, 255, 255, 0.08)',
    shadowSm: isDark
      ? '0 18px 40px rgba(2, 10, 18, 0.2)'
      : '0 18px 36px rgba(15, 23, 42, 0.14)',
    shadowMd: isDark
      ? '0 28px 72px rgba(2, 10, 18, 0.3)'
      : '0 26px 64px rgba(15, 23, 42, 0.2)',
  })
})
</script>

<style lang="scss">
@use './assets/styles/variables.scss';
@use './assets/styles/base.scss';

.n-config-provider {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: grid;
  overflow: hidden;
}

.tv-shell {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--bg-primary);
}
</style>
