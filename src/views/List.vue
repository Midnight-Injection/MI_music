<template>
  <div class="playlist-page">
    <div class="sidebar">
      <div class="sidebar-header">
        <h3>我的歌单</h3>
        <button class="create-btn" @click="showCreateDialog = true" title="创建新歌单">
          +
        </button>
      </div>
      <div class="playlist-list">
        <div
          v-for="list in playlistStore.playlists"
          :key="list.id"
          class="playlist-item"
          :class="{ active: list.id === playlistStore.currentPlaylistId }"
          @click="selectPlaylist(list.id)"
          @contextmenu.prevent="showPlaylistMenu($event, list)"
        >
          <div class="playlist-icon">{{ getPlaylistIcon(list.id) }}</div>
          <div class="playlist-info">
            <div class="playlist-name">{{ list.name }}</div>
            <div class="playlist-count">{{ list.musics.length }} 首</div>
          </div>
          <button
            v-if="!isDefaultPlaylist(list.id)"
            class="delete-btn"
            @click.stop="deletePlaylist(list.id)"
            title="删除歌单"
          >
            ×
          </button>
        </div>
      </div>
    </div>

    <div class="main-content">
      <div v-if="currentPlaylist" class="playlist-detail">
        <div class="playlist-header">
          <div class="playlist-cover">
            {{ getPlaylistIcon(currentPlaylist.id) }}
          </div>
          <div class="playlist-meta">
            <h1>{{ currentPlaylist.name }}</h1>
            <p>{{ currentPlaylist.musics.length }} 首歌曲</p>
          </div>
          <div class="playlist-actions">
            <button class="action-btn play-all" @click="playAll">
              ▶ 播放全部
            </button>
            <button
              v-if="playlistStore.selectedMusicIds.size > 0"
              class="action-btn danger"
              @click="removeSelected"
            >
              删除选中 ({{ playlistStore.selectedMusicIds.size }})
            </button>
          </div>
        </div>

        <div v-if="currentPlaylist.musics.length === 0" class="empty-state">
          <p>暂无歌曲</p>
        </div>

        <div v-else class="song-list-container">
          <div class="song-list-header">
            <label class="select-all">
              <input
                type="checkbox"
                :checked="isAllSelected"
                @change="toggleSelectAll"
              />
            </label>
            <div class="header-title">歌曲</div>
            <div class="header-artist">歌手</div>
            <div class="header-album">专辑</div>
            <div class="header-duration">时长</div>
            <div class="header-actions">操作</div>
          </div>

          <div class="song-list">
            <div
              v-for="(music, index) in currentPlaylist.musics"
              :key="music.id"
              class="song-item"
              :class="{
                selected: playlistStore.selectedMusicIds.has(music.id),
                playing: isCurrentPlaying(music)
              }"
              draggable="true"
              @dragstart="handleDragStart($event, index)"
              @dragover.prevent="handleDragOver($event, index)"
              @drop="handleDrop($event, index)"
              @contextmenu.prevent="showSongMenu($event, music, index)"
            >
              <div class="drag-handle">⋮⋮</div>
              <label class="song-checkbox">
                <input
                  type="checkbox"
                  :checked="playlistStore.selectedMusicIds.has(music.id)"
                  @change="playlistStore.toggleMusicSelection(music.id)"
                />
              </label>
              <div class="song-title">
                <span class="title-text">{{ music.name }}</span>
                <button
                  class="play-btn"
                  @click="playMusic(music, index)"
                  title="播放"
                >
                  ▶
                </button>
              </div>
              <div class="song-artist">{{ music.artist }}</div>
              <div class="song-album">{{ music.album }}</div>
              <div class="song-duration">{{ formatDuration(music.duration) }}</div>
              <div class="song-actions">
                <button
                  class="icon-btn"
                  @click="showAddToMenu($event, music)"
                  title="添加到歌单"
                >
                  +
                </button>
                <button
                  class="icon-btn"
                  @click="removeMusic(music.id)"
                  title="移除"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showCreateDialog" class="dialog-overlay" @click.self="showCreateDialog = false">
      <div class="dialog">
        <h2>创建歌单</h2>
        <input
          v-model="newPlaylistName"
          type="text"
          placeholder="歌单名称"
          class="input"
          @keyup.enter="handleCreate"
        />
        <div class="dialog-actions">
          <button class="btn cancel" @click="showCreateDialog = false">取消</button>
          <button class="btn confirm" @click="handleCreate">创建</button>
        </div>
      </div>
    </div>

    <div
      v-if="contextMenu.show"
      class="context-menu"
      :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
      @click="hideContextMenu"
    >
      <div
        v-if="contextMenu.type === 'song'"
        class="menu-item"
        @click="playNext"
      >
        ▶ 下一首播放
      </div>
      <div
        v-if="contextMenu.type === 'song'"
        class="menu-item"
        @click="showAddToMenuFromContext"
      >
        + 添加到歌单
      </div>
      <div
        v-if="contextMenu.type === 'song'"
        class="menu-item danger"
        @click="removeMusicFromContext"
      >
        × 从歌单移除
      </div>
      <div
        v-if="contextMenu.type === 'song'"
        class="menu-item"
        @click="viewArtist"
      >
        👤 查看歌手
      </div>
      <div
        v-if="contextMenu.type === 'playlist'"
        class="menu-item danger"
        @click="deletePlaylistFromContext"
      >
        × 删除歌单
      </div>
    </div>

    <div
      v-if="addToMenu.show"
      class="add-to-menu"
      :style="{ top: addToMenu.y + 'px', left: addToMenu.x + 'px' }"
      @click="hideAddToMenu"
    >
      <div class="menu-title">添加到歌单</div>
      <div
        v-for="playlist in targetPlaylists"
        :key="playlist.id"
        class="menu-item"
        @click="addToPlaylist(playlist.id)"
      >
        {{ getPlaylistIcon(playlist.id) }} {{ playlist.name }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { usePlaylistStore } from '../store/playlist'
import { usePlayerStore } from '../store/player'
import type { MusicInfo } from '../types/music'

const playlistStore = usePlaylistStore()
const playerStore = usePlayerStore()

const showCreateDialog = ref(false)
const newPlaylistName = ref('')
const draggedIndex = ref<number | null>(null)
const draggedOverIndex = ref<number | null>(null)

const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
  type: 'song' | 'playlist',
  music: null as MusicInfo | null,
  musicIndex: -1,
  playlist: null as any
})

const addToMenu = ref({
  show: false,
  x: 0,
  y: 0,
  music: null as MusicInfo | null
})

const currentPlaylist = computed(() => {
  return playlistStore.playlists.find(
    p => p.id === playlistStore.currentPlaylistId
  )
})

const isAllSelected = computed(() => {
  if (!currentPlaylist.value) return false
  return currentPlaylist.value.musics.length > 0 &&
    currentPlaylist.value.musics.every(m => playlistStore.selectedMusicIds.has(m.id))
})

const targetPlaylists = computed(() => {
  return playlistStore.playlists.filter(p => p.id !== playlistStore.currentPlaylistId)
})

function getPlaylistIcon(id: string): string {
  switch (id) {
    case 'default': return '🎵'
    case 'love': return '❤️'
    default: return '📋'
  }
}

function isDefaultPlaylist(id: string): boolean {
  return id === 'default' || id === 'love'
}

function selectPlaylist(id: string) {
  playlistStore.setCurrentPlaylist(id)
  playlistStore.clearSelection()
}

function handleCreate() {
  if (newPlaylistName.value.trim()) {
    playlistStore.createPlaylist(newPlaylistName.value.trim())
    newPlaylistName.value = ''
    showCreateDialog.value = false
  }
}

function deletePlaylist(id: string) {
  if (confirm('确定要删除这个歌单吗？')) {
    playlistStore.deletePlaylist(id)
    if (playlistStore.currentPlaylistId === id) {
      playlistStore.setCurrentPlaylist('default')
    }
  }
}

function playAll() {
  if (currentPlaylist.value && currentPlaylist.value.musics.length > 0) {
    playerStore.setPlaylist([...currentPlaylist.value.musics], 0)
  }
}

function playMusic(music: MusicInfo, index: number): void {
  if (currentPlaylist.value) {
    playerStore.setPlaylist([...currentPlaylist.value.musics], index)
  }
}

function isCurrentPlaying(music: MusicInfo): boolean {
  return playerStore.currentMusic?.id === music.id && playerStore.isPlaying
}

function removeMusic(musicId: string) {
  if (currentPlaylist.value) {
    playlistStore.removeMusicFromPlaylist(currentPlaylist.value.id, musicId)
  }
}

function removeSelected() {
  if (currentPlaylist.value) {
    const ids = Array.from(playlistStore.selectedMusicIds)
    playlistStore.batchRemoveFromPlaylist(currentPlaylist.value.id, ids)
    playlistStore.clearSelection()
  }
}

function toggleSelectAll() {
  if (!currentPlaylist.value) return

  if (isAllSelected.value) {
    playlistStore.clearSelection()
  } else {
    playlistStore.selectAll(currentPlaylist.value.musics.map(m => m.id))
  }
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
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

function handleDrop(event: DragEvent, toIndex: number) {
  event.preventDefault()
  if (draggedIndex.value !== null && draggedIndex.value !== toIndex && currentPlaylist.value) {
    playlistStore.reorderMusic(currentPlaylist.value.id, draggedIndex.value, toIndex)
  }
  draggedIndex.value = null
  draggedOverIndex.value = null
}

function showPlaylistMenu(event: MouseEvent, playlist: any) {
  contextMenu.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
    type: 'playlist',
    music: null,
    musicIndex: -1,
    playlist
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
    playlist: null
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
    music
  }
}

function showAddToMenuFromContext() {
  if (contextMenu.value.music) {
    addToMenu.value = {
      show: true,
      x: contextMenu.value.x,
      y: contextMenu.value.y,
      music: contextMenu.value.music
    }
  }
  hideContextMenu()
}

function hideAddToMenu() {
  addToMenu.value.show = false
}

function addToPlaylist(playlistId: string) {
  if (addToMenu.value.music) {
    playlistStore.addMusicToPlaylist(playlistId, addToMenu.value.music.id)
  }
  hideAddToMenu()
}

function playNext() {
  if (contextMenu.value.music) {
    const playlist = [...playerStore.playlist]
    const currentIndex = playerStore.currentIndex
    playlist.splice(currentIndex + 1, 0, contextMenu.value.music!)
    playerStore.setPlaylist(playlist, currentIndex)
  }
  hideContextMenu()
}

function removeMusicFromContext() {
  if (contextMenu.value.music && currentPlaylist.value) {
    playlistStore.removeMusicFromPlaylist(currentPlaylist.value.id, contextMenu.value.music.id)
  }
  hideContextMenu()
}

function viewArtist() {
  if (contextMenu.value.music) {
    alert(`查看歌手: ${contextMenu.value.music.artist}`)
  }
  hideContextMenu()
}

function deletePlaylistFromContext() {
  if (contextMenu.value.playlist) {
    deletePlaylist(contextMenu.value.playlist.id)
  }
  hideContextMenu()
}

function handleClickOutside(event: MouseEvent) {
  if (contextMenu.value.show) {
    hideContextMenu()
  }
  if (addToMenu.value.show) {
    hideAddToMenu()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped lang="scss">
.playlist-page {
  display: flex;
  height: 100%;
  overflow: hidden;

  .sidebar {
    width: 250px;
    background: var(--bg-secondary);
    border-right: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;

    .sidebar-header {
      padding: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border-color);

      h3 {
        font-size: 16px;
        color: var(--text-primary);
        margin: 0;
      }

      .create-btn {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: none;
        background: var(--primary-color);
        color: white;
        font-size: 20px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: opacity 0.2s;

        &:hover {
          opacity: 0.8;
        }
      }
    }

    .playlist-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px;

      .playlist-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        border-radius: 8px;
        cursor: pointer;
        transition: background 0.2s;
        position: relative;

        &:hover {
          background: var(--bg-hover);

          .delete-btn {
            opacity: 1;
          }
        }

        &.active {
          background: var(--primary-color);
          color: white;

          .playlist-count {
            color: rgba(255, 255, 255, 0.8);
          }
        }

        .playlist-icon {
          font-size: 24px;
          flex-shrink: 0;
        }

        .playlist-info {
          flex: 1;
          min-width: 0;

          .playlist-name {
            font-size: 14px;
            font-weight: 500;
            color: inherit;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .playlist-count {
            font-size: 12px;
            color: var(--text-secondary);
          }
        }

        .delete-btn {
          width: 24px;
          height: 24px;
          border-radius: 4px;
          border: none;
          background: rgba(255, 0, 0, 0.2);
          color: #ff4444;
          font-size: 18px;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.2s;
          line-height: 1;

          &:hover {
            background: rgba(255, 0, 0, 0.3);
          }
        }
      }
    }
  }

  .main-content {
    flex: 1;
    overflow-y: auto;
    background: var(--bg-primary);

    .playlist-detail {
      padding: 24px;

      .playlist-header {
        display: flex;
        gap: 24px;
        margin-bottom: 32px;

        .playlist-cover {
          width: 200px;
          height: 200px;
          background: var(--bg-secondary);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 80px;
          flex-shrink: 0;
        }

        .playlist-meta {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;

          h1 {
            font-size: 32px;
            color: var(--text-primary);
            margin: 0 0 8px 0;
          }

          p {
            font-size: 14px;
            color: var(--text-secondary);
            margin: 0;
          }
        }

        .playlist-actions {
          display: flex;
          gap: 12px;
          align-items: flex-start;

          .action-btn {
            padding: 10px 20px;
            border-radius: 4px;
            border: none;
            font-size: 14px;
            cursor: pointer;
            transition: opacity 0.2s;

            &.play-all {
              background: var(--primary-color);
              color: white;
            }

            &.danger {
              background: #ff4444;
              color: white;
            }

            &:hover {
              opacity: 0.8;
            }
          }
        }
      }

      .empty-state {
        text-align: center;
        padding: 60px 20px;
        color: var(--text-secondary);
      }

      .song-list-container {
        background: var(--bg-secondary);
        border-radius: 8px;
        overflow: hidden;

        .song-list-header {
          display: grid;
          grid-template-columns: 40px 40px 1fr 150px 150px 80px 120px;
          gap: 16px;
          padding: 12px 16px;
          background: var(--bg-hover);
          border-bottom: 1px solid var(--border-color);
          font-size: 12px;
          color: var(--text-secondary);
          font-weight: 500;

          .select-all {
            display: flex;
            align-items: center;
            cursor: pointer;

            input[type="checkbox"] {
              cursor: pointer;
            }
          }
        }

        .song-list {
          max-height: calc(100vh - 400px);
          overflow-y: auto;

          .song-item {
            display: grid;
            grid-template-columns: 40px 40px 1fr 150px 150px 80px 120px;
            gap: 16px;
            padding: 12px 16px;
            border-bottom: 1px solid var(--border-color);
            align-items: center;
            transition: background 0.2s;
            cursor: pointer;

            &:hover {
              background: var(--bg-hover);

              .play-btn {
                opacity: 1;
              }

              .song-actions {
                opacity: 1;
              }
            }

            &.selected {
              background: rgba(var(--primary-color-rgb, 66, 133, 244), 0.1);
            }

            &.playing {
              background: rgba(var(--primary-color-rgb, 66, 133, 244), 0.2);

              .title-text {
                color: var(--primary-color);
              }
            }

            .drag-handle {
              color: var(--text-secondary);
              cursor: grab;
              font-size: 12px;
              line-height: 1;
              user-select: none;

              &:active {
                cursor: grabbing;
              }
            }

            .song-checkbox {
              input[type="checkbox"] {
                cursor: pointer;
              }
            }

            .song-title {
              display: flex;
              align-items: center;
              gap: 8px;
              overflow: hidden;

              .title-text {
                font-size: 14px;
                color: var(--text-primary);
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }

              .play-btn {
                opacity: 0;
                padding: 4px 8px;
                border: none;
                background: var(--primary-color);
                color: white;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                transition: opacity 0.2s;
                flex-shrink: 0;
              }
            }

            .song-artist,
            .song-album {
              font-size: 13px;
              color: var(--text-secondary);
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }

            .song-duration {
              font-size: 13px;
              color: var(--text-secondary);
              text-align: right;
            }

            .song-actions {
              display: flex;
              gap: 8px;
              opacity: 0;
              transition: opacity 0.2s;

              .icon-btn {
                width: 28px;
                height: 28px;
                border-radius: 4px;
                border: none;
                background: var(--bg-hover);
                color: var(--text-primary);
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                transition: background 0.2s;

                &:hover {
                  background: var(--primary-color);
                  color: white;
                }
              }
            }
          }
        }
      }
    }
  }

  .dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;

    .dialog {
      background: var(--bg-primary);
      padding: 24px;
      border-radius: 8px;
      width: 400px;

      h2 {
        font-size: 18px;
        color: var(--text-primary);
        margin: 0 0 16px 0;
      }

      .input {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid var(--border-color);
        border-radius: 4px;
        background: var(--bg-secondary);
        color: var(--text-primary);
        margin-bottom: 16px;
        font-size: 14px;
      }

      .dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;

        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;

          &.cancel {
            background: var(--bg-hover);
            color: var(--text-primary);
          }

          &.confirm {
            background: var(--primary-color);
            color: white;
          }
        }
      }
    }
  }

  .context-menu,
  .add-to-menu {
    position: fixed;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 1001;
    min-width: 180px;
    overflow: hidden;

    .menu-title {
      padding: 12px 16px;
      font-size: 12px;
      color: var(--text-secondary);
      border-bottom: 1px solid var(--border-color);
      text-transform: uppercase;
      font-weight: 500;
    }

    .menu-item {
      padding: 12px 16px;
      font-size: 14px;
      color: var(--text-primary);
      cursor: pointer;
      transition: background 0.2s;

      &:hover {
        background: var(--bg-hover);
      }

      &.danger {
        color: #ff4444;

        &:hover {
          background: rgba(255, 68, 68, 0.1);
        }
      }
    }
  }

  .add-to-menu {
    min-width: 200px;
  }
}
</style>
