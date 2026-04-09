<template>
  <div
    class="app-layout-shell"
    :class="{
      'app-layout-shell--no-rail': !showContextRail,
      'app-layout-shell--no-player': !showPlayerBar,
      'app-layout-shell--mobile': uiMode.isMobile,
      'app-layout-shell--compact': isCompactLayout,
    }"
  >
    <Sidebar v-if="!uiMode.isMobile" class="app-layout-shell__sidebar" />

    <div class="app-layout-shell__main" :class="{ 'app-layout-shell__main--immersive': isPlayerDetail }">
      <Header v-if="showHeader" class="app-layout-shell__header" />

      <RouterView v-slot="{ Component, route }">
        <motion.main
          v-if="!uiMode.isMobile"
          :key="route.fullPath"
          :class="['app-layout-shell__content', { 'app-layout-shell__content--immersive': isPlayerDetail }]"
          :initial="pageMotion.initial"
          :animate="pageMotion.enter"
        >
          <component :is="Component" :key="route.fullPath" />
        </motion.main>
        <main
          v-else
          :key="route.fullPath"
          :class="['app-layout-shell__content', { 'app-layout-shell__content--immersive': isPlayerDetail }]"
        >
          <component :is="Component" :key="route.fullPath" />
        </main>
      </RouterView>
    </div>

    <ContextRail v-if="showContextRail && !uiMode.isMobile" class="app-layout-shell__rail" />

    <div v-if="showPlayerBar && !uiMode.isMobile" class="app-layout-shell__player-slot">
      <PlayerBar class="app-layout-shell__player" />
    </div>

    <!-- Mobile: 迷你播放条 -->
    <MobileMiniPlayer v-if="uiMode.isMobile && !isPlayerDetail" class="app-layout-shell__mini-player" />

    <!-- Mobile: 底部标签栏 -->
    <MobileTabBar v-if="uiMode.isMobile" class="app-layout-shell__tab-bar" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { motion } from 'motion-v'
import { RouterView, useRoute } from 'vue-router'
import ContextRail from './ContextRail.vue'
import Header from './Header.vue'
import MobileMiniPlayer from './MobileMiniPlayer.vue'
import MobileTabBar from './MobileTabBar.vue'
import PlayerBar from './PlayerBar.vue'
import Sidebar from './Sidebar.vue'
import { pageVariants } from '../../lib/motion'
import { useSettingsStore } from '../../store/settings'
import { useUIModeStore } from '../../store/uiMode'

const route = useRoute()
const settingsStore = useSettingsStore()
const uiMode = useUIModeStore()
const windowWidth = ref(window.innerWidth)

function updateWindowWidth() {
  windowWidth.value = window.innerWidth
}

onMounted(() => window.addEventListener('resize', updateWindowWidth))
onUnmounted(() => window.removeEventListener('resize', updateWindowWidth))

const isCompactLayout = computed(() => windowWidth.value <= 920 && !uiMode.isMobile)

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
  --app-layout-shell-panel-radius: var(--window-frame-radius, var(--radius-lg));
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
  height: 100%;
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

.app-layout-shell__player-slot {
  --player-bar-radius: var(--app-layout-shell-panel-radius);
  grid-area: player;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border-radius: var(--app-layout-shell-panel-radius);
  z-index: 8;
}

.app-layout-shell__player {
  min-width: 0;
  min-height: 100%;
  height: 100%;
  border-radius: inherit;
  z-index: 8;
}

// === Mobile 布局 ===
.app-layout-shell--mobile {
  grid-template-columns: 1fr;
  grid-template-rows: 1fr auto auto;
  grid-template-areas:
    'main'
    'player'
    'tabs';
  gap: 0;
  border-radius: 0;
}

.app-layout-shell__mini-player {
  grid-area: player;
}

.app-layout-shell__tab-bar {
  grid-area: tabs;
}

@media (max-width: 1180px) {
  .app-layout-shell:not(.app-layout-shell--mobile),
  .app-layout-shell--no-player:not(.app-layout-shell--no-rail):not(.app-layout-shell--mobile) {
    grid-template-columns: clamp(148px, 18vw, 186px) minmax(0, 1fr);
    grid-template-areas:
      'sidebar main'
      'sidebar player';
  }

  .app-layout-shell--no-player:not(.app-layout-shell--mobile),
  .app-layout-shell--no-player.app-layout-shell--no-rail:not(.app-layout-shell--mobile) {
    grid-template-areas: 'sidebar main';
  }

  .app-layout-shell__rail {
    display: none;
  }
}

@media (max-width: 920px) {
  .app-layout-shell:not(.app-layout-shell--mobile),
  .app-layout-shell--no-player:not(.app-layout-shell--mobile),
  .app-layout-shell--no-rail:not(.app-layout-shell--mobile),
  .app-layout-shell--no-player.app-layout-shell--no-rail:not(.app-layout-shell--mobile) {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr) auto;
    grid-template-areas:
      'sidebar'
      'main'
      'player';
    gap: 6px;
  }

  .app-layout-shell--no-player:not(.app-layout-shell--mobile),
  .app-layout-shell--no-player.app-layout-shell--no-rail:not(.app-layout-shell--mobile) {
    grid-template-rows: auto minmax(0, 1fr);
    grid-template-areas:
      'sidebar'
      'main';
  }

  .app-layout-shell__rail {
    display: none;
  }
}

// === TV 模式布局 ===
[data-ui-mode='tv'] {
  .app-layout-shell,
  .app-layout-shell--no-rail {
    grid-template-columns: 260px minmax(0, 1fr);
    grid-template-areas:
      'sidebar main'
      'sidebar player';
    gap: 16px;
  }

  .app-layout-shell--no-player,
  .app-layout-shell--no-player.app-layout-shell--no-rail {
    grid-template-areas: 'sidebar main';
  }

  .app-layout-shell__rail {
    display: none;
  }

  .app-layout-shell__player-slot {
    border-radius: var(--radius-lg);
    box-shadow: none;
  }

  .app-layout-shell__content {
    padding-bottom: 20px;
    box-shadow: none;
  }

  .app-layout-shell__main {
    box-shadow: none;
  }
}
</style>
