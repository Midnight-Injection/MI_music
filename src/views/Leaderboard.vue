<template>
  <div class="leaderboard-page page-shell">
    <section class="page-hero glass-panel">
      <div>
        <span class="page-kicker">Trend Watch</span>
        <h1 class="page-title">热门榜单</h1>
        <p class="page-subtitle">
          {{ isLoading
            ? '正在搜索热门歌曲...'
            : hasResults
              ? `已找到 ${leaders.length} 首热门歌曲，双击可直接播放。`
              : '点击歌曲可试听、下载或添加到歌单。' }}
        </p>
      </div>

      <div class="hero-actions">
        <button
          type="button"
          class="hero-action hero-action--primary"
          :disabled="leaders.length === 0 || isPlayingAll"
          @click="playAll"
        >
          {{ isPlayingAll ? '播放中...' : '▶ 播放全部' }}
        </button>
        <button
          type="button"
          class="hero-action hero-action--secondary"
          :disabled="leaders.length === 0"
          @click="refreshLeaderboard"
        >
          {{ isLoading ? '刷新中...' : '↻ 刷新榜单' }}
        </button>
      </div>
    </section>

    <section v-if="isLoading && !leaders.length" class="leaderboard-loading glass-panel section-card">
      <div class="spinner"></div>
      <p>正在搜索热门歌曲...</p>
    </section>

    <section v-else class="leaderboard-table glass-panel section-card">
      <motion.div
        v-for="(item, index) in leaders"
        :key="item.id"
        class="leader-row"
        :class="{
          'is-playing': isCurrentPlaying(item),
          'is-resolving': resolvingId === item.id,
        }"
        :initial="staggeredEnter(index, 12).initial"
        :animate="staggeredEnter(index, 12).animate"
        @dblclick="handlePlay(item)"
        @contextmenu.prevent="showSongMenu($event, item)"
      >
        <div class="leader-row__rank">
          <template v-if="isCurrentPlaying(item)">❚❚</template>
          <template v-else>{{ String(index + 1).padStart(2, '0') }}</template>
        </div>
        <div class="leader-row__meta">
          <strong>{{ item.name }}</strong>
          <span>{{ item.artist }}<template v-if="item.album"> · {{ item.album }}</template></span>
        </div>
        <div class="leader-row__actions">
          <button
            type="button"
            class="row-action row-action--play"
            :title="isCurrentPlaying(item) ? '正在播放' : '播放'"
            :disabled="resolvingId === item.id"
            @click.stop="handlePlay(item)"
          >
            <template v-if="resolvingId === item.id">
              <div class="mini-spinner"></div>
            </template>
            <template v-else-if="isCurrentPlaying(item)">❚❚</template>
            <template v-else>▶</template>
          </button>
          <button
            type="button"
            class="row-action row-action--next"
            title="下一首播放"
            @click.stop="handlePlayNext(item)"
          >
            ↳
          </button>
          <button
            type="button"
            class="row-action row-action--download"
            title="下载"
            :disabled="downloadingId === item.id"
            @click.stop="handleDownload(item)"
          >
            {{ downloadingId === item.id ? '...' : '↓' }}
          </button>
        </div>
      </motion.div>

      <NEmpty v-if="leaders.length === 0 && !isLoading" description="暂无榜单数据，点击刷新试试。" />
    </section>

    <FloatingMenu
      :show="contextMenu.show"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :items="contextMenuItems"
      @select="handleContextMenuSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { motion } from 'motion-v'
import { NEmpty } from 'naive-ui'
import FloatingMenu from '../components/context/FloatingMenu.vue'
import { useTrackDownload } from '../composables/useTrackDownload'
import { staggeredEnter } from '../lib/motion'
import { useSearchService } from '../modules/search/searchService'
import { usePlayerStore } from '../store/player'
import { usePlaylistStore } from '../store/playlist'
import type { ContextMenuItem } from '../types/context-menu'
import type { MusicInfo } from '../types/music'

const playerStore = usePlayerStore()
const playlistStore = usePlaylistStore()
const searchService = useSearchService()
const { downloadTrack } = useTrackDownload()

const leaders = ref<MusicInfo[]>([])
const isLoading = ref(false)
const isPlayingAll = ref(false)
const resolvingId = ref('')
const downloadingId = ref('')
const contextMenu = ref<{
  show: boolean
  x: number
  y: number
  music: MusicInfo | null
}>({
  show: false,
  x: 0,
  y: 0,
  music: null,
})

const hasResults = computed(() => leaders.value.length > 0)

const contextMenuItems = computed<ContextMenuItem[]>(() => [
  { key: 'play', label: '▶ 立即播放' },
  { key: 'play-next', label: '↳ 下一首播放' },
  { key: 'add-to-playlist', label: '+ 添加到歌单' },
  { key: 'download', label: '↓ 下载歌曲' },
])

function isCurrentPlaying(music: MusicInfo): boolean {
  return playerStore.currentMusic?.id === music.id && playerStore.isPlaying
}

async function fetchHotTracks() {
  isLoading.value = true
  try {
    const result = await searchService.runSearch({
      keyword: '热门歌曲 华语',
      channel: 'all',
      page: 1,
      limit: 20,
    })
    leaders.value = result.data.slice(0, 15)
  } catch (error) {
    console.error('[Leaderboard] Failed to fetch hot tracks:', error)
  } finally {
    isLoading.value = false
  }
}

function refreshLeaderboard() {
  void fetchHotTracks()
}

async function handlePlay(music: MusicInfo) {
  resolvingId.value = music.id
  try {
    await playerStore.playFromQueueContext(music)
  } catch (error) {
    console.error('[Leaderboard] Failed to play:', error)
  } finally {
    resolvingId.value = ''
  }
}

function handlePlayNext(music: MusicInfo) {
  const playlist = [...playerStore.playlist]
  const currentIndex = playerStore.currentIndex
  playlist.splice(currentIndex + 1, 0, music)
  playerStore.setPlaylist(playlist, currentIndex)
}

async function playAll() {
  if (!leaders.value.length) return
  isPlayingAll.value = true
  try {
    playerStore.setPlaylist([...leaders.value], 0)
  } finally {
    isPlayingAll.value = false
  }
}

async function handleDownload(music: MusicInfo) {
  downloadingId.value = music.id
  try {
    await downloadTrack(music)
  } catch (error) {
    console.error('[Leaderboard] Failed to download:', error)
  } finally {
    downloadingId.value = ''
  }
}

async function handleAddToPlaylist(music: MusicInfo) {
  try {
    await playlistStore.ensureReady()
    const defaultPlaylist = playlistStore.playlists.find((p) => p.systemKey === 'default')
    if (defaultPlaylist) {
      await playlistStore.addMusicToPlaylist(defaultPlaylist.id, music)
    }
  } catch (error) {
    console.error('[Leaderboard] Failed to add to playlist:', error)
  }
}

function showSongMenu(event: MouseEvent, music: MusicInfo) {
  contextMenu.value = { show: true, x: event.clientX, y: event.clientY, music }
}

function hideContextMenu() {
  contextMenu.value.show = false
}

function handleContextMenuSelect(key: string) {
  const music = contextMenu.value.music
  hideContextMenu()
  if (!music) return

  switch (key) {
    case 'play':
      void handlePlay(music)
      break
    case 'play-next':
      handlePlayNext(music)
      break
    case 'add-to-playlist':
      void handleAddToPlaylist(music)
      break
    case 'download':
      void handleDownload(music)
      break
  }
}

function handleClickOutside() {
  if (contextMenu.value.show) hideContextMenu()
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  void fetchHotTracks()
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped lang="scss">
.leaderboard-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 240px;
  gap: 14px;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.spinner {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  border: 3px solid rgba(255, 255, 255, 0.12);
  border-top-color: rgba(255, 255, 255, 0.7);
  animation: spin 0.8s linear infinite;
}

.mini-spinner {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-top-color: white;
  animation: spin 0.6s linear infinite;
}

.page-hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.hero-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.hero-action {
  padding: 9px 16px;
  border-radius: 12px;
  font-weight: 700;
  font-size: 0.78rem;
  white-space: nowrap;
  cursor: pointer;

  &--primary {
    background: var(--button-primary-gradient);
    color: white;
    box-shadow: var(--button-primary-shadow);
  }

  &--secondary {
    background: var(--pill-secondary-bg);
    border: 1px solid var(--pill-secondary-border);
    color: var(--text-primary);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    box-shadow: none;
  }
}

.leaderboard-table {
  display: grid;
  gap: 10px;
}

.leader-row {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  padding: 14px 18px;
  border-radius: 20px;
  background: var(--panel-muted);
  border: 1px solid var(--border-color);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.14);
  cursor: pointer;
  transition: transform 0.18s ease, background-color 0.18s ease, border-color 0.18s ease;

  &:hover {
    transform: translateY(-1px);
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.12);
  }

  &.is-playing {
    background: color-mix(in srgb, var(--primary-color) 14%, rgba(255, 255, 255, 0.06));
    border-color: var(--pill-primary-border);
    box-shadow: var(--glow-primary);
  }

  &.is-resolving {
    opacity: 0.7;
  }
}

.leader-row__rank {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--text-primary);
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.leader-row__meta {
  min-width: 0;

  strong {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-primary);
    font-size: 0.92rem;
    font-weight: 700;
  }

  span {
    display: block;
    margin-top: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-secondary);
    font-size: 0.78rem;
  }
}

.leader-row__actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.row-action {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-secondary);
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.16s ease, color 0.16s ease, transform 0.16s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--text-primary);
    transform: translateY(-1px);
  }

  &--play {
    background: var(--button-primary-gradient);
    color: white;
    border-color: transparent;
    box-shadow: 0 4px 12px color-mix(in srgb, var(--primary-color) 18%, transparent);

    &:hover {
      color: white;
    }
  }

  &--download {
    background: var(--pill-success-bg);
    border-color: var(--pill-success-border);
    color: #baf7cd;
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    transform: none;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@container (max-width: 760px) {
  .page-hero {
    flex-direction: column;
  }

  .hero-actions {
    width: 100%;
  }

  .leader-row {
    grid-template-columns: 44px minmax(0, 1fr);
    gap: 12px;
    padding: 12px 14px;

    .leader-row__actions {
      grid-column: 1 / -1;
      justify-content: flex-end;
    }
  }
}

@container (max-width: 480px) {
  .leaderboard-table {
    gap: 6px;
  }

  .leader-row {
    grid-template-columns: 36px minmax(0, 1fr);
    gap: 8px;
    padding: 10px 12px;
    border-radius: 14px;
  }

  .leader-row__rank {
    font-size: 1.1rem;
  }

  .leader-row__meta {
    strong {
      font-size: 0.82rem;
    }
    span {
      font-size: 0.72rem;
    }
  }

  .row-action {
    width: 30px;
    height: 30px;
    font-size: 0.72rem;
  }

  .hero-actions {
    width: 100%;
    flex-direction: column;
  }

  .hero-action {
    width: 100%;
    text-align: center;
    justify-content: center;
  }
}
</style>
