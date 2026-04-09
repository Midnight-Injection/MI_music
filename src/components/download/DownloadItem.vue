<template>
  <div class="download-item" :class="[`status-${item.status}`]">
    <div class="item-cover">
      <img v-if="item.cover" :src="item.cover" :alt="item.title" />
      <div v-else class="cover-placeholder">{{ item.title.charAt(0) }}</div>
    </div>

    <div class="item-info">
      <div class="item-title" :title="item.title">{{ item.title }}</div>
      <div class="item-sub">
        <span v-if="item.artist" class="item-artist" :title="item.artist">{{ item.artist }}</span>
        <span v-if="item.album" class="item-album" :title="item.album">{{ item.album }}</span>
      </div>

      <div v-if="item.status === 'downloading'" class="item-progress">
        <NProgress
          type="line"
          :percentage="item.progress"
          :show-indicator="false"
          :color="statusColor"
          rail-color="rgba(255,255,255,0.08)"
          :height="4"
          :border-radius="2"
        />
        <div class="progress-details">
          <span class="progress-text">{{ item.progress.toFixed(1) }}%</span>
          <span v-if="item.speed > 0" class="progress-speed">{{ formatSpeed(item.speed) }}</span>
        </div>
      </div>

      <div v-else class="item-status">
        <span class="status-dot" :class="`dot-${item.status}`"></span>
        <span class="status-label" :class="`label-${item.status}`">
          <template v-if="item.status === 'failed'">{{ item.error || '下载失败' }}</template>
          <template v-else-if="item.status === 'completed'">已完成 · {{ formatFileSize(item.filePath) }}</template>
          <template v-else>{{ getStatusText(item.status) }}</template>
        </span>
      </div>
    </div>

    <div class="item-actions">
      <button
        v-if="item.status === 'downloading'"
        type="button"
        class="action-btn"
        title="暂停"
        @click="onPause"
      >
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
      </button>

      <button
        v-if="item.status === 'paused'"
        type="button"
        class="action-btn action-btn--primary"
        title="继续"
        @click="onResume"
      >
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
      </button>

      <button
        v-if="item.status === 'failed'"
        type="button"
        class="action-btn action-btn--warning"
        title="重试"
        @click="onRetry"
      >
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
      </button>

      <button
        v-if="item.status === 'completed'"
        type="button"
        class="action-btn"
        title="打开文件夹"
        @click="onOpenFolder"
      >
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>
      </button>

      <button
        type="button"
        class="action-btn action-btn--danger"
        title="删除"
        @click="onCancel"
      >
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NProgress } from 'naive-ui'
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

const statusColor = computed(() => {
  const colorMap: Record<string, string> = {
    downloading: '#18a058',
    completed: '#18a058',
    failed: '#d03050',
    paused: '#f0a020',
    pending: '#2080f0'
  }
  return colorMap[props.item.status] || '#2080f0'
})

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

function getStatusText(status: string): string {
  const textMap: Record<string, string> = {
    pending: '等待下载',
    paused: '已暂停',
    downloading: '下载中',
    completed: '已完成',
    failed: '下载失败'
  }
  return textMap[status] || status
}
</script>

<style scoped lang="scss">
.download-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  padding: 12px 14px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid transparent;
  transition: background 0.18s ease, border-color 0.18s ease, transform 0.18s ease;

  & + .download-item {
    margin-top: 6px;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.07);
    border-color: rgba(255, 255, 255, 0.08);
  }

  &.status-downloading {
    border-left: 3px solid #18a058;
  }

  &.status-completed {
    border-left: 3px solid rgba(24, 160, 88, 0.6);
  }

  &.status-failed {
    border-left: 3px solid #d03050;
  }

  &.status-paused {
    border-left: 3px solid #f0a020;
  }

  &.status-pending {
    border-left: 3px solid rgba(32, 128, 240, 0.5);
  }
}

.item-cover {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);

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
    font-size: 1.1rem;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.6);
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--primary-color) 30%, rgba(255, 255, 255, 0.08)),
      color-mix(in srgb, var(--accent-color) 22%, rgba(255, 255, 255, 0.06))
    );
  }
}

.item-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.item-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-primary);
  font-size: 0.86rem;
  font-weight: 600;
  line-height: 1.3;
}

.item-sub {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.item-artist,
.item-album {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.74rem;
  line-height: 1.4;
}

.item-artist {
  color: var(--text-secondary);
}

.item-album {
  color: var(--text-tertiary);
}

.item-sub > :not(:first-child)::before {
  content: '·';
  margin-right: 6px;
  color: var(--text-tertiary);
}

.item-progress {
  margin-top: 4px;

  .progress-details {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 4px;
  }

  .progress-text {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;
  }

  .progress-speed {
    font-size: 0.72rem;
    color: var(--text-tertiary);
    font-variant-numeric: tabular-nums;
  }
}

.item-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
  padding: 4px 0;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;

  &.dot-downloading {
    background: #18a058;
    box-shadow: 0 0 6px rgba(24, 160, 88, 0.5);
    animation: pulse-dot 1.4s ease infinite;
  }

  &.dot-completed {
    background: rgba(24, 160, 88, 0.7);
  }

  &.dot-failed {
    background: #d03050;
    box-shadow: 0 0 6px rgba(208, 48, 80, 0.3);
  }

  &.dot-paused {
    background: #f0a020;
  }

  &.dot-pending {
    background: rgba(32, 128, 240, 0.6);
  }
}

.status-label {
  font-size: 0.74rem;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &.label-downloading {
    color: #63e89b;
  }

  &.label-completed {
    color: var(--text-tertiary);
  }

  &.label-failed {
    color: #ff8d9e;
  }

  &.label-paused {
    color: #f0c060;
  }

  &.label-pending {
    color: var(--text-tertiary);
  }
}

.item-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.action-btn {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.16s ease, border-color 0.16s ease, color 0.16s ease, transform 0.16s ease;

  svg {
    width: 16px;
    height: 16px;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.14);
    color: var(--text-primary);
    transform: translateY(-1px);
  }

  &--primary {
    background: rgba(24, 160, 88, 0.14);
    border-color: rgba(24, 160, 88, 0.2);
    color: #63e89b;

    &:hover {
      background: rgba(24, 160, 88, 0.22);
    }
  }

  &--warning {
    background: rgba(240, 160, 32, 0.12);
    border-color: rgba(240, 160, 32, 0.18);
    color: #f0c060;

    &:hover {
      background: rgba(240, 160, 32, 0.2);
    }
  }

  &--danger {
    color: rgba(255, 255, 255, 0.35);

    &:hover {
      background: rgba(208, 48, 80, 0.14);
      border-color: rgba(208, 48, 80, 0.2);
      color: #ff8d9e;
    }
  }
}

@container (max-width: 960px) {
  .download-item {
    grid-template-columns: auto minmax(0, 1fr);
    align-items: start;

    .item-actions {
      grid-column: 1 / -1;
      justify-content: flex-end;
      padding-top: 4px;
    }
  }
}

@container (max-width: 640px) {
  .download-item {
    gap: 10px;
    padding: 10px 12px;

    .item-cover {
      width: 42px;
      height: 42px;
      border-radius: 12px;
    }
  }
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
</style>
