<template>
  <div class="download-settings">
    <div class="settings-header">
      <h2>下载设置</h2>
      <div class="settings-badge" :class="{ active: settings.enabled }">
        {{ settings.enabled ? '已启用' : '已禁用' }}
      </div>
    </div>

    <div class="settings-content">
      <div class="setting-group">
        <div class="setting-item">
          <div class="setting-label">
            <span class="label-text">启用下载</span>
            <span class="label-description">允许下载音乐文件</span>
          </div>
          <label class="toggle-switch">
            <input
              v-model="settings.enabled"
              type="checkbox"
              @change="onSettingsChange"
            />
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div class="setting-group">
        <h3 class="group-title">存储设置</h3>

        <div class="setting-item">
          <div class="setting-label">
            <span class="label-text">保存路径</span>
            <span class="label-description">下载文件的保存位置</span>
          </div>
          <div class="path-selector">
            <input
              v-model="settings.savePath"
              type="text"
              class="path-input"
              placeholder="选择保存路径"
              readonly
              @click="selectSavePath"
            />
            <button @click="selectSavePath" class="btn-icon" title="浏览文件夹">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-label">
            <span class="label-text">文件命名格式</span>
            <span class="label-description">下载文件的命名规则</span>
          </div>
          <select
            v-model="settings.namingFormat"
            class="select-input"
            @change="onSettingsChange"
          >
            <option value="title-artist">歌名 - 歌手</option>
            <option value="artist-title">歌手 - 歌名</option>
            <option value="title-album-artist">歌名 - 专辑 - 歌手</option>
            <option value="artist-album-title">歌手 - 专辑 - 歌名</option>
          </select>
        </div>
      </div>

      <div class="setting-group">
        <h3 class="group-title">下载控制</h3>

        <div class="setting-item">
          <div class="setting-label">
            <span class="label-text">最大并发下载数</span>
            <span class="label-description">同时下载的最大文件数</span>
          </div>
          <div class="slider-control">
            <input
              v-model.number="settings.maxConcurrent"
              type="range"
              class="slider"
              min="1"
              max="10"
              @input="onSettingsChange"
            />
            <span class="slider-value">{{ settings.maxConcurrent }}</span>
          </div>
        </div>
      </div>

      <div class="setting-group">
        <h3 class="group-title">歌词选项</h3>

        <div class="setting-item">
          <div class="setting-label">
            <span class="label-text">下载歌词文件</span>
            <span class="label-description">同时下载 .lrc 格式歌词</span>
          </div>
          <label class="toggle-switch">
            <input
              v-model="settings.downloadLyrics"
              type="checkbox"
              @change="onSettingsChange"
            />
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="setting-item">
          <div class="setting-label">
            <span class="label-text">嵌入歌词</span>
            <span class="label-description">将歌词嵌入到音频文件中</span>
          </div>
          <label class="toggle-switch">
            <input
              v-model="settings.embedLyrics"
              type="checkbox"
              @change="onSettingsChange"
            />
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="setting-item">
          <div class="setting-label">
            <span class="label-text">下载翻译</span>
            <span class="label-description">同时下载歌词翻译</span>
          </div>
          <label class="toggle-switch">
            <input
              v-model="settings.downloadTranslation"
              type="checkbox"
              @change="onSettingsChange"
            />
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="setting-item">
          <div class="setting-label">
            <span class="label-text">下载音译</span>
            <span class="label-description">同时下载罗马音译</span>
          </div>
          <label class="toggle-switch">
            <input
              v-model="settings.downloadRomanization"
              type="checkbox"
              @change="onSettingsChange"
            />
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div class="setting-group">
        <h3 class="group-title">其他选项</h3>

        <div class="setting-item">
          <div class="setting-label">
            <span class="label-text">嵌入封面</span>
            <span class="label-description">将专辑封面嵌入到音频文件中</span>
          </div>
          <label class="toggle-switch">
            <input
              v-model="settings.embedCover"
              type="checkbox"
              @change="onSettingsChange"
            />
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted } from 'vue'
import { open } from '@tauri-apps/plugin-dialog'
import type { DownloadSettings } from '../../types/download'

interface Emits {
  update: [settings: DownloadSettings]
}

const emit = defineEmits<Emits>()

const settings = reactive<DownloadSettings>({
  enabled: true,
  savePath: '',
  namingFormat: 'title-artist',
  maxConcurrent: 3,
  downloadLyrics: true,
  embedCover: true,
  embedLyrics: false,
  downloadTranslation: false,
  downloadRomanization: false
})

onMounted(() => {
  loadSettings()
})

function loadSettings() {
  const saved = localStorage.getItem('downloadSettings')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      Object.assign(settings, parsed)
    } catch (error) {
      console.error('Failed to parse download settings:', error)
    }
  }
}

function saveSettings() {
  localStorage.setItem('downloadSettings', JSON.stringify(settings))
  emit('update', { ...settings })
}

async function selectSavePath() {
  try {
    const selected = await open({
      directory: true,
      multiple: false,
      title: '选择下载保存路径'
    })
    if (selected) {
      settings.savePath = selected as string
      onSettingsChange()
    }
  } catch (error) {
    console.error('Failed to select folder:', error)
  }
}

function onSettingsChange() {
  saveSettings()
}
</script>

<style scoped lang="scss">
.download-settings {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 20px;
  overflow-y: auto;
  max-height: 100%;

  .settings-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--border-color);

    h2 {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }

    .settings-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      background: var(--bg-tertiary);
      color: var(--text-secondary);
      transition: all 0.2s ease;

      &.active {
        background: rgba(82, 196, 26, 0.1);
        color: var(--success-color);
      }
    }
  }

  .settings-content {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .setting-group {
    display: flex;
    flex-direction: column;
    gap: 16px;

    .group-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0;
    }
  }

  .setting-item {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;

    .setting-label {
      flex: 1;
      min-width: 0;

      .label-text {
        display: block;
        font-size: 14px;
        font-weight: 500;
        color: var(--text-primary);
        margin-bottom: 4px;
      }

      .label-description {
        display: block;
        font-size: 12px;
        color: var(--text-secondary);
        line-height: 1.4;
      }
    }

    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
      flex-shrink: 0;

      input {
        opacity: 0;
        width: 0;
        height: 0;

        &:checked + .toggle-slider {
          background-color: var(--primary-color);

          &:before {
            transform: translateX(20px);
          }
        }
      }

      .toggle-slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: var(--bg-tertiary);
        transition: 0.3s;
        border-radius: 24px;

        &:before {
          position: absolute;
          content: '';
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: 0.3s;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      }
    }

    .path-selector {
      display: flex;
      gap: 8px;
      flex: 1;
      max-width: 300px;

      .path-input {
        flex: 1;
        padding: 8px 12px;
        border: 1px solid var(--border-color);
        border-radius: 6px;
        background: var(--bg-primary);
        color: var(--text-primary);
        font-size: 13px;
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          border-color: var(--primary-color);
        }

        &::placeholder {
          color: var(--text-tertiary);
        }
      }

      .btn-icon {
        width: 36px;
        height: 36px;
        border: 1px solid var(--border-color);
        border-radius: 6px;
        background: var(--bg-primary);
        color: var(--text-primary);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;

        svg {
          width: 18px;
          height: 18px;
        }

        &:hover {
          border-color: var(--primary-color);
          color: var(--primary-color);
        }
      }
    }

    .select-input {
      padding: 8px 12px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      background: var(--bg-primary);
      color: var(--text-primary);
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s ease;
      min-width: 200px;

      &:hover {
        border-color: var(--primary-color);
      }

      &:focus {
        outline: none;
        border-color: var(--primary-color);
      }
    }

    .slider-control {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;

      .slider {
        width: 120px;
        height: 4px;
        border-radius: 2px;
        background: var(--bg-tertiary);
        outline: none;
        -webkit-appearance: none;
        cursor: pointer;

        &::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--primary-color);
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          transition: transform 0.2s ease;

          &:hover {
            transform: scale(1.2);
          }
        }

        &::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--primary-color);
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          transition: transform 0.2s ease;

          &:hover {
            transform: scale(1.2);
          }
        }
      }

      .slider-value {
        min-width: 24px;
        text-align: center;
        font-size: 14px;
        font-weight: 600;
        color: var(--primary-color);
      }
    }
  }
}
</style>
