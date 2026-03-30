<template>
  <div class="download-item" :class="[`status-${item.status}`, { 'is-hover': isHover }]">
    <div class="item-cover">
      <img v-if="item.cover" :src="item.cover" :alt="item.title" />
      <div v-else class="cover-placeholder">{{ item.title.charAt(0) }}</div>
    </div>

    <div class="item-info">
      <div class="item-title" :title="item.title">{{ item.title }}</div>
      <div class="item-artist" :title="item.artist">{{ item.artist }}</div>
      <div v-if="item.album" class="item-album" :title="item.album">{{ item.album }}</div>

      <div v-if="item.status === 'downloading'" class="item-progress">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: item.progress + '%' }"></div>
        </div>
        <div class="progress-details">
          <span class="progress-text">{{ item.progress.toFixed(1) }}%</span>
          <span v-if="item.speed > 0" class="progress-speed">{{ formatSpeed(item.speed) }}</span>
        </div>
      </div>

      <div v-else-if="item.status === 'failed'" class="item-error">
        <span class="error-icon">⚠</span>
        <span class="error-text">{{ item.error || '下载失败' }}</span>
      </div>

      <div v-else-if="item.status === 'completed'" class="item-completed">
        <span class="success-icon">✓</span>
        <span class="completed-text">已完成 · {{ formatFileSize(item.filePath) }}</span>
      </div>

      <div v-else class="item-status">
        <span class="status-icon">{{ getStatusIcon(item.status) }}</span>
        <span class="status-text">{{ getStatusText(item.status) }}</span>
      </div>
    </div>

    <div class="item-actions">
      <button
        v-if="item.status === 'downloading'"
        @click="onPause"
        class="btn-icon app-icon-button secondary"
        title="暂停"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
        </svg>
      </button>

      <button
        v-if="item.status === 'paused'"
        @click="onResume"
        class="btn-icon app-icon-button accent"
        title="继续"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
      </button>

      <button
        v-if="item.status === 'failed'"
        @click="onRetry"
        class="btn-icon app-icon-button warning"
        title="重试"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
        </svg>
      </button>

      <button
        v-if="item.status === 'completed'"
        @click="onOpenFolder"
        class="btn-icon app-icon-button success"
        title="打开文件夹"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
        </svg>
      </button>

      <button
        @click="onCancel"
        class="btn-icon app-icon-button danger"
        title="删除"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { DownloadItem } from '../../types/download'

interface Props {
  item: DownloadItem
}

interface Emits {
  pause: [id: number]
  resume: [id: number]
  cancel: [id: number]
  retry: [id: number]
  openFolder: [item: DownloadItem]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const isHover = ref(false)

function onPause() {
  emit('pause', props.item.id)
}

function onResume() {
  emit('resume', props.item.id)
}

function onCancel() {
  emit('cancel', props.item.id)
}

function onRetry() {
  emit('retry', props.item.id)
}

function onOpenFolder() {
  emit('openFolder', props.item)
}

function formatSpeed(bytes: number): string {
  if (bytes < 1024) return `${bytes.toFixed(1)} B/s`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB/s`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB/s`
}

function formatFileSize(filePath?: string): string {
  if (!filePath) return ''
  const extension = filePath.split('.').pop()?.toUpperCase()
  return extension || 'FILE'
}

function getStatusIcon(status: string): string {
  const iconMap: Record<string, string> = {
    pending: '⏱',
    paused: '⏸',
    downloading: '⬇',
    completed: '✓',
    failed: '✕'
  }
  return iconMap[status] || '⏱'
}

function getStatusText(status: string): string {
  const textMap: Record<string, string> = {
    pending: '等待中',
    downloading: '下载中',
    paused: '已暂停',
    completed: '已完成',
    failed: '失败'
  }
  return textMap[status] || status
}
</script>

<style scoped lang="scss">
.download-item {
  display: flex;
  gap: 12px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  margin-bottom: 8px;
  transition: all 0.2s ease;
  border: 1px solid rgba(255, 255, 255, 0.05);

  &:hover {
    border-color: var(--border-color);
    transform: translateX(2px);
  }

  &.status-failed {
    border-left: 3px solid var(--error-color);
  }

  &.status-completed {
    border-left: 3px solid var(--success-color);
  }

  &.status-downloading {
    border-left: 3px solid var(--primary-color);
  }

  .item-cover {
    width: 56px;
    height: 56px;
    border-radius: 16px;
    overflow: hidden;
    flex-shrink: 0;
    background: var(--bg-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .cover-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: bold;
      color: var(--text-secondary);
      background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
    }
  }

  .item-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;

    .item-title {
      font-size: 15px;
      font-weight: 500;
      color: var(--text-primary);
      margin-bottom: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .item-artist {
      font-size: 13px;
      color: var(--text-secondary);
      margin-bottom: 2px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .item-album {
      font-size: 12px;
      color: var(--text-tertiary);
      margin-bottom: 8px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .item-progress {
      margin-top: 4px;

      .progress-bar {
        height: 6px;
        background: var(--bg-secondary);
        border-radius: 3px;
        overflow: hidden;
        margin-bottom: 6px;

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--primary-color), var(--primary-hover));
          border-radius: 3px;
          transition: width 0.3s ease;
          position: relative;

          &::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(
              90deg,
              transparent,
              rgba(255, 255, 255, 0.3),
              transparent
            );
            animation: shimmer 1.5s infinite;
          }
        }
      }

      .progress-details {
        display: flex;
        justify-content: space-between;
        align-items: center;

        .progress-text {
          font-size: 12px;
          color: var(--text-primary);
          font-weight: 500;
        }

        .progress-speed {
          font-size: 12px;
          color: var(--text-secondary);
        }
      }
    }

    .item-error {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 4px;

      .error-icon {
        font-size: 16px;
      }

      .error-text {
        font-size: 13px;
        color: var(--error-color);
      }
    }

    .item-completed {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 4px;

      .success-icon {
        font-size: 16px;
        color: var(--success-color);
      }

      .completed-text {
        font-size: 13px;
        color: var(--success-color);
      }
    }

    .item-status {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 4px;

      .status-icon {
        font-size: 14px;
      }

      .status-text {
        font-size: 13px;
        color: var(--text-secondary);
      }
    }
  }

  .item-actions {
    display: flex;
    gap: 6px;
    align-items: center;
    opacity: 0;
    transition: opacity 0.2s ease;

    .btn-icon {
      svg {
        width: 18px;
        height: 18px;
      }
    }
  }

  &:hover .item-actions {
    opacity: 1;
  }
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}
</style>
