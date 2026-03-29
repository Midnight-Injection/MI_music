import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  DownloadItem,
  DownloadQueue
} from '../types/download'

export const useDownloadStore = defineStore('download', () => {
  const queue = ref<DownloadItem[]>([])
  const activeDownloads = ref<Map<number, number>>(new Map())

  const downloadQueue = computed<DownloadQueue>(() => {
    return {
      active: queue.value.filter((d) => d.status === 'downloading'),
      pending: queue.value.filter((d) => d.status === 'pending'),
      completed: queue.value.filter((d) => d.status === 'completed'),
      failed: queue.value.filter((d) => d.status === 'failed')
    }
  })

  function updateDownloadItem(id: number, updates: Partial<DownloadItem>) {
    const index = queue.value.findIndex((d) => d.id === id)
    if (index !== -1) {
      queue.value[index] = { ...queue.value[index], ...updates }
    }
  }

  function addDownloadItem(item: DownloadItem) {
    queue.value.push(item)
  }

  function removeDownloadItem(id: number) {
    const index = queue.value.findIndex((d) => d.id === id)
    if (index !== -1) {
      queue.value.splice(index, 1)
    }
  }

  function pauseDownload(id: number) {
    updateDownloadItem(id, { status: 'paused' })
    activeDownloads.value.delete(id)
  }

  function resumeDownload(id: number) {
    updateDownloadItem(id, { status: 'downloading' })
  }

  function cancelDownload(id: number) {
    removeDownloadItem(id)
    activeDownloads.value.delete(id)
  }

  function pauseAll() {
    queue.value.forEach((item) => {
      if (item.status === 'downloading') {
        pauseDownload(item.id)
      }
    })
  }

  function resumeAll() {
    queue.value.forEach((item) => {
      if (item.status === 'paused') {
        resumeDownload(item.id)
      }
    })
  }

  function clearCompleted() {
    queue.value = queue.value.filter((d) => d.status !== 'completed')
  }

  function clearAll() {
    queue.value = []
    activeDownloads.value.clear()
  }

  function retryDownload(id: number) {
    const item = queue.value.find((d) => d.id === id)
    if (item && item.status === 'failed') {
      updateDownloadItem(id, {
        status: 'pending',
        progress: 0,
        speed: 0,
        error: undefined
      })
    }
  }

  function setDownloadProgress(id: number, progress: number, speed: number) {
    updateDownloadItem(id, { progress, speed })
    activeDownloads.value.set(id, Date.now())
  }

  function setDownloadError(id: number, error: string) {
    updateDownloadItem(id, { status: 'failed', error })
    activeDownloads.value.delete(id)
  }

  function setDownloadCompleted(id: number, filePath: string) {
    updateDownloadItem(id, {
      status: 'completed',
      progress: 100,
      speed: 0,
      filePath
    })
    activeDownloads.value.delete(id)
  }

  return {
    queue,
    activeDownloads,
    downloadQueue,
    updateDownloadItem,
    addDownloadItem,
    removeDownloadItem,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    pauseAll,
    resumeAll,
    clearCompleted,
    clearAll,
    retryDownload,
    setDownloadProgress,
    setDownloadError,
    setDownloadCompleted
  }
})
