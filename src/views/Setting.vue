<template>
  <div class="setting-page">
    <div class="setting-page__header">
      <h1>设置</h1>
      <div class="setting-page__actions">
        <div class="search-box">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索设置..."
            class="search-input"
          />
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
        </div>
        <div class="action-buttons">
          <button class="action-button" @click="exportSettings" title="导出设置">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
            </svg>
          </button>
          <button class="action-button" @click="importSettings" title="导入设置">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        :class="['tab-button', { active: activeTab === tab.key }]"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Tab Content -->
    <div class="tab-content">
      <!-- Sources Tab -->
      <div v-if="activeTab === 'sources'" class="sources-section">
        <!-- 平台渠道 -->
        <h2>平台渠道</h2>
        <p class="section-description">启用或禁用各音乐平台渠道，用于搜索歌曲列表。</p>

        <div class="source-list">
          <div
            v-for="channel in settingsStore.channelConfigs"
            :key="channel.id"
            class="source-item"
          >
            <div class="source-info">
              <span class="source-name">{{ channel.name }}</span>
              <span class="source-status">
                {{ channel.enabled ? '已启用' : '已禁用' }}
              </span>
            </div>
            <button
              :class="['toggle-btn', { disabled: !channel.enabled }]"
              @click="toggleChannel(channel.id, !channel.enabled)"
            >
              {{ channel.enabled ? '禁用' : '启用' }}
            </button>
          </div>
        </div>

        <!-- 自定义音源 -->
        <div class="user-source-section">
          <div class="section-header">
            <div class="section-title">
              <h2>自定义音源</h2>
              <span class="section-badge">扩展</span>
            </div>
            <div class="header-buttons">
              <button class="import-default-btn" @click="importDefaultSources" :disabled="isImportingDefaults">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                </svg>
                {{ isImportingDefaults ? '导入中...' : '导入默认音源' }}
              </button>
              <button class="import-btn" @click="importUserSource">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                导入音源
              </button>
            </div>
          </div>
          <p class="section-description">导入 JS 自定义音源脚本。参考 lx-music 的方式，当前只选择一个"当前自定义音源"作为全局音源：如果脚本支持搜索，会用于各平台渠道搜索；播放时也会用于补充链接解析。点击"导入默认音源"可批量导入项目自带的音源脚本。</p>

          <div v-if="userSourceStore.isLoading" class="loading-state">
            <div class="loading-spinner"></div>
            <span>加载中...</span>
          </div>

          <div v-else-if="userSourceStore.userSources.length === 0" class="empty-state">
            <div class="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            <p class="empty-title">暂无自定义音源</p>
            <p class="empty-hint">点击上方"导入音源"按钮导入 JS 脚本文件</p>
          </div>

          <div v-else class="user-source-list">
            <div
              v-for="source in userSourceStore.userSources"
              :key="source.id"
              class="user-source-card"
              :class="{ disabled: !source.enabled }"
            >
              <div class="card-header">
                <div class="card-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
                  </svg>
                </div>
                <div class="card-info">
                  <h3 class="card-title">{{ source.name }}</h3>
                  <div class="card-meta">
                    <span v-if="source.author" class="meta-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                      </svg>
                      {{ source.author }}
                    </span>
                    <span v-if="source.version" class="meta-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                      </svg>
                      v{{ source.version }}
                    </span>
                  </div>
                </div>
                <div class="card-status" :class="{ active: source.enabled }">
                  {{ settingsStore.settings.activeUserSourceId === source.id ? '当前音源' : (source.enabled ? '已启用' : '已禁用') }}
                </div>
              </div>
              <p v-if="source.description" class="card-description">{{ source.description }}</p>
              <div class="card-actions">
                <button
                  :class="['action-btn', 'primary', { active: settingsStore.settings.activeUserSourceId === source.id }]"
                  :disabled="!source.enabled"
                  @click="setActiveUserSource(source.id)"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 12l2 2 4-4"/>
                    <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"/>
                  </svg>
                  {{ settingsStore.settings.activeUserSourceId === source.id ? '当前音源' : '设为当前' }}
                </button>
                <button
                  :class="['action-btn', 'toggle', { active: source.enabled }]"
                  @click="toggleUserSource(source.id, !source.enabled)"
                >
                  <svg v-if="source.enabled" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
                  </svg>
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                  </svg>
                  {{ source.enabled ? '禁用' : '启用' }}
                </button>
                <button
                  class="action-btn delete"
                  @click="deleteUserSource(source.id)"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- General Tab -->
      <SettingSection v-if="activeTab === 'general'" title="常规设置">
        <SettingGroup title="界面">
          <SettingItem
            label="语言"
            type="select"
            :model-value="settingsStore.settings.language"
            :options="languageOptions"
            @update:model-value="updateSetting('language', $event)"
          />
          <SettingItem
            label="窗口大小"
            type="select"
            :model-value="settingsStore.settings.windowSize"
            :options="windowSizeOptions"
            @update:model-value="updateSetting('windowSize', $event)"
          />
          <SettingItem
            label="字体大小"
            type="range"
            :model-value="settingsStore.settings.fontSize"
            :min="12"
            :max="20"
            suffix="px"
            @update:model-value="updateSetting('fontSize', $event)"
          />
          <SettingItem
            label="启用动画"
            type="checkbox"
            :model-value="settingsStore.settings.animation"
            @update:model-value="updateSetting('animation', $event)"
          />
        </SettingGroup>
      </SettingSection>

      <!-- Player Tab -->
      <SettingSection v-if="activeTab === 'player'" title="播放器设置">
        <SettingGroup title="播放">
          <SettingItem
            label="启动时自动播放"
            type="checkbox"
            :model-value="settingsStore.settings.startupAutoPlay"
            @update:model-value="updateSetting('startupAutoPlay', $event)"
          />
          <SettingItem
            label="默认播放模式"
            type="select"
            :model-value="settingsStore.settings.defaultPlayMode"
            :options="playModeOptions"
            @update:model-value="updateSetting('defaultPlayMode', $event)"
          />
          <SettingItem
            label="音频质量"
            type="select"
            :model-value="settingsStore.settings.audioQuality"
            :options="audioQualityOptions"
            @update:model-value="updateSetting('audioQuality', $event)"
          />
          <SettingItem
            label="音量"
            type="range"
            :model-value="Math.round(settingsStore.settings.volume * 100)"
            :min="0"
            :max="100"
            suffix="%"
            @update:model-value="updateSetting('volume', $event / 100)"
          />
          <SettingItem
            label="播放失败时自动跳过"
            type="checkbox"
            :model-value="settingsStore.settings.autoSkipOnError"
            @update:model-value="updateSetting('autoSkipOnError', $event)"
          />
        </SettingGroup>
      </SettingSection>

      <!-- Lyrics Tab -->
      <SettingSection v-if="activeTab === 'lyrics'" title="歌词设置">
        <SettingGroup title="显示">
          <SettingItem
            label="显示歌词"
            type="checkbox"
            :model-value="settingsStore.settings.lyricShow"
            @update:model-value="updateSetting('lyricShow', $event)"
          />
          <SettingItem
            label="显示翻译"
            type="checkbox"
            :model-value="settingsStore.settings.showTranslation"
            @update:model-value="updateSetting('showTranslation', $event)"
          />
          <SettingItem
            label="显示注音"
            type="checkbox"
            :model-value="settingsStore.settings.showRomanization"
            @update:model-value="updateSetting('showRomanization', $event)"
          />
          <SettingItem
            label="歌词字体大小"
            type="range"
            :model-value="settingsStore.settings.lyricFontSize"
            :min="12"
            :max="24"
            suffix="px"
            @update:model-value="updateSetting('lyricFontSize', $event)"
          />
          <SettingItem
            label="歌词位置"
            type="select"
            :model-value="settingsStore.settings.lyricPosition"
            :options="lyricPositionOptions"
            @update:model-value="updateSetting('lyricPosition', $event)"
          />
        </SettingGroup>
      </SettingSection>

      <!-- Download Tab -->
      <SettingSection v-if="activeTab === 'download'" title="下载设置">
        <SettingGroup title="下载">
          <SettingItem
            label="启用下载"
            type="checkbox"
            :model-value="settingsStore.settings.downloadEnabled"
            @update:model-value="updateSetting('downloadEnabled', $event)"
          />
          <SettingItem
            label="下载路径"
            type="path"
            :model-value="settingsStore.settings.downloadPath"
            placeholder="选择下载目录"
            @update:model-value="updateSetting('downloadPath', $event)"
            @browse="selectDownloadPath"
          />
          <SettingItem
            label="文件命名格式"
            type="text"
            :model-value="settingsStore.settings.fileNaming"
            placeholder="{artist} - {title}"
            @update:model-value="updateSetting('fileNaming', $event)"
          />
          <SettingItem
            label="同时下载数"
            type="range"
            :model-value="settingsStore.settings.maxDownloads"
            :min="1"
            :max="5"
            @update:model-value="updateSetting('maxDownloads', $event)"
          />
          <SettingItem
            label="下载歌词"
            type="checkbox"
            :model-value="settingsStore.settings.downloadLyrics"
            @update:model-value="updateSetting('downloadLyrics', $event)"
          />
        </SettingGroup>
      </SettingSection>

      <!-- Theme Tab -->
      <SettingSection v-if="activeTab === 'theme'" title="主题设置">
        <SettingGroup title="外观">
          <SettingItem
            label="主题模式"
            type="select"
            :model-value="settingsStore.settings.themeMode"
            :options="themeModeOptions"
            @update:model-value="updateSetting('themeMode', $event)"
          />
          <SettingItem
            label="主题颜色"
            type="color-palette"
            :model-value="settingsStore.settings.themeColor"
            :options="themeColors"
            @update:model-value="updateSetting('themeColor', $event)"
          />
          <SettingItem
            v-if="settingsStore.settings.themeColor === 'custom'"
            label="自定义颜色"
            type="color"
            :model-value="settingsStore.settings.customColor"
            @update:model-value="updateSetting('customColor', $event)"
          />
        </SettingGroup>
      </SettingSection>

      <!-- Network Tab -->
      <SettingSection v-if="activeTab === 'network'" title="网络设置">
        <SettingGroup title="代理">
          <SettingItem
            label="启用代理"
            type="checkbox"
            :model-value="settingsStore.settings.proxyEnabled"
            @update:model-value="updateSetting('proxyEnabled', $event)"
          />
          <SettingItem
            label="代理主机"
            type="text"
            :model-value="settingsStore.settings.proxyHost"
            :disabled="!settingsStore.settings.proxyEnabled"
            placeholder="127.0.0.1"
            @update:model-value="updateSetting('proxyHost', $event)"
          />
          <SettingItem
            label="代理端口"
            type="number"
            :model-value="settingsStore.settings.proxyPort"
            :disabled="!settingsStore.settings.proxyEnabled"
            :min="1"
            :max="65535"
            @update:model-value="updateSetting('proxyPort', $event)"
          />
        </SettingGroup>
      </SettingSection>

      <!-- Sync Tab -->
      <SettingSection v-if="activeTab === 'sync'" title="同步设置">
        <SettingGroup title="同步">
          <SettingItem
            label="同步模式"
            type="select"
            :model-value="settingsStore.settings.syncMode"
            :options="syncModeOptions"
            @update:model-value="updateSetting('syncMode', $event)"
          />
          <SettingItem
            v-if="settingsStore.settings.syncMode !== 'disabled'"
            label="主机地址"
            type="text"
            :model-value="settingsStore.settings.syncHost"
            placeholder="localhost"
            @update:model-value="updateSetting('syncHost', $event)"
          />
          <SettingItem
            v-if="settingsStore.settings.syncMode !== 'disabled'"
            label="端口"
            type="number"
            :model-value="settingsStore.settings.syncPort"
            :min="1"
            :max="65535"
            @update:model-value="updateSetting('syncPort', $event)"
          />
        </SettingGroup>
      </SettingSection>

      <!-- About Tab -->
      <div v-if="activeTab === 'about'" class="about-section">
        <h2>关于</h2>
        <div class="about-info">
          <div class="about-item">
            <span class="about-label">版本</span>
            <span class="about-value">1.0.0</span>
          </div>
          <div class="about-item">
            <span class="about-label">作者</span>
            <span class="about-value">Jiyu Music</span>
          </div>
          <div class="about-item">
            <span class="about-label">许可证</span>
            <span class="about-value">MIT</span>
          </div>
        </div>
        <div class="about-links">
          <a href="#" class="about-link">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            GitHub
          </a>
        </div>
        <div class="reset-section">
          <button class="reset-btn" @click="resetAllSettings">
            重置所有设置
          </button>
        </div>
      </div>
    </div>

    <!-- Toast Notification -->
    <Transition name="toast">
      <div v-if="toast.show" :class="['toast', `toast--${toast.type}`]">
        {{ toast.message }}
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useSettingsStore } from '../store/settings'
import { useUserSourceStore } from '../stores/userSource'
import SettingItem from '../components/settings/SettingItem.vue'
import SettingGroup from '../components/settings/SettingGroup.vue'
import SettingSection from '../components/settings/SettingSection.vue'
import { open } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'
import { save } from '@tauri-apps/plugin-dialog'

const settingsStore = useSettingsStore()
const userSourceStore = useUserSourceStore()

const activeTab = ref('general')
const searchQuery = ref('')
const isImportingDefaults = ref(false)
const toast = ref({
  show: false,
  message: '',
  type: 'success' as 'success' | 'error' | 'info'
})

// Tab definitions
const tabs = [
  { key: 'general', label: '常规' },
  { key: 'player', label: '播放器' },
  { key: 'lyrics', label: '歌词' },
  { key: 'download', label: '下载' },
  { key: 'theme', label: '主题' },
  { key: 'network', label: '网络' },
  { key: 'sync', label: '同步' },
  { key: 'sources', label: '渠道 / 音源' },
  { key: 'about', label: '关于' }
]

// Option definitions
const languageOptions = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'zh-TW', label: '繁體中文' },
  { value: 'en-US', label: 'English' }
]

const windowSizeOptions = [
  { value: 'small', label: '小' },
  { value: 'medium', label: '中' },
  { value: 'large', label: '大' },
  { value: 'custom', label: '自定义' }
]

const playModeOptions = [
  { value: 'loop', label: '列表循环' },
  { value: 'single', label: '单曲循环' },
  { value: 'random', label: '随机播放' }
]

const audioQualityOptions = [
  { value: 'standard', label: '标准' },
  { value: 'high', label: '高品质' },
  { value: 'lossless', label: '无损' }
]

const lyricPositionOptions = [
  { value: 'top', label: '顶部' },
  { value: 'center', label: '居中' },
  { value: 'bottom', label: '底部' }
]

const themeModeOptions = [
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
  { value: 'auto', label: '自动' }
]

const syncModeOptions = [
  { value: 'disabled', label: '禁用' },
  { value: 'server', label: '服务器模式' },
  { value: 'client', label: '客户端模式' }
]

const themeColors = [
  { value: 'green', label: '绿色', color: '#1db954' },
  { value: 'blue', label: '蓝色', color: '#007bff' },
  { value: 'black', label: '黑色', color: '#000000' },
  { value: 'purple', label: '紫色', color: '#9b59b6' },
  { value: 'orange', label: '橙色', color: '#e67e22' },
  { value: 'pink', label: '粉色', color: '#e91e63' }
]

// Toast notification
function showToast(message: string, type: 'success' | 'error' | 'info' = 'success') {
  toast.value = { show: true, message, type }
  setTimeout(() => {
    toast.value.show = false
  }, 3000)
}

// Update setting
function updateSetting(key: string, value: any) {
  settingsStore.updateSetting(key as any, value)
  showToast('设置已保存')
}

// Toggle channel
function toggleChannel(id: string, enabled: boolean) {
  settingsStore.updateChannelConfig(id, enabled)
  showToast(enabled ? '渠道已启用' : '渠道已禁用')
}

// Import user source
async function importUserSource() {
  try {
    const source = await userSourceStore.importSource()
    if (source && !settingsStore.settings.activeUserSourceId) {
      settingsStore.updateSetting('activeUserSourceId', source.id)
    }
    showToast('自定义音源导入成功')
  } catch (error) {
    console.error('Failed to import user source:', error)
    const message = error instanceof Error ? error.message : String(error)
    showToast(`导入自定义音源失败: ${message}`, 'error')
  }
}

// Import default sources
async function importDefaultSources() {
  if (isImportingDefaults.value) return
  isImportingDefaults.value = true

  // Check if running in Tauri context
  const isTauriEnv = typeof window !== 'undefined' && '__TAURI__' in window

  if (!isTauriEnv) {
    showToast('请在 Tauri 桌面应用中使用此功能', 'error')
    isImportingDefaults.value = false
    return
  }

  try {
    const { invoke } = await import('@tauri-apps/api/core')
    const imported = await invoke<{ id: string; name: string }[]>('import_default_sources')

    if (imported && imported.length > 0) {
      // Reload user sources
      await userSourceStore.loadUserSources(true)

      // Set first imported source as active if no active source
      if (!settingsStore.settings.activeUserSourceId && imported.length > 0) {
        settingsStore.updateSetting('activeUserSourceId', imported[0].id)
      }

      showToast(`成功导入 ${imported.length} 个默认音源`)
    } else {
      showToast('没有找到新的默认音源可导入', 'info')
    }
  } catch (error) {
    console.error('Failed to import default sources:', error)
    const message = error instanceof Error ? error.message : String(error)
    showToast(`导入默认音源失败: ${message}`, 'error')
  } finally {
    isImportingDefaults.value = false
  }
}

// Toggle user source
async function setActiveUserSource(id: string) {
  const source = userSourceStore.userSources.find(item => item.id === id)
  if (!source || !source.enabled) {
    showToast('请先启用该自定义音源', 'error')
    return
  }
  settingsStore.updateSetting('activeUserSourceId', id)
  showToast('当前自定义音源已切换')
}

async function toggleUserSource(id: string, enabled: boolean) {
  try {
    await userSourceStore.toggleSource(id, enabled)

    if (enabled && !settingsStore.settings.activeUserSourceId) {
      settingsStore.updateSetting('activeUserSourceId', id)
    }

    if (!enabled && settingsStore.settings.activeUserSourceId === id) {
      const fallback = userSourceStore.userSources.find(source => source.id !== id && source.enabled)
      settingsStore.updateSetting('activeUserSourceId', fallback?.id || '')
    }

    showToast(enabled ? '自定义音源已启用' : '自定义音源已禁用')
  } catch (error) {
    console.error('Failed to toggle user source:', error)
    showToast('操作失败', 'error')
  }
}

// Delete user source
async function deleteUserSource(id: string) {
  if (confirm('确定要删除这个自定义音源吗？')) {
    try {
      await userSourceStore.deleteSource(id)
      if (settingsStore.settings.activeUserSourceId === id) {
        const fallback = userSourceStore.userSources.find(source => source.id !== id && source.enabled)
        settingsStore.updateSetting('activeUserSourceId', fallback?.id || '')
      }
      showToast('自定义音源已删除')
    } catch (error) {
      console.error('Failed to delete user source:', error)
      showToast('删除失败', 'error')
    }
  }
}

// Select download path using Tauri dialog
async function selectDownloadPath() {
  try {
    const selected = await open({
      directory: true,
      multiple: false,
      title: '选择下载路径'
    })

    if (selected && typeof selected === 'string') {
      settingsStore.updateSetting('downloadPath', selected)
      showToast('下载路径已更新')
    }
  } catch (error) {
    console.error('Failed to select directory:', error)
    showToast('选择路径失败', 'error')
  }
}

// Export settings to JSON file
async function exportSettings() {
  try {
    const settings = JSON.stringify(settingsStore.settings, null, 2)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `jiyu-music-settings-${timestamp}.json`

    const savePath = await save({
      defaultPath: filename,
      filters: [{
        name: 'JSON',
        extensions: ['json']
      }]
    })

    if (savePath && typeof savePath === 'string') {
      await writeTextFile(savePath, settings)
      showToast('设置已成功导出')
    }
  } catch (error) {
    console.error('Failed to export settings:', error)
    showToast('导出设置失败', 'error')
  }
}

// Import settings from JSON file
async function importSettings() {
  try {
    const filePath = await open({
      multiple: false,
      title: '导入设置',
      filters: [{
        name: 'JSON',
        extensions: ['json']
      }]
    })

    if (filePath && typeof filePath === 'string') {
      const content = await readTextFile(filePath)
      const importedSettings = JSON.parse(content)

      // Validate and merge settings
      settingsStore.updateSettings(importedSettings)
      applyTheme()

      showToast('设置已成功导入')
    }
  } catch (error) {
    console.error('Failed to import settings:', error)
    showToast('导入设置失败', 'error')
  }
}

// Reset all settings to default
function resetAllSettings() {
  if (confirm('确定要重置所有设置吗？此操作无法撤销。')) {
    settingsStore.resetSettings()
    applyTheme()
    showToast('设置已重置为默认值', 'info')
  }
}

// Apply theme changes
function applyTheme() {
  const { themeMode, themeColor, customColor } = settingsStore.settings
  const root = document.documentElement

  // Set theme mode
  if (themeMode === 'auto' || themeMode === undefined) {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
  } else {
    root.setAttribute('data-theme', themeMode as string)
  }

  // Set primary color
  let primaryColor = '#1db954'
  if (themeColor === 'custom' && customColor) {
    primaryColor = customColor
  } else {
    const colorObj = themeColors.find(c => c.value === themeColor)
    if (colorObj) {
      primaryColor = colorObj.color
    }
  }

  root.style.setProperty('--primary-color', primaryColor)
  root.style.setProperty('--primary-hover', adjustColor(primaryColor, 20))
}

function adjustColor(color: string, amount: number): string {
  const hex = color.replace('#', '')
  const num = parseInt(hex, 16)
  const r = Math.min(255, Math.max(0, (num >> 16) + amount))
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount))
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

// Auto-save settings on change
watch(() => settingsStore.settings, (newSettings) => {
  localStorage.setItem('settings', JSON.stringify(newSettings))
}, { deep: true })

onMounted(async () => {
  // Load settings from localStorage
  const saved = localStorage.getItem('settings')
  if (saved) {
    try {
      settingsStore.loadSettings(JSON.parse(saved))
    } catch (e) {
      console.error('Failed to load settings:', e)
    }
  }

  // Load user sources from backend
  await userSourceStore.loadUserSources()

  // Apply theme on mount
  applyTheme()
})
</script>

<style scoped lang="scss">
.setting-page {
  padding: 24px;
  max-width: 1000px;
  margin: 0 auto;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    flex-wrap: wrap;
    gap: 16px;

    h1 {
      font-size: 25px;
      color: var(--text-primary);
      margin: 0;
    }

    h2 {
      font-size: 18px;
      color: var(--text-primary);
      margin: 0;
    }
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }
}

.search-box {
  position: relative;
  width: 280px;
}

.search-input {
  width: 100%;
  padding: 10px 16px 10px 40px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 14px;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 1px 3px rgba(29, 185, 84, 0.1);
  }
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  color: var(--text-secondary);
  pointer-events: none;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.action-button {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s;

  svg {
    width: 20px;
    height: 20px;
  }

  &:hover {
    background: var(--bg-hover);
    border-color: var(--primary-color);
    color: var(--primary-color);
  }
}

.tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--border-color);
  overflow-x: auto;
  padding-bottom: 0;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
  white-space: nowrap;

  &:hover {
    color: var(--text-primary);
    background: var(--bg-hover);
  }

  &.active {
    color: var(--primary-color);
    border-bottom-color: var(--primary-color);
  }
}

.tab-content {
  min-height: 400px;
}

.sources-section {
  h2 {
    font-size: 18px;
    color: var(--text-primary);
    margin-bottom: 8px;
  }

  .section-description {
    font-size: 14px;
    color: var(--text-secondary);
    margin-bottom: 20px;
  }
}

.source-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.source-item {
  display: flex;
  align-items: center;
  padding: 16px;
  background: var(--bg-primary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
  transition: all 0.2s;

  &:hover {
    background: var(--bg-hover);
  }

  .source-info {
    flex: 1;
  }

  .source-name {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    display: block;
  }

  .source-status {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .toggle-btn {
    padding: 8px 16px;
    border: none;
    border-radius: 16px;
    background: var(--primary-color);
    color: white;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s;

    &:hover {
      opacity: 0.9;
    }

    &.disabled {
      background: var(--bg-secondary);
      color: var(--text-secondary);
    }
  }
}

// 自定义音源 UI 样式
.user-source-section {
  margin-top: 32px;
  padding-top: 32px;
  border-top: 1px solid var(--border-color);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 12px;

  h2 {
    font-size: 18px;
    color: var(--text-primary);
    margin: 0;
  }
}

.section-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  background: linear-gradient(135deg, rgba(29, 185, 84, 0.15) 0%, rgba(29, 185, 84, 0.25) 100%);
  color: var(--primary-color);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.user-source-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding: 20px 24px;
  background: linear-gradient(135deg, rgba(29, 185, 84, 0.08) 0%, rgba(29, 185, 84, 0.15) 100%);
  border-radius: 12px;
}

.user-source-actions {
  display: flex;
  gap: 12px;
}

.import-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border: none;
  border-radius: 24px;
  background: white;
  color: var(--primary-color);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

  svg {
    width: 18px;
    height: 18px;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  }

  &:active {
    transform: translateY(0);
  }
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px;
  color: var(--text-secondary);
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.empty-icon {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  border-radius: 50%;
  margin-bottom: 20px;

  svg {
    width: 40px;
    height: 40px;
    color: var(--text-secondary);
  }
}

.empty-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.empty-hint {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}

.user-source-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.user-source-card {
  background: var(--bg-primary);
  border-radius: 12px;
  border: 1px solid var(--border-color);
  overflow: hidden;
  transition: all 0.3s ease;

  &:hover {
    border-color: var(--primary-color);
    box-shadow: 0 8px 24px rgba(29, 185, 84, 0.12);
    transform: translateY(-4px);
  }

  &.disabled {
    opacity: 0.6;

    .card-icon {
      background: var(--bg-secondary);
    }
  }
}

.card-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
}

.card-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(29, 185, 84, 0.1) 0%, rgba(29, 185, 84, 0.2) 100%);
  border-radius: 12px;
  flex-shrink: 0;

  svg {
    width: 24px;
    height: 24px;
    color: var(--primary-color);
  }
}

.card-info {
  flex: 1;
  min-width: 0;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 4px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-secondary);

  svg {
    width: 14px;
    height: 14px;
  }
}

.card-body {
  padding: 16px;
}

.card-description {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0 0 12px 0;
  padding: 0 16px 12px 16px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;

  &.active {
    background: rgba(29, 185, 84, 0.1);
    color: var(--primary-color);
  }

  &:not(.active) {
    background: var(--bg-secondary);
    color: var(--text-secondary);
  }
}

.card-actions {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  background: var(--bg-secondary);
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &.toggle {
    background: var(--primary-color);
    color: white;

    &:hover {
      background: var(--primary-hover, #1ed66b);
    }
  }

  &.delete {
    background: transparent;
    color: #e74c3c;
    border: 1px solid #e74c3c;

    &:hover {
      background: #e74c3c;
      color: white;
    }
  }

  svg {
    width: 16px;
    height: 16px;
  }
}

.about-section {
  h2 {
    font-size: 18px;
    color: var(--text-primary);
    margin-bottom: 20px;
  }
}

.about-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.about-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px;
  background: var(--bg-primary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.about-label {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}

.about-value {
  font-size: 16px;
  color: var(--text-primary);
  font-weight: 600;
}

.about-links {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 24px;
}

.about-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  text-decoration: none;
  font-size: 14px;
  transition: all 0.2s;

  svg {
    width: 20px;
    height: 20px;
  }

  &:hover {
    background: var(--bg-hover);
    border-color: var(--primary-color);
    color: var(--primary-color);
  }
}

.reset-section {
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
}

.reset-btn {
  padding: 10px 24px;
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    opacity: 0.9;
  }
}

.toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  padding: 16px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  animation: slideIn 0.3s ease-out;

  &--success {
    background: #1db954;
    color: white;
  }

  &--error {
    background: #e74c3c;
    color: white;
  }

  &--info {
    background: #3498db;
    color: white;
  }
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

@media (max-width: 768px) {
  .setting-page {
    padding: 16px;

    &__header {
      flex-direction: column;
      align-items: stretch;

      h1 {
        text-align: center;
      }
    }
  }

  .search-box {
    width: 100%;
  }

  .tabs {
    flex-wrap: nowrap;
    overflow-x: auto;

    .tab-button {
      padding: 10px 16px;
      font-size: 13px;
    }
  }
}
</style>
