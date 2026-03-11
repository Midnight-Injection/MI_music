<template>
  <div id="app" class="app-container">
    <Sidebar class="sidebar" />
    <div class="main-content">
      <Header class="header" />
      <main class="content">
        <router-view />
      </main>
    </div>
    <PlayerBar class="player-bar" />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import Sidebar from './components/layout/Sidebar.vue'
import Header from './components/layout/Header.vue'
import PlayerBar from './components/layout/PlayerBar.vue'
import { useThemeStore } from './store/theme'
import { useSettingsStore } from './store/settings'
import { useUserSourceStore } from './stores/userSource'

const themeStore = useThemeStore()
const settingsStore = useSettingsStore()
const userSourceStore = useUserSourceStore()

onMounted(async () => {
  // Load settings from storage
  const saved = localStorage.getItem('settings')
  if (saved) {
    try {
      settingsStore.loadSettings(JSON.parse(saved))
    } catch (e) {
      console.error('Failed to load settings:', e)
    }
  }

  // Initialize theme
  themeStore.init()

  try {
    await userSourceStore.loadUserSources()
  } catch (e) {
    console.error('Failed to load user sources on app init:', e)
  }

  // Watch for settings changes (excluding theme which is handled by themeStore)
  settingsStore.$subscribe(() => {
    localStorage.setItem('settings', JSON.stringify(settingsStore.settings))
  })
})
</script>

<style lang="scss">
@import './assets/styles/variables.scss';
@import './assets/styles/base.scss';

.app-container {
  display: flex;
  height: 100vh;

  .sidebar {
    flex-shrink: 0;
  }

  .main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;

    .header {
      flex-shrink: 0;
    }

    .content {
      flex: 1;
      overflow-y: auto;
      padding-bottom: 70px;
    }
  }

  .player-bar {
    position: fixed;
    bottom: 0;
    left: 200px;
    right: 0;
    z-index: 100;
  }
}
</style>
