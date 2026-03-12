<template>
  <div id="app" class="app-shell">
    <div class="app-shell__glow app-shell__glow--left"></div>
    <div class="app-shell__glow app-shell__glow--right"></div>

    <Sidebar class="app-shell__sidebar" />

    <div class="app-shell__main">
      <Header v-if="showHeader" class="app-shell__header" />

      <RouterView v-slot="{ Component, route }">
        <AnimatePresence mode="wait">
          <motion.main
            :key="route.fullPath"
            class="app-shell__content"
            :initial="pageVariants.initial"
            :animate="pageVariants.enter"
            :exit="pageVariants.exit"
          >
            <component :is="Component" />
          </motion.main>
        </AnimatePresence>
      </RouterView>
    </div>

    <PlayerBar class="app-shell__player" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { AnimatePresence, motion } from 'motion-v'
import { RouterView, useRoute } from 'vue-router'
import Sidebar from './components/layout/Sidebar.vue'
import Header from './components/layout/Header.vue'
import PlayerBar from './components/layout/PlayerBar.vue'
import { useThemeStore } from './store/theme'
import { useSettingsStore } from './store/settings'
import { useUserSourceStore } from './stores/userSource'
import { pageVariants } from './lib/motion'

const themeStore = useThemeStore()
const settingsStore = useSettingsStore()
const userSourceStore = useUserSourceStore()
const route = useRoute()

const showHeader = computed(() => route.name !== 'Search')

onMounted(async () => {
  const saved = localStorage.getItem('settings')
  if (saved) {
    try {
      settingsStore.loadSettings(JSON.parse(saved))
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  themeStore.init()

  try {
    await userSourceStore.loadUserSources()
  } catch (error) {
    console.error('Failed to load user sources on app init:', error)
  }

  settingsStore.$subscribe(() => {
    localStorage.setItem('settings', JSON.stringify(settingsStore.settings))
  })
})
</script>

<style lang="scss">
@use './assets/styles/variables.scss';
@use './assets/styles/base.scss';

.app-shell {
  position: relative;
  display: grid;
  grid-template-columns: var(--sidebar-width) minmax(0, 1fr);
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.app-shell__glow {
  position: fixed;
  width: 360px;
  height: 360px;
  border-radius: 50%;
  filter: blur(72px);
  opacity: 0.28;
  pointer-events: none;
}

.app-shell__glow--left {
  top: -120px;
  left: -90px;
  background: rgba(249, 115, 22, 0.18);
}

.app-shell__glow--right {
  top: -130px;
  right: -60px;
  background: rgba(59, 130, 246, 0.16);
}

.app-shell__sidebar {
  position: relative;
  z-index: 3;
}

.app-shell__main {
  position: relative;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding-bottom: calc(var(--player-bar-height) + 10px);
  overflow: hidden;
}

.app-shell__header {
  position: relative;
  z-index: 2;
}

.app-shell__content {
  flex: 1;
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
}

.app-shell__player {
  position: fixed;
  right: 16px;
  bottom: 14px;
  left: calc(var(--sidebar-width) + 16px);
  z-index: 8;
}

@media (max-width: 900px) {
  .app-shell {
    grid-template-columns: 1fr;
  }

  .app-shell__main {
    padding-top: 84px;
    padding-bottom: calc(var(--player-bar-height) + 18px);
  }

  .app-shell__player {
    left: 14px;
    right: 14px;
    bottom: 14px;
  }
}
</style>
