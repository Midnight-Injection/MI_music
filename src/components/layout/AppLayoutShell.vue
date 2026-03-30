<template>
  <div
    class="app-layout-shell"
    :class="{
      'app-layout-shell--no-rail': !showContextRail,
      'app-layout-shell--no-player': !showPlayerBar,
    }"
  >
    <Sidebar class="app-layout-shell__sidebar" />

    <div class="app-layout-shell__main" :class="{ 'app-layout-shell__main--immersive': isPlayerDetail }">
      <Header v-if="showHeader" class="app-layout-shell__header" />

      <RouterView v-slot="{ Component, route }">
        <motion.main
          :key="route.fullPath"
          :class="['app-layout-shell__content', { 'app-layout-shell__content--immersive': isPlayerDetail }]"
          :initial="pageMotion.initial"
          :animate="pageMotion.enter"
        >
          <component :is="Component" :key="route.fullPath" />
        </motion.main>
      </RouterView>
    </div>

    <ContextRail v-if="showContextRail" class="app-layout-shell__rail" />

    <PlayerBar v-if="showPlayerBar" class="app-layout-shell__player" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { motion } from 'motion-v'
import { RouterView, useRoute } from 'vue-router'
import ContextRail from './ContextRail.vue'
import Header from './Header.vue'
import PlayerBar from './PlayerBar.vue'
import Sidebar from './Sidebar.vue'
import { pageVariants } from '../../lib/motion'
import { useSettingsStore } from '../../store/settings'

const route = useRoute()
const settingsStore = useSettingsStore()

const isPlayerDetail = computed(() => route.name === 'PlayerDetail')
const isSongListPage = computed(() => route.name === 'SongList')
const isDownloadPage = computed(() => route.name === 'Download')
const isListPage = computed(() => route.name === 'List')
const isSettingPage = computed(() => route.name === 'Setting')
const showHeader = computed(
  () => route.name !== 'Search'
    && !isPlayerDetail.value
    && !isSongListPage.value
    && !isDownloadPage.value
    && !isListPage.value
    && !isSettingPage.value,
)
const showPlayerBar = computed(() => !isPlayerDetail.value)
const showContextRail = computed(() => !isPlayerDetail.value)
const pageMotion = computed(() => {
  if (!settingsStore.settings.animation) {
    return {
      initial: false,
      enter: { opacity: 1, y: 0, filter: 'blur(0px)' },
      exit: { opacity: 1, y: 0, filter: 'blur(0px)' },
    }
  }

  return pageVariants
})
</script>

<style scoped lang="scss">
.app-layout-shell {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: grid;
  align-items: stretch;
  justify-items: stretch;
  grid-template-columns: clamp(164px, 16vw, 196px) minmax(0, 1fr) clamp(220px, 20vw, 248px);
  grid-template-rows: minmax(0, 1fr) auto;
  grid-template-areas:
    'sidebar main rail'
    'sidebar player rail';
  gap: 10px;
}

.app-layout-shell--no-rail {
  grid-template-columns: clamp(164px, 16vw, 196px) minmax(0, 1fr);
  grid-template-areas:
    'sidebar main'
    'sidebar player';
}

.app-layout-shell--no-player {
  grid-template-rows: minmax(0, 1fr);
}

.app-layout-shell--no-player:not(.app-layout-shell--no-rail) {
  grid-template-areas: 'sidebar main rail';
}

.app-layout-shell--no-player.app-layout-shell--no-rail {
  grid-template-areas: 'sidebar main';
}

.app-layout-shell__sidebar {
  grid-area: sidebar;
  position: relative;
  min-width: 0;
  min-height: 0;
  z-index: 3;
}

.app-layout-shell__main {
  grid-area: main;
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  overflow: hidden;
}

.app-layout-shell__main--immersive {
  grid-template-rows: minmax(0, 1fr);
}

.app-layout-shell__header {
  position: relative;
  z-index: 2;
}

.app-layout-shell__content {
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
  padding-bottom: 10px;
}

.app-layout-shell__content--immersive {
  overflow: hidden;
  padding-bottom: 0;
}

.app-layout-shell__rail {
  grid-area: rail;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  z-index: 2;
}

.app-layout-shell__player {
  grid-area: player;
  min-width: 0;
  z-index: 8;
}

@media (max-width: 1180px) {
  .app-layout-shell,
  .app-layout-shell--no-player:not(.app-layout-shell--no-rail) {
    grid-template-columns: clamp(148px, 18vw, 186px) minmax(0, 1fr);
    grid-template-areas:
      'sidebar main'
      'sidebar player';
  }

  .app-layout-shell--no-player,
  .app-layout-shell--no-player.app-layout-shell--no-rail {
    grid-template-areas: 'sidebar main';
  }
}

@media (max-width: 920px) {
  .app-layout-shell,
  .app-layout-shell--no-player,
  .app-layout-shell--no-rail,
  .app-layout-shell--no-player.app-layout-shell--no-rail {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr) auto;
    grid-template-areas:
      'sidebar'
      'main'
      'player';
  }

  .app-layout-shell--no-player,
  .app-layout-shell--no-player.app-layout-shell--no-rail {
    grid-template-rows: auto minmax(0, 1fr);
    grid-template-areas:
      'sidebar'
      'main';
  }

  .app-layout-shell__sidebar {
    max-height: 280px;
  }
}
</style>
