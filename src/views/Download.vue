<template>
  <div class="download-page page-shell">
    <div class="download-content glass-panel">
      <div class="queue-panel">
        <div class="queue-panel__head">
          <div class="queue-panel__title">
            <span class="queue-panel__eyebrow app-pill accent compact">Download Center</span>
            <h1>下载管理</h1>
            <p>集中管理当前任务、等待队列和失败重试，窗口缩小时会自动切换紧凑布局。</p>
          </div>
          <div class="batch-actions">
            <NButton size="small" :disabled="!hasActiveDownloads" @click="pauseAll">
              暂停全部
            </NButton>
            <NButton size="small" type="primary" :disabled="!hasPausedDownloads" @click="resumeAll">
              继续全部
            </NButton>
            <NButton
              size="small"
              type="success"
              :disabled="!hasCompletedDownloads"
              @click="clearCompleted"
            >
              清除已完成
            </NButton>
            <NButton size="small" type="error" :disabled="queue.length === 0" @click="clearAll">
              清空全部
            </NButton>
          </div>
        </div>

        <NTabs v-model:value="activeTab" type="segment" size="small">
          <NTabPane name="downloading" :tab="`下载中 (${downloadQueue.active.length})`">
            <div class="queue-list">
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
              <NEmpty v-if="currentList.length === 0" description="暂无下载中的任务" />
            </div>
          </NTabPane>
          <NTabPane name="pending" :tab="`等待中 (${downloadQueue.pending.length})`">
            <div class="queue-list">
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
              <NEmpty v-if="currentList.length === 0" description="暂无等待中的任务" />
            </div>
          </NTabPane>
          <NTabPane name="completed" :tab="`已完成 (${downloadQueue.completed.length})`">
            <div class="queue-list">
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
              <NEmpty v-if="currentList.length === 0" description="暂无已完成的下载" />
            </div>
          </NTabPane>
          <NTabPane name="failed" :tab="`失败 (${downloadQueue.failed.length})`">
            <div class="queue-list">
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
              <NEmpty v-if="currentList.length === 0" description="暂无失败的下载" />
            </div>
          </NTabPane>
        </NTabs>

        <div class="queue-summary">
          <div class="summary-item">
            <span class="summary-count">{{ queue.length }}</span>
            <span class="summary-label">总任务</span>
          </div>
          <div class="summary-item summary-item--active">
            <span class="summary-count">{{ downloadQueue.active.length }}</span>
            <span class="summary-label">下载中</span>
          </div>
          <div class="summary-item summary-item--pending">
            <span class="summary-count">{{ downloadQueue.pending.length }}</span>
            <span class="summary-label">等待</span>
          </div>
          <div class="summary-item summary-item--done">
            <span class="summary-count">{{ downloadQueue.completed.length }}</span>
            <span class="summary-label">完成</span>
          </div>
          <div class="summary-item summary-item--failed">
            <span class="summary-count">{{ downloadQueue.failed.length }}</span>
            <span class="summary-label">失败</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { NTabs, NTabPane, NButton, NEmpty } from 'naive-ui'
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

  const availableSlots = Math.max(
    0,
    maxConcurrentDownloads.value - downloadQueue.value.active.length
  )
  if (availableSlots === 0) return

  const pendingTasks = downloadQueue.value.pending.slice(0, availableSlots)
  await Promise.all(
    pendingTasks.map(async (item) => {
      try {
        await invoke('resume_download', { id: item.id, savePath: downloadPath.value })
        downloadStore.updateDownloadItem(item.id, { status: 'downloading' })
      } catch (error) {
        console.error('Failed to start pending download:', error)
      }
    })
  )
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
      updatedAt: task.updated_at,
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
      icon: type === 'success' ? '/icons/success.png' : '/icons/error.png',
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
  container-type: inline-size;
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  &.page-shell {
    width: 100%;
    max-width: none;
    margin: 0;
    padding: 0;
    gap: 0;
  }

  .download-content {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-radius: var(--radius-md);
    background: var(--panel-gradient);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.14);
  }

  .queue-panel {
    flex: 1 1 auto;
    min-height: 0;
    border-radius: var(--radius-md);
    display: flex;
    flex-direction: column;
    overflow: hidden;

    .queue-panel__head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 14px;
      padding: 18px 18px 14px;
      border-bottom: 1px solid var(--border-color);
    }

    .queue-panel__title {
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-width: 0;

      p {
        margin: 0;
        color: var(--text-secondary);
        font-size: 0.82rem;
        line-height: 1.6;
        max-width: 640px;
      }
    }

    .queue-panel__eyebrow {
      align-self: flex-start;
    }

    h1 {
      margin: 0;
      font-size: clamp(1.35rem, 2vw, 1.6rem);
      color: var(--text-primary);
      line-height: 1.05;
    }

    .batch-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      flex: 0 0 auto;
    }

    .queue-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      padding: 12px 14px 0;

      .tab {
        font-size: 14px;
        flex: 0 0 auto;

        &.active {
          box-shadow: var(--button-accent-shadow);
        }
      }
    }

    .queue-summary {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 2px;
      padding: 10px 18px 14px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }

    .summary-item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 5px 14px;
      border-radius: 999px;
      background: var(--pill-secondary-bg);
      border: 1px solid var(--pill-secondary-border);

      & + .summary-item {
        margin-left: 2px;
      }

      &--active {
        background: var(--pill-success-bg);
        border-color: var(--pill-success-border);
      }

      &--pending {
        background: var(--pill-warning-bg);
        border-color: var(--pill-warning-border);
      }

      &--done {
        background: rgba(34, 197, 94, 0.1);
        border-color: rgba(74, 222, 128, 0.16);
      }

      &--failed {
        background: var(--pill-danger-bg);
        border-color: var(--pill-danger-border);
      }
    }

    .summary-count {
      font-size: 0.82rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      color: var(--text-primary);
    }

    .summary-label {
      font-size: 0.72rem;
      color: var(--text-secondary);
    }

    .summary-item--active .summary-count {
      color: #63e89b;
    }

    .summary-item--pending .summary-count {
      color: #f0c060;
    }

    .summary-item--done .summary-count {
      color: rgba(24, 160, 88, 0.8);
    }

    .summary-item--failed .summary-count {
      color: #ff8d9e;
    }

    .queue-list {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      padding: 12px;

      :deep(.n-empty) {
        flex: 1 1 0%;
        min-height: 240px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .empty-state {
        flex: 1;
        text-align: center;
        padding: 60px 20px;
        color: var(--text-secondary);
        font-size: 14px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
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

  @container (max-width: 1180px) {
    .queue-panel {
      .queue-panel__head {
        flex-direction: column;
      }

      .batch-actions {
        width: 100%;
        justify-content: flex-start;
      }
    }
  }

  @container (max-width: 960px) {
    .queue-panel {
      .queue-panel__head {
        padding: 16px 14px 12px;
      }

      .queue-tabs,
      .queue-summary {
        padding-inline: 14px;
      }

      .batch-actions {
        width: 100%;
        justify-content: flex-start;
      }
    }
  }

  @container (max-width: 720px) {
    .queue-panel {
      .queue-panel__title p {
        font-size: 0.78rem;
      }

      .batch-actions {
        width: 100%;
        justify-content: flex-start;
      }

      .queue-tabs {
        flex-wrap: nowrap;
        overflow-x: auto;
        padding-bottom: 2px;
      }

      .queue-list {
        padding: 10px;
      }
    }
  }

  @container (max-width: 560px) {
    .queue-panel {
      .queue-panel__head {
        padding: 16px 14px 12px;
      }

      .queue-tabs,
      .queue-summary {
        padding-inline: 10px;
      }

      .queue-summary {
        gap: 6px;
      }

      .btn {
        width: 100%;
      }
    }
  }
  @container (max-width: 480px) {
    .queue-panel {
      .queue-panel__head {
        padding: 12px 10px 10px;
      }

      .batch-actions {
        width: 100%;
        flex-wrap: wrap;

        button {
          flex: 1 1 calc(50% - 4px);
          min-width: 0;
        }
      }

      .queue-summary {
        flex-wrap: wrap;
        justify-content: center;
        gap: 4px;
        padding: 8px 10px 10px;
      }

      .summary-item {
        padding: 4px 10px;
      }

      .queue-list {
        padding: 8px;
      }
    }
  }
}
</style>
