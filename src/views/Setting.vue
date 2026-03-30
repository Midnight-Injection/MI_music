<template>
  <div class="setting-page page-shell">
    <div class="setting-toolbar glass-panel">
      <div class="tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          :class="['tab-button', 'app-pill', activeTab === tab.key ? 'accent' : 'ghost', { active: activeTab === tab.key }]"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="setting-toolbar__actions">
        <button class="action-button app-icon-button accent" @click="exportSettings" title="导出设置">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
          </svg>
        </button>
        <button class="action-button app-icon-button secondary" @click="importSettings" title="导入设置">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Tab Content -->
    <div class="tab-content glass-panel">
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
              :class="['toggle-btn', 'app-button', 'compact', channel.enabled ? 'danger' : 'success']"
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
              <span class="section-badge app-pill warning compact">扩展</span>
            </div>
            <div class="header-buttons">
              <button class="import-btn app-button accent" @click="importUserSource">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                导入音源
              </button>
            </div>
          </div>
          <p class="section-description">导入 JS 自定义音源脚本。数字越小优先级越高；当前音源仍会优先参与对应歌曲的解析。播放器里的音频质量设置会直接影响这里的解析档位选择。</p>

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
              v-for="source in userSourceStore.sortedUserSources"
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
                <div :class="['card-status', 'app-pill', 'compact', source.enabled ? 'success' : 'secondary']">
                  {{ settingsStore.settings.activeUserSourceId === source.id ? '当前音源' : (source.enabled ? '已启用' : '已禁用') }}
                </div>
              </div>
              <p v-if="source.description" class="card-description">{{ source.description }}</p>
              <div class="card-priority">
                <span class="card-priority__label">优先级</span>
                <input
                  class="card-priority__input"
                  type="number"
                  min="1"
                  step="1"
                  :value="source.priority"
                  @change="handlePriorityChange(source.id, $event)"
                />
                <span class="card-priority__hint">数字越小越优先</span>
              </div>
              <div class="card-actions">
                <button
                  :class="['action-btn', 'app-button', settingsStore.settings.activeUserSourceId === source.id ? 'accent' : 'secondary', { active: settingsStore.settings.activeUserSourceId === source.id }]"
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
                  :class="['action-btn', 'app-button', source.enabled ? 'warning' : 'success', { active: source.enabled }]"
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
                  class="action-btn app-button danger delete"
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
        <SettingGroup title="播放诊断" description="排查当前歌曲的解析来源、缓存状态和失效音源。">
          <div class="diagnostic-panel">
            <div class="diagnostic-toolbar">
              <button
                :class="['app-button', diagnosticsOpen ? 'accent' : 'secondary']"
                @click="diagnosticsOpen = !diagnosticsOpen"
              >
                {{ diagnosticsOpen ? '收起诊断' : '展开诊断' }}
              </button>
              <button class="app-button ghost" @click="refreshDiagnostics">刷新</button>
              <button class="app-button secondary" @click="handleClearPlaybackSourceCache">
                清空播放成功缓存
              </button>
              <button class="app-button warning" @click="handleClearSourceHealth">
                清空健康记录
              </button>
              <button class="app-button danger" @click="handleClearBadSourceBlacklist">
                清空失效音源黑名单
              </button>
            </div>

            <div v-if="diagnosticsOpen" class="diagnostic-grid">
              <div class="diagnostic-card diagnostic-card--wide">
                <div class="diagnostic-card__header">
                  <h3>当前播放</h3>
                  <span class="app-pill compact secondary">
                    {{ player.currentMusic ? '已载入歌曲' : '暂无歌曲' }}
                  </span>
                </div>
                <template v-if="player.currentMusic">
                  <div class="diagnostic-kv">
                    <span>歌曲</span>
                    <strong>{{ player.currentMusic.name }} - {{ player.currentMusic.artist }}</strong>
                  </div>
                  <div class="diagnostic-kv">
                    <span>解析来源</span>
                    <strong>{{ playbackSourceInfo.compactLabel || '未解析' }}</strong>
                  </div>
                  <div class="diagnostic-kv">
                    <span>解析器 / 渠道</span>
                    <strong>
                      {{ playbackSourceInfo.resolverLabel || '未解析' }}
                      <template v-if="playbackSourceInfo.channelLabel">
                        · {{ playbackSourceInfo.channelLabel }}
                      </template>
                    </strong>
                  </div>
                  <div class="diagnostic-kv">
                    <span>自定义音源</span>
                    <strong>{{ playbackSourceInfo.userSourceLabel || '未使用' }}</strong>
                  </div>
                  <div class="diagnostic-kv">
                    <span>目标音质</span>
                    <strong>{{ settingsStore.settings.audioQuality }}</strong>
                  </div>
                  <div class="diagnostic-kv">
                    <span>当前提示</span>
                    <strong>{{ player.playbackNotice || '无' }}</strong>
                  </div>
                  <div class="diagnostic-kv diagnostic-kv--stack">
                    <span>播放地址</span>
                    <code>{{ truncatedResolvedUrl || '暂无' }}</code>
                  </div>
                </template>
                <p v-else class="diagnostic-empty">开始播放任意歌曲后，这里会显示当前解析路径。</p>
              </div>

              <div class="diagnostic-card">
                <div class="diagnostic-card__header">
                  <h3>成功缓存</h3>
                  <span class="app-pill compact success" v-if="currentTrackCacheRecord">命中</span>
                  <span class="app-pill compact secondary" v-else>空</span>
                </div>
                <template v-if="currentTrackCacheRecord">
                  <div class="diagnostic-kv">
                    <span>缓存音源</span>
                    <strong>{{ getUserSourceName(currentTrackCacheRecord.sourceId) }}</strong>
                  </div>
                  <div class="diagnostic-kv">
                    <span>实际音质</span>
                    <strong>{{ currentTrackCacheRecord.actualQuality || '未知' }}</strong>
                  </div>
                  <div class="diagnostic-kv">
                    <span>更新时间</span>
                    <strong>{{ formatTimestamp(currentTrackCacheRecord.updatedAt) }}</strong>
                  </div>
                </template>
                <p v-else class="diagnostic-empty">当前歌曲没有命中的播放成功缓存。</p>
              </div>

              <div class="diagnostic-card">
                <div class="diagnostic-card__header">
                  <h3>失效音源</h3>
                  <span class="app-pill compact warning">{{ currentTrackBlockedRecords.length }}</span>
                </div>
                <div v-if="currentTrackBlockedRecords.length" class="diagnostic-list">
                  <div
                    v-for="record in currentTrackBlockedRecords"
                    :key="`${record.sourceId}-${record.updatedAt}`"
                    class="diagnostic-list__item"
                  >
                    <div class="diagnostic-list__title">
                      {{ getUserSourceName(record.sourceId) }}
                    </div>
                    <div class="diagnostic-list__meta">
                      过期于 {{ formatTimestamp(record.expiresAt) }} · {{ formatExpiry(record.expiresAt) }}
                    </div>
                    <div class="diagnostic-list__reason">{{ record.reason }}</div>
                  </div>
                </div>
                <p v-else class="diagnostic-empty">当前歌曲没有被拉黑的自定义音源。</p>
              </div>

              <div class="diagnostic-card diagnostic-card--wide">
                <div class="diagnostic-card__header">
                  <h3>当前渠道健康度</h3>
                  <span class="app-pill compact secondary">
                    {{ currentPlaybackChannelLabel || '未确定渠道' }}
                  </span>
                </div>
                <div v-if="currentTrackHealthRows.length" class="diagnostic-list">
                  <div
                    v-for="row in currentTrackHealthRows"
                    :key="row.source.id"
                    class="diagnostic-list__item"
                  >
                    <div class="diagnostic-list__row">
                      <div class="diagnostic-list__title">{{ row.source.name }}</div>
                      <span
                        :class="[
                          'app-pill',
                          'compact',
                          row.record?.cooldownUntil ? 'warning' : row.record ? 'success' : 'secondary',
                        ]"
                      >
                        {{
                          row.record?.cooldownUntil
                            ? '冷却中'
                            : row.record
                              ? '已记录'
                              : '未记录'
                        }}
                      </span>
                    </div>
                    <div class="diagnostic-list__meta">
                      成功 {{ row.record?.successCount || 0 }} / 失败 {{ row.record?.failureCount || 0 }}
                    </div>
                    <div class="diagnostic-list__meta">
                      最近成功 {{ formatTimestamp(row.record?.lastSuccessAt) }} · 最近失败 {{ formatTimestamp(row.record?.lastFailureAt) }}
                    </div>
                    <div v-if="row.record?.lastError" class="diagnostic-list__reason">
                      {{ row.record.lastError }}
                    </div>
                  </div>
                </div>
                <p v-else class="diagnostic-empty">当前渠道下还没有可显示的健康度记录。</p>
              </div>
            </div>
          </div>
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
            :model-value="themeStore.settings.themeMode"
            :options="themeModeOptions"
            @update:model-value="updateThemeMode"
          />
          <SettingItem
            label="主题颜色"
            type="color-palette"
            :model-value="themeStore.settings.themeColor"
            :options="themeColors"
            @update:model-value="updateThemeColor"
          />
          <SettingItem
            v-if="themeStore.settings.themeColor === 'custom'"
            label="自定义颜色"
            type="color"
            :model-value="themeStore.settings.customColor"
            @update:model-value="updateCustomThemeColor"
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
        <SettingGroup title="同步" description="同步能力暂未实现，当前版本仅保留说明以避免误导。">
          <SettingItem
            label="同步模式"
            type="select"
            :model-value="settingsStore.settings.syncMode"
            :options="syncModeOptions"
            :disabled="true"
          />
          <p class="sync-placeholder">同步功能将在后续版本实现，当前不会建立任何客户端或服务端连接。</p>
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
          <a href="#" class="about-link app-button secondary">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            GitHub
          </a>
        </div>
        <div class="reset-section">
          <button class="reset-btn app-button danger" @click="resetAllSettings">
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
import { computed, onMounted, ref } from 'vue'
import { useSettingsStore } from '../store/settings'
import { useThemeStore } from '../store/theme'
import { usePlayerStore } from '../store/player'
import { useUserSourceStore } from '../stores/userSource'
import SettingItem from '../components/settings/SettingItem.vue'
import SettingGroup from '../components/settings/SettingGroup.vue'
import SettingSection from '../components/settings/SettingSection.vue'
import { open } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'
import { save } from '@tauri-apps/plugin-dialog'
import type { ThemeColorType, ThemeMode } from '../themes'
import { getPlaybackSourceDisplayInfo, getChannelDisplayName } from '../lib/playbackSource'
import {
  clearPlaybackSourceCache,
  getPlaybackSourceCacheRecord,
} from '../modules/playback/sourceSuccessCache'
import {
  clearBlockedTrackSourceRecords,
  getBlockedTrackSourceRecords,
} from '../modules/playback/badSourceBlacklist'
import {
  clearSourceHealthRecords,
  getSourceHealthRecordsSnapshot,
} from '../modules/source-health/store'
import { resolveMusicChannel } from '../modules/playback/types'

const settingsStore = useSettingsStore()
const themeStore = useThemeStore()
const player = usePlayerStore()
const userSourceStore = useUserSourceStore()

const activeTab = ref('general')
const diagnosticsOpen = ref(false)
const diagnosticTick = ref(0)
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
  { value: 'blue', label: '蓝色', color: '#42a5ff' },
  { value: 'red', label: '红色', color: '#ff617d' },
  { value: 'pink', label: '粉色', color: '#ff4f8b' },
  { value: 'purple', label: '紫色', color: '#9b59b6' },
  { value: 'orange', label: '橙色', color: '#e67e22' },
  { value: 'black', label: '黑色', color: '#d4d7e1' },
  { value: 'grey', label: '灰色', color: '#9da8bd' },
  { value: 'custom', label: '自定义', color: '#ffffff' },
]

const playbackSourceInfo = computed(() => {
  diagnosticTick.value
  return getPlaybackSourceDisplayInfo({
    currentMusic: player.currentMusic,
    resolvedChannel: player.resolvedChannel,
    resolvedResolver: player.resolvedResolver,
    resolvedUserSourceId: player.resolvedUserSourceId,
    userSources: userSourceStore.sortedUserSources.map((source) => ({
      id: source.id,
      name: source.name,
    })),
  })
})

const currentPlaybackChannel = computed(() => {
  diagnosticTick.value
  if (!player.currentMusic) return null
  return player.resolvedChannel || resolveMusicChannel(player.currentMusic)
})

const currentPlaybackChannelLabel = computed(() =>
  getChannelDisplayName(currentPlaybackChannel.value)
)

const truncatedResolvedUrl = computed(() => {
  diagnosticTick.value
  const url = player.resolvedUrl || ''
  if (!url) return ''
  return url.length > 120 ? `${url.slice(0, 117)}...` : url
})

const currentTrackCacheRecord = computed(() => {
  diagnosticTick.value
  if (!player.currentMusic) return null
  return getPlaybackSourceCacheRecord(player.currentMusic, settingsStore.settings.audioQuality) || null
})

const currentTrackBlockedRecords = computed(() => {
  diagnosticTick.value
  if (!player.currentMusic) return []
  return getBlockedTrackSourceRecords(player.currentMusic)
})

const currentTrackHealthRows = computed(() => {
  diagnosticTick.value
  const channel = currentPlaybackChannel.value
  if (!channel) return []

  const records = getSourceHealthRecordsSnapshot()
  return userSourceStore.sortedUserSources
    .filter((source) => source.sources?.[channel]?.actions?.includes('musicUrl'))
    .map((source) => ({
      source,
      record:
        records.find(
          (item) =>
            item.channel === channel
            && item.action === 'musicUrl'
            && item.sourceId === source.id,
        ) || null,
    }))
})

// Toast notification
function showToast(message: string, type: 'success' | 'error' | 'info' = 'success') {
  toast.value = { show: true, message, type }
  setTimeout(() => {
    toast.value.show = false
  }, 3000)
}

function refreshDiagnostics() {
  diagnosticTick.value += 1
  showToast('播放诊断已刷新', 'info')
}

function getUserSourceName(sourceId?: string | null) {
  if (!sourceId) return '未知音源'
  return userSourceStore.sortedUserSources.find((source) => source.id === sourceId)?.name || sourceId
}

function formatTimestamp(timestamp?: number) {
  if (!timestamp) return '无'
  return new Date(timestamp).toLocaleString('zh-CN', { hour12: false })
}

function formatExpiry(expiresAt: number) {
  const remainingMs = expiresAt - Date.now()
  if (remainingMs <= 0) return '即将过期'

  const hours = Math.floor(remainingMs / (60 * 60 * 1000))
  const minutes = Math.max(1, Math.ceil((remainingMs % (60 * 60 * 1000)) / (60 * 1000)))

  if (hours <= 0) return `${minutes} 分钟后到期`
  return `${hours} 小时 ${minutes} 分钟后到期`
}

function handleClearPlaybackSourceCache() {
  clearPlaybackSourceCache()
  diagnosticTick.value += 1
  showToast('播放成功缓存已清空', 'info')
}

function handleClearSourceHealth() {
  clearSourceHealthRecords()
  diagnosticTick.value += 1
  showToast('音源健康记录已清空', 'info')
}

function handleClearBadSourceBlacklist() {
  clearBlockedTrackSourceRecords()
  diagnosticTick.value += 1
  showToast('失效音源黑名单已清空', 'info')
}

// Update setting
function updateSetting(key: string, value: any) {
  settingsStore.updateSetting(key as any, value)
  showToast('设置已保存')
}

async function updateThemeMode(value: ThemeMode) {
  await themeStore.setThemeMode(value)
  settingsStore.syncThemeSettings(themeStore.settings)
  showToast('主题模式已更新')
}

async function updateThemeColor(value: ThemeColorType) {
  if (value === 'custom') {
    await themeStore.setThemeColor('custom', themeStore.settings.customColor)
  } else {
    await themeStore.setThemeColor(value)
  }
  settingsStore.syncThemeSettings(themeStore.settings)
  showToast('主题颜色已更新')
}

async function updateCustomThemeColor(value: string) {
  await themeStore.setCustomColor(value)
  settingsStore.syncThemeSettings(themeStore.settings)
  showToast('自定义主题颜色已更新')
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

function getPreferredEnabledUserSource(excludeId?: string) {
  return userSourceStore.enabledSources.find(source => source.id !== excludeId)
}

async function toggleUserSource(id: string, enabled: boolean) {
  try {
    await userSourceStore.toggleSource(id, enabled)

    if (enabled && !settingsStore.settings.activeUserSourceId) {
      settingsStore.updateSetting('activeUserSourceId', id)
    }

    if (!enabled && settingsStore.settings.activeUserSourceId === id) {
      const fallback = getPreferredEnabledUserSource(id)
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
        const fallback = getPreferredEnabledUserSource(id)
        settingsStore.updateSetting('activeUserSourceId', fallback?.id || '')
      }
      showToast('自定义音源已删除')
    } catch (error) {
      console.error('Failed to delete user source:', error)
      showToast('删除失败', 'error')
    }
  }
}

async function handlePriorityChange(id: string, event: Event) {
  const input = event.target as HTMLInputElement
  const nextPriority = Math.max(1, Math.floor(Number(input.value) || 1))

  try {
    await userSourceStore.updateSourcePriority(id, nextPriority)
    showToast('优先级已更新')
  } catch (error) {
    console.error('Failed to update source priority:', error)
    showToast('更新优先级失败', 'error')
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
    const settings = JSON.stringify({
      ...settingsStore.settings,
      themeColor: themeStore.settings.themeColor,
      themeMode: themeStore.settings.themeMode,
      customColor: themeStore.settings.customColor,
    }, null, 2)
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

      const {
        themeColor,
        themeMode,
        customColor,
        ...generalSettings
      } = importedSettings

      settingsStore.updateSettings(generalSettings)

      if (themeMode) {
        await themeStore.setThemeMode(themeMode)
      }

      if (themeColor === 'custom') {
        await themeStore.setThemeColor('custom', customColor || themeStore.settings.customColor)
      } else if (themeColor) {
        await themeStore.setThemeColor(themeColor)
      }

      if (themeColor === 'custom' && customColor) {
        await themeStore.setCustomColor(customColor)
      }

      settingsStore.syncThemeSettings(themeStore.settings)

      showToast('设置已成功导入')
    }
  } catch (error) {
    console.error('Failed to import settings:', error)
    showToast('导入设置失败', 'error')
  }
}

// Reset all settings to default
async function resetAllSettings() {
  if (confirm('确定要重置所有设置吗？此操作无法撤销。')) {
    settingsStore.resetSettings()
    await themeStore.resetTheme()
    settingsStore.syncThemeSettings(themeStore.settings)
    showToast('设置已重置为默认值', 'info')
  }
}

onMounted(async () => {
  if (!userSourceStore.isLoaded) {
    await userSourceStore.loadUserSources()
  }
})
</script>

<style scoped lang="scss">
.setting-page {
  padding-top: 0;
  padding-bottom: 20px;

  &.page-shell {
    width: 100%;
    max-width: none;
    padding: 0;
    gap: 12px;
  }
}

.setting-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 10px 12px;
  border-radius: 20px;
  background:
    radial-gradient(circle at top right, rgba(255, 79, 139, 0.1), transparent 22%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0.035));
}

.setting-toolbar__actions {
  display: flex;
  gap: 8px;
  flex: 0 0 auto;
}

.action-button {
  svg {
    width: 20px;
    height: 20px;
  }
}

.tabs {
  display: flex;
  gap: 8px;
  flex: 1 1 auto;
  min-width: 0;
  margin-bottom: 0;
  padding: 0;
  border-radius: 0;
  background: transparent;
  overflow-x: auto;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  white-space: nowrap;

  &:hover {
    color: var(--text-primary);
  }

  &.active {
    box-shadow: var(--button-accent-shadow);
  }
}

.tab-content {
  min-height: 400px;
  padding: 18px 18px 8px;
  border-radius: 22px;
  background:
    radial-gradient(circle at top right, rgba(255, 255, 255, 0.08), transparent 22%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.03));
}

.sync-placeholder {
  padding: 16px 0 4px;
  color: var(--text-secondary);
  line-height: 1.6;
  font-size: 0.9rem;
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
  background: rgba(255, 255, 255, 0.05);
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
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
    font-size: 12px;
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
  font-size: 11px;
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
  font-size: 14px;

  svg {
    width: 18px;
    height: 18px;
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
  background: rgba(255, 255, 255, 0.08);
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
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
  transition: all 0.3s ease;

  &:hover {
    border-color: rgba(255, 255, 255, 0.12);
    box-shadow: var(--shadow-md);
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
  background: linear-gradient(135deg, rgba(255, 79, 139, 0.16), rgba(124, 82, 255, 0.18));
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

.card-priority {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px 14px;
}

.card-priority__label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
}

.card-priority__input {
  width: 78px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 13px;
  outline: none;

  &:focus {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-color) 16%, transparent);
  }
}

.card-priority__hint {
  font-size: 12px;
  color: var(--text-secondary);
}

.card-status {
  font-size: 12px;
}

.card-actions {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
}

.diagnostic-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.diagnostic-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.diagnostic-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.diagnostic-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.045);
}

.diagnostic-card--wide {
  grid-column: 1 / -1;
}

.diagnostic-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  h3 {
    margin: 0;
    font-size: 15px;
    color: var(--text-primary);
  }
}

.diagnostic-kv {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  font-size: 13px;

  span {
    flex: 0 0 88px;
    color: var(--text-secondary);
  }

  strong,
  code {
    flex: 1;
    color: var(--text-primary);
    text-align: right;
    word-break: break-all;
  }

  code {
    padding: 8px 10px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.06);
    font-size: 12px;
  }
}

.diagnostic-kv--stack {
  flex-direction: column;

  span {
    flex: none;
  }

  code {
    width: 100%;
    text-align: left;
  }
}

.diagnostic-empty {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.6;
}

.diagnostic-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.diagnostic-list__item {
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.diagnostic-list__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.diagnostic-list__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.diagnostic-list__meta {
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.diagnostic-list__reason {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-primary);
  word-break: break-word;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 13px;

  &.delete {
    min-height: 40px;
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
  background: rgba(255, 255, 255, 0.05);
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
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
  text-decoration: none;
  font-size: 14px;

  svg {
    width: 20px;
    height: 20px;
  }
}

.reset-section {
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
}

.reset-btn {
  font-size: 14px;
}

.toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  padding: 16px 24px;
  border-radius: 18px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  animation: slideIn 0.3s ease-out;

  &--success {
    background: linear-gradient(135deg, #22c55e, #4ade80);
    color: white;
  }

  &--error {
    background: linear-gradient(135deg, #ff5c77, #ff7c92);
    color: white;
  }

  &--info {
    background: linear-gradient(135deg, #4da5ff, #60a5fa);
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
    padding-bottom: 16px;
  }

  .setting-toolbar {
    flex-direction: column;
    align-items: stretch;
    padding: 10px;
  }

  .setting-toolbar__actions {
    justify-content: flex-end;
  }

  .tabs {
    flex-wrap: nowrap;
    overflow-x: auto;
  }

  .tab-button {
    font-size: 13px;
  }

  .diagnostic-grid {
    grid-template-columns: 1fr;
  }

  .diagnostic-kv {
    flex-direction: column;

    span {
      flex: none;
    }

    strong {
      text-align: left;
    }
  }
}
</style>
