<template>
  <div class="playlist-page page-shell">
    <aside class="playlist-sidebar glass-panel">
      <div class="playlist-sidebar__header">
        <div>
          <span class="playlist-sidebar__kicker">Library</span>
          <h1>我的歌单</h1>
          <p>{{ playlistStore.playlists.length }} 个歌单，{{ totalTrackCount }} 首歌曲</p>
        </div>
        <button type="button" class="playlist-sidebar__create" @click="showCreateDialog = true" title="创建新歌单">
          <span>+</span>
          <span>新建</span>
        </button>
      </div>

      <div class="playlist-sidebar__list">
        <div
          v-for="list in playlistStore.playlists"
          :key="list.id"
          class="playlist-chip"
          :class="{ 'is-active': list.id === playlistStore.currentPlaylistId }"
          @click="selectPlaylist(list.id)"
          @contextmenu.prevent="showPlaylistMenu($event, list)"
        >
          <span class="playlist-chip__icon">{{ getPlaylistIcon(list.systemKey) }}</span>
          <span class="playlist-chip__content">
            <span class="playlist-chip__name">{{ list.name }}</span>
            <span class="playlist-chip__meta">{{ getPlaylistTypeLabel(list.systemKey) }} · {{ list.musics.length }} 首</span>
          </span>
          <button
            v-if="!isDefaultPlaylist(list.systemKey)"
            type="button"
            class="playlist-chip__delete"
            title="删除歌单"
            @click.stop="deletePlaylist(list.id)"
          >
            ×
          </button>
        </div>
      </div>
    </aside>

    <section class="playlist-main">
      <div
        v-if="operationNotice.message"
        class="playlist-notice"
        :class="`is-${operationNotice.type}`"
      >
        {{ operationNotice.message }}
      </div>

      <div v-if="currentPlaylist" class="playlist-hero glass-panel">
        <div class="playlist-hero__cover">
          <div class="playlist-hero__icon">{{ getPlaylistIcon(currentPlaylist.systemKey) }}</div>
        </div>

        <div class="playlist-hero__meta">
          <span class="playlist-hero__kicker">{{ getPlaylistTypeLabel(currentPlaylist.systemKey) }}</span>
          <h2>{{ currentPlaylist.name }}</h2>
          <p>{{ getPlaylistDescription(currentPlaylist) }}</p>

          <div class="playlist-hero__stats">
            <span class="playlist-stat">
              <strong>{{ currentPlaylist.musics.length }}</strong>
              <span>歌曲</span>
            </span>
            <span class="playlist-stat">
              <strong>{{ formatTotalDuration(currentPlaylist.musics) }}</strong>
              <span>总时长</span>
            </span>
            <span class="playlist-stat">
              <strong>{{ playlistStore.selectedMusicIds.size }}</strong>
              <span>已选中</span>
            </span>
          </div>
        </div>

        <div class="playlist-hero__actions">
          <button
            type="button"
            class="hero-action hero-action--primary"
            :disabled="currentPlaylist.musics.length === 0"
            @click="playAll"
          >
            ▶ 播放全部
          </button>
          <button
            v-if="playlistStore.selectedMusicIds.size > 0"
            type="button"
            class="hero-action hero-action--danger"
            @click="removeSelected"
          >
            删除选中 ({{ playlistStore.selectedMusicIds.size }})
          </button>
        </div>
      </div>

      <div v-if="currentPlaylist && currentPlaylist.musics.length === 0" class="playlist-empty glass-panel">
        <div class="playlist-empty__icon">{{ getPlaylistIcon(currentPlaylist.systemKey) }}</div>
        <h3>这个歌单还是空的</h3>
        <p>去搜索页添加歌曲，或者先创建更多自定义歌单整理音乐。</p>
      </div>

      <section v-else-if="currentPlaylist" class="playlist-library glass-panel">
        <header class="playlist-library__header">
          <div class="playlist-library__heading">
            <span class="playlist-library__eyebrow">Queue</span>
            <h3>歌曲列表</h3>
          </div>

          <div class="playlist-library__summary">
            <span>{{ currentPlaylist.musics.length }} 首</span>
            <span>{{ formatTotalDuration(currentPlaylist.musics) }}</span>
          </div>
        </header>

        <div class="playlist-table__head">
          <label class="playlist-table__check">
            <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" />
          </label>
          <div>歌曲</div>
          <div>歌手</div>
          <div>专辑</div>
          <div class="playlist-table__duration">时长</div>
          <div class="playlist-table__actions">操作</div>
        </div>

        <div class="playlist-table">
          <div
            v-for="(music, index) in currentPlaylist.musics"
            :key="getMusicSelectionKey(music)"
            class="song-row"
            :class="{
              'is-selected': playlistStore.selectedMusicIds.has(getMusicSelectionKey(music)),
              'is-playing': isCurrentPlaying(music),
              'is-drop-target': draggedOverIndex === index,
            }"
            draggable="true"
            @dblclick="playMusic(music, index)"
            @dragstart="handleDragStart($event, index)"
            @dragover.prevent="handleDragOver($event, index)"
            @drop="handleDrop($event, index)"
            @contextmenu.prevent="showSongMenu($event, music, index)"
          >
            <div class="song-row__left">
              <span class="song-row__drag" title="拖拽排序">⋮⋮</span>
              <label class="song-row__check">
                <input
                  type="checkbox"
                  :checked="playlistStore.selectedMusicIds.has(getMusicSelectionKey(music))"
                  @change="playlistStore.toggleMusicSelection(getMusicSelectionKey(music))"
                />
              </label>
            </div>

            <div class="song-row__title">
              <button
                type="button"
                class="song-row__play"
                title="播放"
                @click.stop="playMusic(music, index)"
              >
                {{ isCurrentPlaying(music) ? '❚❚' : '▶' }}
              </button>
              <div class="song-row__title-meta">
                <span class="song-row__name">{{ music.name }}</span>
                <span class="song-row__hint">双击可直接播放</span>
              </div>
            </div>

            <div class="song-row__artist">{{ music.artist }}</div>
            <div class="song-row__album">{{ music.album || '未知专辑' }}</div>
            <div class="song-row__duration">{{ formatDuration(music.duration) }}</div>

            <div class="song-row__actions">
              <button
                type="button"
                class="song-row__action"
                title="添加到歌单"
                @click.stop="showAddToMenu($event, music)"
              >
                + 收藏到
              </button>
              <button
                type="button"
                class="song-row__action song-row__action--danger"
                title="移除"
                @click.stop="removeMusic(music.storageSongId)"
              >
                移除
              </button>
            </div>
          </div>
        </div>
      </section>
    </section>

    <div v-if="showCreateDialog" class="dialog-overlay" @click.self="showCreateDialog = false">
      <div class="dialog glass-panel">
        <h2>创建歌单</h2>
        <p>起一个清晰的名字，后续从搜索结果里就能直接添加进去。</p>
        <input
          v-model="newPlaylistName"
          type="text"
          placeholder="例如：深夜循环 / 通勤精选"
          class="input"
          @keyup.enter="handleCreate"
        />
        <div class="dialog-actions">
          <button type="button" class="btn cancel" @click="showCreateDialog = false">取消</button>
          <button type="button" class="btn confirm" @click="handleCreate">创建</button>
        </div>
      </div>
    </div>

    <FloatingMenu
      :show="contextMenu.show"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :items="contextMenuItems"
      @select="handleContextMenuSelect"
    />

    <FloatingMenu
      :show="addToMenu.show"
      :x="addToMenu.x"
      :y="addToMenu.y"
      :items="addToMenuItems"
      title="添加到歌单"
      compact
      @select="handleAddToMenuSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import FloatingMenu from '../components/context/FloatingMenu.vue'
import { useTrackDownload } from '../composables/useTrackDownload'
import { usePlayerStore } from '../store/player'
import { usePlaylistStore } from '../store/playlist'
import type { ContextMenuItem } from '../types/context-menu'
import type { MusicInfo } from '../types/music'
import type { Playlist } from '../types/playlist'

const playlistStore = usePlaylistStore()
const playerStore = usePlayerStore()
const { downloadTrack } = useTrackDownload()

const showCreateDialog = ref(false)
const newPlaylistName = ref('')
const draggedIndex = ref<number | null>(null)
const draggedOverIndex = ref<number | null>(null)

type ContextMenuType = 'song' | 'playlist'

interface ContextMenuState {
  show: boolean
  x: number
  y: number
  type: ContextMenuType
  music: MusicInfo | null
  musicIndex: number
  playlist: Playlist | null
}

const contextMenu = ref<ContextMenuState>({
  show: false,
  x: 0,
  y: 0,
  type: 'song',
  music: null,
  musicIndex: -1,
  playlist: null,
})

const addToMenu = ref({
  show: false,
  x: 0,
  y: 0,
  music: null as MusicInfo | null,
})
const operationNotice = ref<{
  type: 'success' | 'info' | 'error'
  message: string
}>({
  type: 'info',
  message: '',
})
let operationNoticeTimer: number | null = null

const currentPlaylist = computed(() =>
  playlistStore.playlists.find((playlist) => playlist.id === playlistStore.currentPlaylistId),
)

const totalTrackCount = computed(() =>
  playlistStore.playlists.reduce((count, playlist) => count + playlist.musics.length, 0),
)

const isAllSelected = computed(() => {
  if (!currentPlaylist.value) return false
  return currentPlaylist.value.musics.length > 0
    && currentPlaylist.value.musics.every((music) =>
      playlistStore.selectedMusicIds.has(getMusicSelectionKey(music)),
    )
})

const targetPlaylists = computed(() =>
  playlistStore.playlists.filter((playlist) => playlist.id !== playlistStore.currentPlaylistId),
)
const songMenuItems = computed<ContextMenuItem[]>(() => ([
  { key: 'play', label: '▶ 立即播放' },
  { key: 'play-next', label: '↳ 下一首播放' },
  { key: 'add-to-playlist', label: '+ 添加到歌单' },
  { key: 'download', label: '↓ 下载歌曲' },
  { key: 'remove', label: '× 从歌单移除', danger: true },
  { key: 'view-artist', label: '👤 查看歌手' },
]))
const playlistMenuItems = computed<ContextMenuItem[]>(() => ([
  { key: 'delete-playlist', label: '× 删除歌单', danger: true },
]))
const contextMenuItems = computed<ContextMenuItem[]>(() =>
  contextMenu.value.type === 'song' ? songMenuItems.value : playlistMenuItems.value,
)
const addToMenuItems = computed<ContextMenuItem[]>(() =>
  targetPlaylists.value.map((playlist) => ({
    key: String(playlist.id),
    label: `${getPlaylistIcon(playlist.systemKey)} ${playlist.name}`,
  })),
)

function setOperationNotice(type: 'success' | 'info' | 'error', message: string) {
  operationNotice.value = { type, message }

  if (operationNoticeTimer !== null) {
    window.clearTimeout(operationNoticeTimer)
  }

  operationNoticeTimer = window.setTimeout(() => {
    operationNotice.value.message = ''
    operationNoticeTimer = null
  }, 2600)
}

function getMusicSelectionKey(music: MusicInfo): string {
  return String(music.storageSongId ?? music.id)
}

function getPlaylistIcon(systemKey?: string | null): string {
  switch (systemKey) {
    case 'default':
      return '🎵'
    case 'love':
      return '❤️'
    default:
      return '📋'
  }
}

function getPlaylistTypeLabel(systemKey?: string | null): string {
  switch (systemKey) {
    case 'default':
      return '试听列表'
    case 'love':
      return '我的收藏'
    default:
      return '自定义歌单'
  }
}

function getPlaylistDescription(playlist: Playlist): string {
  if (playlist.description?.trim()) return playlist.description.trim()
  switch (playlist.systemKey) {
    case 'default':
      return '适合快速试播、临时收纳和整理搜索结果。'
    case 'love':
      return '收纳高频循环和长期收藏的曲目。'
    default:
      return '你创建的私人歌单，可以自由整理、拖拽排序和批量管理。'
  }
}

function isDefaultPlaylist(systemKey?: string | null): boolean {
  return systemKey === 'default' || systemKey === 'love'
}

function selectPlaylist(id: number) {
  playlistStore.setCurrentPlaylist(id)
  playlistStore.clearSelection()
}

async function handleCreate() {
  const name = newPlaylistName.value.trim()
  if (!name) return
  await playlistStore.createPlaylist(name)
  newPlaylistName.value = ''
  showCreateDialog.value = false
}

async function deletePlaylist(id: number) {
  if (!confirm('确定要删除这个歌单吗？')) return

  await playlistStore.deletePlaylist(id)
  if (playlistStore.currentPlaylistId === id) {
    playlistStore.setCurrentPlaylist(
      playlistStore.playlists.find((playlist) => playlist.systemKey === 'default')?.id
      ?? playlistStore.playlists[0]?.id
      ?? null,
    )
  }
}

function playAll() {
  if (!currentPlaylist.value?.musics.length) return
  playerStore.setPlaylist([...currentPlaylist.value.musics], 0)
}

function playMusic(_music: MusicInfo, index: number) {
  if (!currentPlaylist.value) return
  playerStore.setPlaylist([...currentPlaylist.value.musics], index)
}

function playMusicFromContext() {
  if (contextMenu.value.musicIndex < 0 || !currentPlaylist.value) return
  playMusic(currentPlaylist.value.musics[contextMenu.value.musicIndex], contextMenu.value.musicIndex)
  hideContextMenu()
}

function isCurrentPlaying(music: MusicInfo): boolean {
  return playerStore.currentMusic?.id === music.id && playerStore.isPlaying
}

async function removeMusic(musicId?: number) {
  if (!currentPlaylist.value || typeof musicId !== 'number') return
  await playlistStore.removeMusicFromPlaylist(currentPlaylist.value.id, musicId)
}

async function removeSelected() {
  if (!currentPlaylist.value) return

  const ids = currentPlaylist.value.musics
    .filter((music) => playlistStore.selectedMusicIds.has(getMusicSelectionKey(music)))
    .map((music) => music.storageSongId)
    .filter((id): id is number => typeof id === 'number')

  await playlistStore.batchRemoveFromPlaylist(currentPlaylist.value.id, ids)
  playlistStore.clearSelection()
}

function toggleSelectAll() {
  if (!currentPlaylist.value) return
  if (isAllSelected.value) {
    playlistStore.clearSelection()
  } else {
    playlistStore.selectAll(currentPlaylist.value.musics.map(getMusicSelectionKey))
  }
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatTotalDuration(musics: MusicInfo[]): string {
  const totalSeconds = musics.reduce((sum, music) => sum + (music.duration || 0), 0)
  const totalMinutes = Math.floor(totalSeconds / 60)

  if (totalMinutes < 60) {
    return `${totalMinutes} 分钟`
  }

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours} 小时 ${minutes} 分`
}

function handleDragStart(event: DragEvent, index: number) {
  draggedIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
  }
}

function handleDragOver(event: DragEvent, index: number) {
  event.preventDefault()
  draggedOverIndex.value = index
}

async function handleDrop(event: DragEvent, toIndex: number) {
  event.preventDefault()
  if (draggedIndex.value !== null && draggedIndex.value !== toIndex && currentPlaylist.value) {
    await playlistStore.reorderMusic(currentPlaylist.value.id, draggedIndex.value, toIndex)
  }
  draggedIndex.value = null
  draggedOverIndex.value = null
}

function showPlaylistMenu(event: MouseEvent, playlist: Playlist) {
  contextMenu.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
    type: 'playlist',
    music: null,
    musicIndex: -1,
    playlist,
  }
}

function showSongMenu(event: MouseEvent, music: MusicInfo, index: number) {
  contextMenu.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
    type: 'song',
    music,
    musicIndex: index,
    playlist: null,
  }
}

function hideContextMenu() {
  contextMenu.value.show = false
}

function showAddToMenu(event: MouseEvent, music: MusicInfo) {
  event.stopPropagation()
  addToMenu.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
    music,
  }
}

function showAddToMenuFromContext() {
  if (contextMenu.value.music) {
    addToMenu.value = {
      show: true,
      x: contextMenu.value.x,
      y: contextMenu.value.y,
      music: contextMenu.value.music,
    }
  }
  hideContextMenu()
}

function hideAddToMenu() {
  addToMenu.value.show = false
}

async function addToPlaylist(playlistId: number) {
  if (addToMenu.value.music) {
    const playlist = playlistStore.playlists.find((item) => item.id === playlistId)
    const result = await playlistStore.addMusicToPlaylist(playlistId, addToMenu.value.music)
    setOperationNotice(
      result.status === 'added' ? 'success' : 'info',
      result.status === 'added'
        ? `已添加到${playlist?.name || '歌单'}`
        : `${playlist?.name || '该歌单'}中已存在这首歌`,
    )
  }
  hideAddToMenu()
}

function handleAddToMenuSelect(key: string) {
  const playlistId = Number(key)
  if (!Number.isFinite(playlistId)) return
  void addToPlaylist(playlistId)
}

function playNext() {
  if (contextMenu.value.music) {
    const playlist = [...playerStore.playlist]
    const currentIndex = playerStore.currentIndex
    playlist.splice(currentIndex + 1, 0, contextMenu.value.music)
    playerStore.setPlaylist(playlist, currentIndex)
  }
  hideContextMenu()
}

async function removeMusicFromContext() {
  if (
    contextMenu.value.music
    && currentPlaylist.value
    && typeof contextMenu.value.music.storageSongId === 'number'
  ) {
    await playlistStore.removeMusicFromPlaylist(
      currentPlaylist.value.id,
      contextMenu.value.music.storageSongId,
    )
  }
  hideContextMenu()
}

function viewArtist() {
  if (contextMenu.value.music) {
    alert(`查看歌手: ${contextMenu.value.music.artist}`)
  }
  hideContextMenu()
}

async function downloadMusicFromContext() {
  const music = contextMenu.value.music
  if (!music) return

  hideContextMenu()
  setOperationNotice('info', `正在准备下载：${music.name}`)

  try {
    const result = await downloadTrack(music)
    setOperationNotice('success', `已开始下载：${result.filename}`)
  } catch (error) {
    console.error('[List] Failed to download music:', error)
    setOperationNotice('error', error instanceof Error ? error.message : '下载失败，请重试')
  }
}

async function deletePlaylistFromContext() {
  if (contextMenu.value.playlist) {
    await deletePlaylist(contextMenu.value.playlist.id)
  }
  hideContextMenu()
}

function handleContextMenuSelect(key: string) {
  switch (key) {
    case 'play':
      playMusicFromContext()
      return
    case 'play-next':
      playNext()
      return
    case 'add-to-playlist':
      showAddToMenuFromContext()
      return
    case 'download':
      void downloadMusicFromContext()
      return
    case 'remove':
      void removeMusicFromContext()
      return
    case 'view-artist':
      viewArtist()
      return
    case 'delete-playlist':
      void deletePlaylistFromContext()
      return
    default:
      hideContextMenu()
  }
}

function handleClickOutside() {
  if (contextMenu.value.show) hideContextMenu()
  if (addToMenu.value.show) hideAddToMenu()
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  if (operationNoticeTimer !== null) {
    window.clearTimeout(operationNoticeTimer)
  }
})
</script>

<style scoped lang="scss">
.playlist-page {
  display: grid;
  grid-template-columns: clamp(178px, 15vw, 194px) minmax(0, 1fr);
  gap: 12px;
  height: 100%;
  min-height: 0;
  padding: 0 12px 0;
  align-items: stretch;
  overflow: visible;
}

.playlist-sidebar,
.playlist-hero,
.playlist-library,
.playlist-empty,
.dialog,
.floating-menu {
  backdrop-filter: blur(22px);
  box-shadow: var(--shadow-md);
}

.playlist-sidebar {
  display: flex;
  flex-direction: column;
  padding: 16px 10px;
  border-radius: var(--radius-md);
  min-height: 0;
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.08), transparent 28%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03));
}

.playlist-sidebar__header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 12px;

  h1 {
    margin: 4px 0 3px;
    font-size: 0.92rem;
    color: var(--text-primary);
    line-height: 1.1;
  }

  p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.68rem;
  }
}

.playlist-sidebar__kicker,
.playlist-hero__kicker,
.playlist-library__eyebrow {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.playlist-sidebar__create {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 9px;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--primary-color), #ff7aac);
  color: white;
  font-weight: 700;
  font-size: 0.7rem;
  box-shadow: 0 16px 30px color-mix(in srgb, var(--primary-color) 26%, transparent);

  span:first-child {
    font-size: 0.92rem;
    line-height: 1;
  }
}

.playlist-sidebar__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 0;
  overflow: auto;
  padding-right: 2px;
}

.playlist-chip {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 9px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
  text-align: left;
  border: 1px solid transparent;
  transition: transform 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease;

  &:hover {
    transform: translateY(-1px);
    background: rgba(255, 255, 255, 0.08);
  }

  &.is-active {
    background: linear-gradient(135deg, rgba(255, 79, 139, 0.18), rgba(124, 82, 255, 0.14));
    border-color: rgba(255, 255, 255, 0.12);
    box-shadow: var(--glow-secondary);
  }
}

.playlist-chip__icon {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.1);
  font-size: 0.92rem;
}

.playlist-chip__content {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.playlist-chip__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.76rem;
  font-weight: 700;
}

.playlist-chip__meta {
  margin-top: 3px;
  color: var(--text-secondary);
  font-size: 0.64rem;
}

.playlist-chip__delete {
  width: 24px;
  height: 24px;
  border-radius: 8px;
  background: rgba(255, 107, 129, 0.12);
  color: #ffc5cf;
  font-size: 0.9rem;
}

.playlist-main {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  min-height: 0;
  height: 100%;
}

.playlist-notice {
  padding: 10px 14px;
  border-radius: 18px;
  font-size: 0.8rem;
  font-weight: 600;
  backdrop-filter: blur(18px);
  box-shadow: var(--shadow-md);

  &.is-success {
    background: rgba(67, 160, 96, 0.2);
    color: #dcffe3;
  }

  &.is-info {
    background: rgba(255, 255, 255, 0.08);
    color: var(--text-primary);
  }

  &.is-error {
    background: rgba(196, 70, 90, 0.22);
    color: #ffd6de;
  }
}

.playlist-hero {
  display: grid;
  grid-template-columns: clamp(88px, 10vw, 108px) minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  padding: 16px;
  border-radius: var(--radius-md);
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at top right, rgba(255, 79, 139, 0.18), transparent 24%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0.035));

  &::before {
    content: '';
    position: absolute;
    inset: auto -60px -90px auto;
    width: 220px;
    height: 220px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(84, 230, 255, 0.16), transparent 70%);
    pointer-events: none;
  }
}

.playlist-hero__cover {
  width: clamp(88px, 10vw, 108px);
  height: clamp(88px, 10vw, 108px);
  border-radius: 18px;
  background: linear-gradient(145deg, rgba(255, 79, 139, 0.22), rgba(124, 82, 255, 0.22));
  display: grid;
  place-items: center;
  box-shadow: 0 24px 48px rgba(7, 3, 17, 0.3);
}

.playlist-hero__icon {
  font-size: clamp(2.3rem, 3.8vw, 2.9rem);
}

.playlist-hero__meta {
  min-width: 0;

  h2 {
    margin: 6px 0 5px;
    font-size: clamp(1.16rem, 1.9vw, 1.52rem);
    line-height: 1;
    color: var(--text-primary);
  }

  p {
    max-width: 40rem;
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.76rem;
    line-height: 1.45;
  }
}

.playlist-hero__stats {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 12px;
}

.playlist-stat {
  display: inline-flex;
  flex-direction: column;
  gap: 2px;
  padding: 7px 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  min-width: 76px;

  strong {
    font-size: 0.8rem;
    color: var(--text-primary);
  }

  span:last-child {
    color: var(--text-secondary);
    font-size: 0.64rem;
  }
}

.playlist-hero__actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: stretch;
}

.hero-action {
  padding: 9px 12px;
  border-radius: 12px;
  font-weight: 700;
  font-size: 0.74rem;
  white-space: nowrap;

  &--primary {
    background: linear-gradient(135deg, var(--primary-color), #ff7aac);
    color: white;
    box-shadow: 0 16px 32px color-mix(in srgb, var(--primary-color) 24%, transparent);
  }

  &--danger {
    background: rgba(255, 107, 129, 0.14);
    color: #ffc5cf;
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    box-shadow: none;
  }
}

.playlist-empty {
  padding: 40px 20px;
  border-radius: var(--radius-md);
  text-align: center;
  background: rgba(255, 255, 255, 0.05);

  h3 {
    margin: 14px 0 8px;
    color: var(--text-primary);
    font-size: 1.12rem;
  }

  p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.9rem;
  }
}

.playlist-empty__icon {
  font-size: 2.5rem;
}

.playlist-library {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 14px;
  border-radius: var(--radius-md);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03));
}

.playlist-library__header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-end;
  margin-bottom: 12px;

  h3 {
    margin: 5px 0 0;
    font-size: 0.92rem;
    color: var(--text-primary);
  }
}

.playlist-library__summary {
  display: inline-flex;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 0.74rem;
}

.playlist-table__head,
.song-row {
  display: grid;
  grid-template-columns: 40px minmax(0, 1.55fr) minmax(84px, 0.78fr) minmax(84px, 0.78fr) 56px 116px;
  gap: 10px;
  align-items: center;
}

.playlist-table__head {
  padding: 0 8px 8px;
  color: var(--text-secondary);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.playlist-table__head > *,
.song-row > * {
  min-width: 0;
}

.playlist-table {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 0;
  overflow: auto;
  padding-right: 2px;
}

.playlist-table__check {
  display: flex;
  justify-content: center;
}

.playlist-table__duration {
  text-align: right;
}

.playlist-table__actions {
  text-align: right;
}

.song-row {
  padding: 9px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid transparent;
  transition: transform 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease;

  &:hover {
    transform: translateY(-1px);
    background: rgba(255, 255, 255, 0.08);
    box-shadow: 0 18px 34px rgba(7, 3, 17, 0.18);
  }

  &.is-selected {
    background: rgba(255, 79, 139, 0.1);
  }

  &.is-playing {
    background: linear-gradient(135deg, rgba(255, 79, 139, 0.16), rgba(124, 82, 255, 0.12));
    border-color: rgba(255, 255, 255, 0.12);
    box-shadow: var(--glow-secondary);
  }

  &.is-drop-target {
    outline: 1px dashed color-mix(in srgb, var(--primary-color) 48%, transparent);
    outline-offset: 3px;
  }
}

.song-row__left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.song-row__drag {
  color: var(--text-secondary);
  cursor: grab;
  user-select: none;
  font-size: 0.86rem;
}

.song-row__title {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.song-row__play {
  width: 30px;
  height: 30px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--primary-color), #ff7aac);
  color: white;
  font-size: 0.74rem;
  box-shadow: 0 10px 20px color-mix(in srgb, var(--primary-color) 18%, transparent);
  flex-shrink: 0;
}

.song-row__title-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.song-row__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-primary);
  font-size: 0.8rem;
  font-weight: 700;
}

.song-row__hint {
  margin-top: 3px;
  color: var(--text-secondary);
  font-size: 0.62rem;
}

.song-row__artist,
.song-row__album {
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.72rem;
}

.song-row__duration {
  color: var(--text-secondary);
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-size: 0.72rem;
}

.song-row__actions {
  display: flex;
  justify-content: flex-end;
  gap: 5px;
  flex-wrap: wrap;
}

.song-row__action {
  padding: 6px 8px;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
  font-weight: 600;
  font-size: 0.68rem;

  &--danger {
    background: rgba(255, 107, 129, 0.12);
    color: #ffc5cf;
  }
}

.dialog-overlay {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(8, 4, 16, 0.56);
  z-index: 50;
  padding: 20px;
}

.dialog {
  width: min(440px, 100%);
  border-radius: var(--radius-md);
  padding: 18px;

  h2 {
    margin: 0;
    color: var(--text-primary);
    font-size: 1.08rem;
  }

  p {
    margin: 7px 0 14px;
    color: var(--text-secondary);
    line-height: 1.6;
    font-size: 0.84rem;
  }
}

.input {
  width: 100%;
  padding: 11px 13px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 14px;
}

.btn {
  padding: 8px 12px;
  border-radius: 10px;
  font-weight: 700;

  &.cancel {
    background: rgba(255, 255, 255, 0.08);
    color: var(--text-primary);
  }

  &.confirm {
    background: linear-gradient(135deg, var(--primary-color), #ff7aac);
    color: white;
  }
}

@media (max-width: 1320px) {
  .playlist-page {
    grid-template-columns: clamp(218px, 24vw, 244px) minmax(0, 1fr);
    gap: 14px;
    padding-inline: 12px;
  }

  .playlist-hero {
    grid-template-columns: 128px minmax(0, 1fr);
  }

  .playlist-hero__actions {
    grid-column: 1 / -1;
    flex-direction: row;
    flex-wrap: wrap;
  }

  .playlist-table__head,
  .song-row {
    grid-template-columns: 48px minmax(0, 1.3fr) minmax(94px, 0.78fr) minmax(94px, 0.78fr) 68px 126px;
  }
}

@media (max-width: 1180px) {
  .playlist-page {
    grid-template-columns: clamp(204px, 28vw, 228px) minmax(0, 1fr);
    padding-inline: 10px;
  }

  .playlist-sidebar {
    padding: 16px 12px;
  }

  .playlist-sidebar__list {
    max-height: none;
  }

  .playlist-hero {
    grid-template-columns: 116px minmax(0, 1fr);
    padding: 18px;
  }

  .playlist-hero__cover {
    width: 116px;
    height: 116px;
  }

  .playlist-hero__meta h2 {
    font-size: clamp(1.38rem, 2.4vw, 1.85rem);
  }

  .playlist-library {
    padding: 16px;
  }

  .playlist-table__head,
  .song-row {
    grid-template-columns: 42px minmax(0, 1.2fr) minmax(82px, 0.72fr) minmax(82px, 0.72fr) 64px 114px;
  }
}

@media (max-width: 1080px) {
  .playlist-table__head,
  .song-row {
    grid-template-columns: 42px minmax(0, 1.45fr) minmax(96px, 0.84fr) 104px;
  }

  .playlist-table__head > :nth-child(4),
  .playlist-table__head > :nth-child(5),
  .song-row__album,
  .song-row__duration {
    display: none;
  }

  .playlist-table__actions {
    text-align: right;
  }
}

@media (max-width: 980px) {
  .playlist-page {
    grid-template-columns: 1fr;
    padding-inline: 8px;
    overflow: auto;
  }

  .playlist-sidebar {
    min-height: auto;
  }

  .playlist-sidebar__list {
    max-height: 240px;
  }

  .playlist-hero {
    grid-template-columns: 104px minmax(0, 1fr);
  }

  .playlist-hero__cover {
    width: 104px;
    height: 104px;
  }

  .playlist-hero__actions {
    grid-column: 1 / -1;
    flex-direction: row;
    flex-wrap: wrap;
  }
}

@media (max-width: 760px) {
  .playlist-page {
    padding: 0 6px 0;
  }

  .playlist-hero {
    grid-template-columns: 1fr;
    padding: 16px;
  }

  .playlist-hero__cover {
    width: 96px;
    height: 96px;
  }

  .playlist-table__head {
    display: none;
  }

  .song-row {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .song-row__left,
  .song-row__duration,
  .song-row__actions {
    justify-content: flex-start;
    text-align: left;
  }

  .song-row__artist,
  .song-row__album {
    padding-left: 46px;
  }
}
</style>
