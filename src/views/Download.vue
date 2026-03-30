<template>
  <div class="download-page page-shell">
    <div class="download-content">
      <div class="queue-panel">
        <div class="queue-panel__head">
          <h1>下载管理</h1>
          <div class="batch-actions">
            <button @click="pauseAll" class="btn app-button secondary compact" :disabled="!hasActiveDownloads">
              暂停全部
            </button>
            <button @click="resumeAll" class="btn app-button accent compact" :disabled="!hasPausedDownloads">
              继续全部
            </button>
            <button @click="clearCompleted" class="btn app-button success compact" :disabled="!hasCompletedDownloads">
              清除已完成
            </button>
            <button @click="clearAll" class="btn app-button danger compact" :disabled="queue.length === 0">
              清空全部
            </button>
          </div>
        </div>

        <div class="queue-tabs">
          <button
            @click="activeTab = 'downloading'"
            :class="['tab', 'app-pill', activeTab === 'downloading' ? 'accent' : 'secondary', { active: activeTab === 'downloading' }]"
          >
            下载中 ({{ downloadQueue.active.length }})
          </button>
          <button
            @click="activeTab = 'pending'"
            :class="['tab', 'app-pill', activeTab === 'pending' ? 'warning' : 'secondary', { active: activeTab === 'pending' }]"
          >
            等待中 ({{ downloadQueue.pending.length }})
          </button>
          <button
            @click="activeTab = 'completed'"
            :class="['tab', 'app-pill', activeTab === 'completed' ? 'success' : 'secondary', { active: activeTab === 'completed' }]"
          >
            已完成 ({{ downloadQueue.completed.length }})
          </button>
          <button
            @click="activeTab = 'failed'"
            :class="['tab', 'app-pill', activeTab === 'failed' ? 'danger' : 'secondary', { active: activeTab === 'failed' }]"
          >
            失败 ({{ downloadQueue.failed.length }})
          </button>
        </div>

        <div class="queue-list" v-auto-animate>
          <DownloadItem
            v-for="item in currentList"
            :key="item.id"
            :item="item"
            @pause="pauseDownload"
            @resume="resumeDownload"
            @cancel="cancelDownload"
            @retry="retryDownload"
            @openFolder="openFolder"
          />
          <div v-if="currentList.length === 0" class="empty-state">
            {{ getEmptyText() }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useDownloadStore } from '../store/download'
import { useSettingsStore } from '../store/settings'
import { invoke } from '@tauri-apps/api/core'
import DownloadItem from '../components/download/DownloadItem.vue'
import type { DownloadItem as DownloadItemType } from '../types/download'

const downloadStore = useDownloadStore()
const settingsStore = useSettingsStore()
const activeTab = ref<'downloading' | 'pending' | 'completed' | 'failed'>('downloading')
let refreshInterval: number | null = null
let lastCompletedCount = 0
let lastFailedCount = 0

const downloadQueue = computed(() => downloadStore.downloadQueue)
const queue = computed(() => downloadStore.queue)
const downloadPath = computed(() => settingsStore.settings.downloadPath.trim())

const currentList = computed(() => {
  switch (activeTab.value) {
    case 'downloading':
      return downloadQueue.value.active
    case 'pending':
      return downloadQueue.value.pending
    case 'completed':
      return downloadQueue.value.completed
    case 'failed':
      return downloadQueue.value.failed
    default:
      return []
  }
})

const hasActiveDownloads = computed(() => downloadQueue.value.active.length > 0)
const hasPausedDownloads = computed(() => queue.value.some((d) => d.status === 'paused'))
const hasCompletedDownloads = computed(() => downloadQueue.value.completed.length > 0)
const maxConcurrentDownloads = computed(() => Math.max(1, settingsStore.settings.maxDownloads))

async function markTaskPending(id: number) {
  try {
    await invoke('update_download_task', {
      id,
      updates: {
        status: 'pending',
      },
    })
  } catch (error) {
    console.error('Failed to mark task pending:', error)
  }
}

async function drainPendingDownloads() {
  if (!downloadPath.value) return

  const availableSlots = Math.max(0, maxConcurrentDownloads.value - downloadQueue.value.active.length)
  if (availableSlots === 0) return

  const pendingTasks = downloadQueue.value.pending.slice(0, availableSlots)
  await Promise.all(pendingTasks.map(async (item) => {
    try {
      await invoke('resume_download', { id: item.id, savePath: downloadPath.value })
      downloadStore.updateDownloadItem(item.id, { status: 'downloading' })
    } catch (error) {
      console.error('Failed to start pending download:', error)
    }
  }))
}

async function loadTasks() {
  try {
    const tasks = await invoke<any[]>('get_download_tasks')

    // Track completed and failed counts for notifications
    const completedCount = tasks.filter((t: any) => t.status === 'completed').length
    const failedCount = tasks.filter((t: any) => t.status === 'failed').length

    // Check for newly completed downloads
    if (completedCount > lastCompletedCount && lastCompletedCount > 0) {
      const newCompletions = completedCount - lastCompletedCount
      showNotification(`下载完成`, `${newCompletions} 个文件下载完成`)
    }

    // Check for newly failed downloads
    if (failedCount > lastFailedCount && lastFailedCount > 0) {
      const newFailures = failedCount - lastFailedCount
      showNotification(`下载失败`, `${newFailures} 个文件下载失败`, 'error')
    }

    lastCompletedCount = completedCount
    lastFailedCount = failedCount

    downloadStore.queue = tasks.map((task: any) => ({
      id: task.id,
      songId: task.song_id,
      title: task.filename.replace(/\.[^/.]+$/, ''),
      artist: '',
      url: task.url,
      filename: task.filename,
      status: task.status,
      progress: task.progress || 0,
      speed: 0,
      error: task.error,
      filePath: task.file_path,
      createdAt: task.created_at,
      updatedAt: task.updated_at
    }))

    await drainPendingDownloads()
  } catch (error) {
    console.error('Failed to load download tasks:', error)
  }
}

function showNotification(title: string, message: string, type: 'success' | 'error' = 'success') {
  // Check if notification permission is granted
  if ('Notification' in window && Notification.permission === 'granted') {
    const icon = type === 'success' ? '✓' : '✕'
    new Notification(`${icon} ${title}`, {
      body: message,
      icon: type === 'success' ? '/icons/success.png' : '/icons/error.png'
    })
  } else if ('Notification' in window && Notification.permission !== 'denied') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        showNotification(title, message, type)
      }
    })
  }

  // Fallback to console for development
  console.log(`[${type.toUpperCase()}] ${title}: ${message}`)
}

function pauseDownload(id: number) {
  invoke('pause_download', { id })
  downloadStore.pauseDownload(id)
}

function resumeDownload(id: number) {
  const item = queue.value.find((d) => d.id === id)
  if (item && downloadPath.value) {
    if (downloadQueue.value.active.length >= maxConcurrentDownloads.value) {
      downloadStore.updateDownloadItem(id, { status: 'pending' })
      void markTaskPending(id)
      return
    }

    invoke('resume_download', { id, savePath: downloadPath.value })
    downloadStore.resumeDownload(id)
  }
}

function cancelDownload(id: number) {
  invoke('delete_download_task', { id })
  downloadStore.cancelDownload(id)
}

function retryDownload(id: number) {
  const item = queue.value.find((d) => d.id === id)
  if (item && downloadPath.value) {
    downloadStore.retryDownload(id)
    if (downloadQueue.value.active.length >= maxConcurrentDownloads.value) {
      void markTaskPending(id)
      return
    }

    invoke('resume_download', { id, savePath: downloadPath.value })
  }
}

async function openFolder(item: DownloadItemType) {
  try {
    if (item.filePath || downloadPath.value) {
      const path = item.filePath || downloadPath.value
      await invoke('open_download_folder', { path })
    }
  } catch (error) {
    console.error('Failed to open folder:', error)
  }
}

function pauseAll() {
  downloadStore.pauseAll()
  downloadQueue.value.active.forEach((item) => {
    invoke('pause_download', { id: item.id })
  })
}

function resumeAll() {
  if (!downloadPath.value) return
  queue.value.forEach((item) => {
    if (item.status === 'paused') {
      downloadStore.updateDownloadItem(item.id, { status: 'pending' })
      void markTaskPending(item.id)
    }
  })
  void drainPendingDownloads()
}

function clearCompleted() {
  downloadQueue.value.completed.forEach((item) => {
    invoke('delete_download_task', { id: item.id })
  })
  downloadStore.clearCompleted()
}

function clearAll() {
  queue.value.forEach((item) => {
    invoke('delete_download_task', { id: item.id })
  })
  downloadStore.clearAll()
}

function getEmptyText(): string {
  const textMap: Record<string, string> = {
    downloading: '暂无下载中的任务',
    pending: '暂无等待中的任务',
    completed: '暂无已完成的下载',
    failed: '暂无失败的下载'
  }
  return textMap[activeTab.value] || '暂无数据'
}

onMounted(() => {
  loadTasks()
  refreshInterval = window.setInterval(loadTasks, 1000)

  // Request notification permission
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>

<style scoped lang="scss">
.download-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  padding-top: 0;

  .download-content {
    flex: 1;
    overflow: hidden;
  }

  .queue-panel {
    height: 100%;
    background: var(--panel-gradient);
    backdrop-filter: var(--glass-blur);
    border-radius: var(--radius-md);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.14);
    box-shadow: var(--shadow-md);

    .queue-panel__head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      padding: 22px 24px 16px;
      border-bottom: 1px solid var(--border-color);

      h1 {
        margin: 0;
        font-size: 24px;
        color: var(--text-primary);
      }
    }

    .batch-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 10px;
    }

      .queue-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      padding: 14px 18px 0;

      .tab {
        font-size: 14px;

        &.active {
          box-shadow: var(--button-accent-shadow);
        }
      }
    }

    .queue-list {
      flex: 1;
      overflow-y: auto;
      padding: 12px;

      .empty-state {
        text-align: center;
        padding: 60px 20px;
        color: var(--text-secondary);
        font-size: 14px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;

        &::before {
          content: '📥';
          font-size: 48px;
          opacity: 0.5;
        }
      }
    }
  }

  .btn {
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  @media (max-width: 960px) {
    .queue-panel {
      .queue-panel__head {
        flex-direction: column;
        align-items: flex-start;
      }

      .batch-actions {
        width: 100%;
        justify-content: flex-start;
      }

      .queue-tabs {
        overflow-x: auto;
        scrollbar-width: none;
      }
    }
  }
}
</style>
