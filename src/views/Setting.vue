<template>
  <div class="setting-page page-shell">
    <div class="setting-toolbar glass-panel">
      <NTabs v-model:value="activeTab" type="segment" size="small" class="setting-tabs">
        <NTab v-for="tab in tabs" :key="tab.key" :name="tab.key">
          {{ tab.label }}
        </NTab>
      </NTabs>

      <div class="setting-toolbar__actions">
        <NTooltip trigger="hover">
          <template #trigger>
            <NButton quaternary circle size="small" @click="exportSettings">
              <template #icon>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  style="width: 18px; height: 18px"
                >
                  <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                </svg>
              </template>
            </NButton>
          </template>
          导出设置
        </NTooltip>
        <NTooltip trigger="hover">
          <template #trigger>
            <NButton quaternary circle size="small" @click="importSettings">
              <template #icon>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  style="width: 18px; height: 18px"
                >
                  <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z" />
                </svg>
              </template>
            </NButton>
          </template>
          导入设置
        </NTooltip>
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
              :class="[
                'toggle-btn',
                'app-button',
                'compact',
                channel.enabled ? 'danger' : 'success',
              ]"
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
              <NTag type="warning" size="small" :bordered="false">扩展</NTag>
            </div>
            <div class="header-buttons">
              <NButton type="primary" size="small" @click="importUserSource">
                <template #icon>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    style="width: 18px; height: 18px"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </template>
                导入音源
              </NButton>
            </div>
          </div>
          <p class="section-description">
            导入 JS
            自定义音源脚本。数字越小优先级越高；当前音源仍会优先参与对应歌曲的解析。播放器里的音频质量设置会直接影响这里的解析档位选择。
          </p>

          <div v-if="userSourceStore.isLoading" class="loading-state">
            <div class="loading-spinner"></div>
            <span>加载中...</span>
          </div>

          <div v-else-if="userSourceStore.userSources.length === 0" class="empty-state">
            <div class="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path
                  d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
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
                    <path
                      d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                    />
                  </svg>
                </div>
                <div class="card-info">
                  <h3 class="card-title">{{ source.name }}</h3>
                  <div class="card-meta">
                    <span v-if="source.author" class="meta-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      {{ source.author }}
                    </span>
                    <span v-if="source.version" class="meta-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path
                          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                        />
                      </svg>
                      v{{ source.version }}
                    </span>
                  </div>
                </div>
                <div
                  :class="[
                    'card-status',
                    'app-pill',
                    'compact',
                    source.enabled ? 'success' : 'secondary',
                  ]"
                >
                  {{
                    settingsStore.settings.activeUserSourceId === source.id
                      ? '当前音源'
                      : source.enabled
                        ? '已启用'
                        : '已禁用'
                  }}
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
                <NButton
                  size="small"
                  :type="
                    settingsStore.settings.activeUserSourceId === source.id ? 'primary' : 'default'
                  "
                  :disabled="!source.enabled"
                  @click="setActiveUserSource(source.id)"
                >
                  <template #icon>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      style="width: 16px; height: 16px"
                    >
                      <path d="M9 12l2 2 4-4" />
                      <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
                    </svg>
                  </template>
                  {{
                    settingsStore.settings.activeUserSourceId === source.id
                      ? '当前音源'
                      : '设为当前'
                  }}
                </NButton>
                <NButton
                  size="small"
                  :type="source.enabled ? 'warning' : 'success'"
                  @click="toggleUserSource(source.id, !source.enabled)"
                >
                  <template #icon>
                    <svg
                      v-if="source.enabled"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      style="width: 16px; height: 16px"
                    >
                      <path
                        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                      />
                    </svg>
                    <svg
                      v-else
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      style="width: 16px; height: 16px"
                    >
                      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  </template>
                  {{ source.enabled ? '禁用' : '启用' }}
                </NButton>
                <NButton size="small" type="error" @click="deleteUserSource(source.id)">
                  <template #icon>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      style="width: 16px; height: 16px"
                    >
                      <path
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </template>
                  删除
                </NButton>
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
              <NButton size="small" @click="refreshDiagnostics">刷新</NButton>
              <NButton size="small" secondary @click="handleClearPlaybackSourceCache"
                >清空播放成功缓存</NButton
              >
              <NButton size="small" warning @click="handleClearSourceHealth">清空健康记录</NButton>
              <NButton size="small" type="error" @click="handleClearBadSourceBlacklist"
                >清空失效音源黑名单</NButton
              >
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
                    <strong
                      >{{ player.currentMusic.name }} - {{ player.currentMusic.artist }}</strong
                    >
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
                  <NTag v-if="currentTrackCacheRecord" type="success" size="small" :bordered="false"
                    >命中</NTag
                  >
                  <NTag v-else type="default" size="small" :bordered="false">空</NTag>
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
                  <NTag type="warning" size="small" :bordered="false">{{
                    currentTrackBlockedRecords.length
                  }}</NTag>
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
                      过期于 {{ formatTimestamp(record.expiresAt) }} ·
                      {{ formatExpiry(record.expiresAt) }}
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
                          row.record?.cooldownUntil
                            ? 'warning'
                            : row.record
                              ? 'success'
                              : 'secondary',
                        ]"
                      >
                        {{
                          row.record?.cooldownUntil ? '冷却中' : row.record ? '已记录' : '未记录'
                        }}
                      </span>
                    </div>
                    <div class="diagnostic-list__meta">
                      成功 {{ row.record?.successCount || 0 }} / 失败
                      {{ row.record?.failureCount || 0 }}
                    </div>
                    <div class="diagnostic-list__meta">
                      最近成功 {{ formatTimestamp(row.record?.lastSuccessAt) }} · 最近失败
                      {{ formatTimestamp(row.record?.lastFailureAt) }}
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
          <SettingItem
            label="字体风格"
            type="select"
            :model-value="themeStore.settings.fontFamilyPreset"
            :options="fontFamilyPresetOptions"
            @update:model-value="updateFontFamilyPreset"
          />
          <SettingItem
            label="全局字号"
            description="影响绝大多数页面正文和卡片内容，歌词字号仍单独控制。"
            type="range"
            :model-value="settingsStore.settings.fontSize"
            :min="12"
            :max="20"
            suffix="px"
            @update:model-value="updateSetting('fontSize', $event)"
          />
          <SettingItem
            label="主文字颜色"
            type="color"
            :model-value="themeStore.settings.textColorPrimary"
            @update:model-value="updateTextColorPrimary"
          />
          <SettingItem
            label="次文字颜色"
            description="用于说明文案、次要信息和辅助文案。"
            type="color"
            :model-value="themeStore.settings.textColorSecondary"
            @update:model-value="updateTextColorSecondary"
          />
        </SettingGroup>

        <SettingGroup title="底板">
          <SettingItem
            label="底板类型"
            type="select"
            :model-value="themeStore.settings.baseplateStyle"
            :options="baseplateStyleOptions"
            @update:model-value="updateBaseplateStyle"
          />
          <SettingItem
            v-if="themeStore.settings.baseplateStyle === 'image'"
            label="底板图片"
            description="选择本地图片后会复制到应用目录，后续即使原图移动也能继续使用。"
            type="path"
            :model-value="themeStore.settings.baseplateImagePath"
            placeholder="未选择图片"
            @browse="selectBaseplateImage"
          />
          <div
            v-if="themeStore.settings.baseplateStyle === 'image'"
            class="baseplate-image-actions"
          >
            <NButton size="small" secondary @click="selectBaseplateImage">重新选择</NButton>
            <NButton
              size="small"
              quaternary
              :disabled="!themeStore.settings.baseplateImagePath"
              @click="clearBaseplateImage"
            >
              清除图片
            </NButton>
          </div>
          <SettingItem
            label="主色"
            type="color"
            :model-value="themeStore.settings.baseplateColorA"
            @update:model-value="updateBaseplateColorA"
          />
          <SettingItem
            v-if="themeStore.settings.baseplateStyle !== 'solid'"
            label="副色"
            type="color"
            :model-value="themeStore.settings.baseplateColorB"
            @update:model-value="updateBaseplateColorB"
          />
          <SettingItem
            v-if="themeStore.settings.baseplateStyle === 'linear-gradient'"
            label="渐变角度"
            type="range"
            :model-value="themeStore.settings.baseplateAngle"
            :min="0"
            :max="360"
            :step="1"
            suffix="°"
            @update:model-value="updateBaseplateAngle"
          />
          <SettingItem
            label="底板强度"
            type="range"
            :model-value="themeStore.settings.baseplateIntensity"
            :min="30"
            :max="100"
            :step="1"
            suffix="%"
            @update:model-value="updateBaseplateIntensity"
          />
          <SettingItem
            v-if="themeStore.settings.baseplateStyle === 'image'"
            label="图片透明度"
            type="range"
            :model-value="themeStore.settings.baseplateImageOpacity"
            :min="12"
            :max="100"
            :step="1"
            suffix="%"
            @update:model-value="updateBaseplateImageOpacity"
          />
          <SettingItem
            v-if="themeStore.settings.baseplateStyle === 'image'"
            label="图片模糊度"
            description="用于压住图片细节，避免背景抢正文。"
            type="range"
            :model-value="themeStore.settings.baseplateImageBlur"
            :min="0"
            :max="40"
            :step="1"
            suffix="px"
            @update:model-value="updateBaseplateImageBlur"
          />
          <SettingItem
            label="跟随主题高光"
            description="让主题主色参与底板高光层，而不是直接染到底板本体。"
            type="checkbox"
            :model-value="themeStore.settings.baseplateUseThemeAccent"
            @update:model-value="updateBaseplateUseThemeAccent"
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
          <p class="sync-placeholder">
            同步功能将在后续版本实现，当前不会建立任何客户端或服务端连接。
          </p>
        </SettingGroup>
      </SettingSection>

      <!-- Update Tab -->
      <SettingSection v-if="activeTab === 'update'" title="应用更新">
        <SettingGroup
          title="自动更新"
          description="从 GitHub Releases 检查新版本，并在桌面端应用内下载安装。"
        >
          <SettingItem
            label="启动时自动检查更新"
            description="仅在 Tauri 桌面环境中生效。关闭后，仍可在这里手动检查。"
            type="checkbox"
            :model-value="settingsStore.settings.autoCheckAppUpdate"
            @update:model-value="updateSetting('autoCheckAppUpdate', $event)"
          />

          <div class="update-card">
            <div class="update-card__meta">
              <div class="update-card__item">
                <span class="update-card__label">当前版本</span>
                <strong class="update-card__value">v{{ currentAppVersion }}</strong>
              </div>
              <div class="update-card__item">
                <span class="update-card__label">更新状态</span>
                <strong class="update-card__value">{{ appUpdateStatusLabel }}</strong>
              </div>
              <div class="update-card__item">
                <span class="update-card__label">上次检查</span>
                <strong class="update-card__value">{{ formattedAppUpdateLastCheckedAt }}</strong>
              </div>
            </div>

            <div class="update-card__actions">
              <NButton
                size="small"
                :loading="appUpdateStore.status === 'checking'"
                @click="handleCheckForAppUpdate"
              >
                立即检查
              </NButton>
              <NButton
                v-if="appUpdateStore.availableUpdate"
                type="primary"
                size="small"
                :loading="
                  appUpdateStore.status === 'downloading' || appUpdateStore.status === 'installing'
                "
                @click="handleInstallAppUpdate"
              >
                立即安装
              </NButton>
            </div>
          </div>

          <div class="update-status">
            <div class="update-status__header">
              <span class="update-status__title">{{ appUpdateStatusLabel }}</span>
              <span class="update-status__desc">{{ appUpdateStatusDescription }}</span>
            </div>

            <NProgress
              v-if="appUpdateStore.progress"
              type="line"
              :percentage="updateProgressPercent"
              :processing="appUpdateStore.status === 'downloading'"
              :show-indicator="updateProgressPercent >= 0"
              status="success"
            />

            <div v-if="appUpdateStore.progress" class="update-progress-meta">
              <span>已下载 {{ appUpdateStore.progress.downloadedBytes }} 字节</span>
              <span>总大小 {{ appUpdateStore.progress.contentLength ?? '-' }} 字节</span>
            </div>

            <p v-if="appUpdateStore.errorMessage" class="update-status__error">
              {{ appUpdateStore.errorMessage }}
            </p>
          </div>

          <div v-if="appUpdateStore.availableUpdate" class="update-notes">
            <div class="update-notes__meta">
              <div>
                <span class="update-card__label">新版本</span>
                <strong class="update-card__value"
                  >v{{ appUpdateStore.availableUpdate.version }}</strong
                >
              </div>
              <div>
                <span class="update-card__label">发布时间</span>
                <strong class="update-card__value">{{ formattedAppUpdatePublishedAt }}</strong>
              </div>
            </div>
            <pre class="update-notes__content">{{
              appUpdateStore.availableUpdate.notes || '当前版本没有附带更新说明。'
            }}</pre>
          </div>
        </SettingGroup>
      </SettingSection>

      <!-- About Tab -->
      <div v-if="activeTab === 'about'" class="about-section">
        <h2>关于</h2>
        <div class="about-info">
          <div class="about-item">
            <span class="about-label">版本</span>
            <span class="about-value">v{{ currentAppVersion }}</span>
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
          <NButton
            tag="a"
            href="https://github.com/Midnight-Injection/MI_music"
            text
            secondary
            size="small"
          >
            <template #icon>
              <svg viewBox="0 0 24 24" fill="currentColor" style="width: 20px; height: 20px">
                <path
                  d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
                />
              </svg>
            </template>
            GitHub
          </NButton>
        </div>
        <div class="reset-section">
          <NButton type="error" size="small" @click="resetAllSettings">重置所有设置</NButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { NTabs, NTab, NButton, NTooltip, NTag, NProgress, useMessage, useDialog } from 'naive-ui'
import { useAppUpdateStore } from '../store/appUpdate'
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
import { invoke } from '@tauri-apps/api/core'
import type { ThemeColorType, ThemeMode } from '../themes'
import type { BaseplateStyle, FontFamilyPreset } from '../types/settings'
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
const appUpdateStore = useAppUpdateStore()
const userSourceStore = useUserSourceStore()
const message = useMessage()
const dialog = useDialog()

const activeTab = ref('general')
const diagnosticsOpen = ref(false)
const diagnosticTick = ref(0)

// Tab definitions
const tabs = [
  { key: 'general', label: '常规' },
  { key: 'player', label: '播放器' },
  { key: 'lyrics', label: '歌词' },
  { key: 'download', label: '下载' },
  { key: 'theme', label: '主题' },
  { key: 'network', label: '网络' },
  { key: 'sync', label: '同步' },
  { key: 'update', label: '应用更新' },
  { key: 'sources', label: '渠道 / 音源' },
  { key: 'about', label: '关于' },
]

// Option definitions
const languageOptions = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'zh-TW', label: '繁體中文' },
  { value: 'en-US', label: 'English' },
]

const windowSizeOptions = [
  { value: 'small', label: '小' },
  { value: 'medium', label: '中' },
  { value: 'large', label: '大' },
  { value: 'custom', label: '自定义' },
]

const playModeOptions = [
  { value: 'loop', label: '列表循环' },
  { value: 'single', label: '单曲循环' },
  { value: 'random', label: '随机播放' },
]

const audioQualityOptions = [
  { value: 'standard', label: '标准' },
  { value: 'high', label: '高品质' },
  { value: 'lossless', label: '无损' },
]

const lyricPositionOptions = [
  { value: 'top', label: '顶部' },
  { value: 'center', label: '居中' },
  { value: 'bottom', label: '底部' },
]

const themeModeOptions = [
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
  { value: 'auto', label: '自动' },
]

const syncModeOptions = [
  { value: 'disabled', label: '禁用' },
  { value: 'server', label: '服务器模式' },
  { value: 'client', label: '客户端模式' },
]

const baseplateStyleOptions = [
  { value: 'solid', label: '纯色' },
  { value: 'linear-gradient', label: '线性渐变' },
  { value: 'radial-gradient', label: '径向渐变' },
  { value: 'image', label: '图片底板' },
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

const fontFamilyPresetOptions = [
  { value: 'system', label: '默认系统' },
  { value: 'apple', label: '苹方 / SF' },
  { value: 'windows', label: 'Segoe / YaHei' },
  { value: 'serif', label: '衬线阅读' },
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
  return (
    getPlaybackSourceCacheRecord(player.currentMusic, settingsStore.settings.audioQuality) || null
  )
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
            item.channel === channel && item.action === 'musicUrl' && item.sourceId === source.id
        ) || null,
    }))
})

const currentAppVersion = computed(() =>
  appUpdateStore.currentVersion === '...' ? '0.1.1' : appUpdateStore.currentVersion
)

const appUpdateStatusLabel = computed(() => {
  switch (appUpdateStore.status) {
    case 'checking':
      return '正在检查更新'
    case 'up-to-date':
      return '已是最新版本'
    case 'available':
      return `发现新版本 v${appUpdateStore.availableUpdate?.version ?? '-'}`
    case 'downloading':
      return '正在下载更新'
    case 'installing':
      return '正在安装更新'
    case 'completed':
      return '更新已安装'
    case 'error':
      return '更新失败'
    case 'unsupported':
      return '当前环境不支持'
    default:
      return '等待检查'
  }
})

const appUpdateStatusDescription = computed(() => {
  if (appUpdateStore.status === 'error') {
    return appUpdateStore.errorMessage || '更新流程执行失败'
  }

  if (appUpdateStore.availableUpdate) {
    return `当前版本 v${currentAppVersion.value}，可升级到 v${appUpdateStore.availableUpdate.version}`
  }

  if (appUpdateStore.status === 'up-to-date') {
    return `当前版本 v${currentAppVersion.value} 无需升级`
  }

  if (appUpdateStore.status === 'unsupported') {
    return '仅 Tauri 桌面应用支持应用内自动更新'
  }

  return '发布新版本后，这里会显示 GitHub Releases 里的更新信息'
})

const formattedAppUpdateLastCheckedAt = computed(() =>
  formatIsoDateTime(appUpdateStore.lastCheckedAt)
)

const formattedAppUpdatePublishedAt = computed(() =>
  formatIsoDateTime(appUpdateStore.availableUpdate?.publishedAt ?? null)
)

const updateProgressPercent = computed(() => appUpdateStore.progress?.percent ?? 0)

function refreshDiagnostics() {
  diagnosticTick.value += 1
  message.info('播放诊断已刷新')
}

function formatIsoDateTime(value: string | null | undefined) {
  if (!value) return '尚未检查'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString('zh-CN', { hour12: false })
}

function getUserSourceName(sourceId?: string | null) {
  if (!sourceId) return '未知音源'
  return (
    userSourceStore.sortedUserSources.find((source) => source.id === sourceId)?.name || sourceId
  )
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
  message.info('播放成功缓存已清空')
}

function handleClearSourceHealth() {
  clearSourceHealthRecords()
  diagnosticTick.value += 1
  message.info('音源健康记录已清空')
}

function handleClearBadSourceBlacklist() {
  clearBlockedTrackSourceRecords()
  diagnosticTick.value += 1
  message.info('失效音源黑名单已清空')
}

// Update setting
function updateSetting(key: string, value: any) {
  settingsStore.updateSetting(key as any, value)
  message.success('设置已保存')
}

async function updateThemeMode(value: ThemeMode) {
  await themeStore.setThemeMode(value)
  settingsStore.syncThemeSettings(themeStore.settings)
  message.success('主题模式已更新')
}

async function updateThemeColor(value: ThemeColorType) {
  if (value === 'custom') {
    await themeStore.setThemeColor('custom', themeStore.settings.customColor)
  } else {
    await themeStore.setThemeColor(value)
  }
  settingsStore.syncThemeSettings(themeStore.settings)
  message.success('主题颜色已更新')
}

async function updateCustomThemeColor(value: string) {
  await themeStore.setCustomColor(value)
  settingsStore.syncThemeSettings(themeStore.settings)
  message.success('自定义主题颜色已更新')
}

async function updateFontFamilyPreset(value: FontFamilyPreset) {
  await themeStore.setFontFamilyPreset(value)
  settingsStore.syncThemeSettings(themeStore.settings)
  message.success('字体风格已更新')
}

async function updateTextColorPrimary(value: string) {
  await themeStore.updateTextColors({ textColorPrimary: value })
  settingsStore.syncThemeSettings(themeStore.settings)
  message.success('主文字颜色已更新')
}

async function updateTextColorSecondary(value: string) {
  await themeStore.updateTextColors({ textColorSecondary: value })
  settingsStore.syncThemeSettings(themeStore.settings)
  message.success('次文字颜色已更新')
}

async function updateBaseplateStyle(value: BaseplateStyle) {
  await themeStore.updateBaseplateSettings({ baseplateStyle: value })
  settingsStore.syncThemeSettings(themeStore.settings)
  message.success('底板类型已更新')
}

async function updateBaseplateColorA(value: string) {
  await themeStore.updateBaseplateSettings({ baseplateColorA: value })
  settingsStore.syncThemeSettings(themeStore.settings)
  message.success('底板主色已更新')
}

async function updateBaseplateColorB(value: string) {
  await themeStore.updateBaseplateSettings({ baseplateColorB: value })
  settingsStore.syncThemeSettings(themeStore.settings)
  message.success('底板副色已更新')
}

async function updateBaseplateAngle(value: number) {
  await themeStore.updateBaseplateSettings({ baseplateAngle: value })
  settingsStore.syncThemeSettings(themeStore.settings)
}

async function updateBaseplateIntensity(value: number) {
  await themeStore.updateBaseplateSettings({ baseplateIntensity: value })
  settingsStore.syncThemeSettings(themeStore.settings)
}

async function updateBaseplateImageOpacity(value: number) {
  await themeStore.updateBaseplateSettings({ baseplateImageOpacity: value })
  settingsStore.syncThemeSettings(themeStore.settings)
}

async function updateBaseplateImageBlur(value: number) {
  await themeStore.updateBaseplateSettings({ baseplateImageBlur: value })
  settingsStore.syncThemeSettings(themeStore.settings)
}

async function updateBaseplateUseThemeAccent(value: boolean) {
  await themeStore.updateBaseplateSettings({ baseplateUseThemeAccent: value })
  settingsStore.syncThemeSettings(themeStore.settings)
  message.success(value ? '已启用主题高光联动' : '已关闭主题高光联动')
}

async function handleCheckForAppUpdate() {
  const update = await appUpdateStore.checkForUpdates()

  if (update) {
    message.success(`检测到新版本 v${update.version}`)
    return
  }

  if (appUpdateStore.status === 'up-to-date') {
    message.success(`当前已是最新版本 v${currentAppVersion.value}`)
    return
  }

  if (appUpdateStore.status === 'unsupported') {
    message.warning('当前环境不支持自动更新')
    return
  }

  if (appUpdateStore.status === 'error') {
    message.error(appUpdateStore.errorMessage || '检查更新失败')
  }
}

async function handleInstallAppUpdate() {
  const ok = await appUpdateStore.installUpdate()

  if (ok) {
    message.success('更新包已安装，若应用未自动重启，请手动重启以完成切换')
    return
  }

  message.error(appUpdateStore.errorMessage || '安装更新失败')
}

async function selectBaseplateImage() {
  try {
    const selected = await open({
      multiple: false,
      title: '选择底板图片',
      filters: [
        {
          name: 'Image',
          extensions: ['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif'],
        },
      ],
    })

    if (!selected || typeof selected !== 'string') return

    const importedPath = await invoke<string>('import_theme_baseplate_image', {
      sourcePath: selected,
      previousPath: themeStore.settings.baseplateImagePath || null,
    })

    await themeStore.updateBaseplateSettings({
      baseplateStyle: 'image',
      baseplateImagePath: importedPath,
    })
    settingsStore.syncThemeSettings(themeStore.settings)
    message.success('底板图片已更新')
  } catch (error) {
    console.error('Failed to import baseplate image:', error)
    message.error('导入底板图片失败')
  }
}

async function clearBaseplateImage() {
  await themeStore.updateBaseplateSettings({
    baseplateStyle: 'linear-gradient',
    baseplateImagePath: '',
  })
  settingsStore.syncThemeSettings(themeStore.settings)
  message.success('已清除底板图片')
}

// Toggle channel
function toggleChannel(id: string, enabled: boolean) {
  settingsStore.updateChannelConfig(id, enabled)
  message.success(enabled ? '渠道已启用' : '渠道已禁用')
}

// Import user source
async function importUserSource() {
  try {
    const source = await userSourceStore.importSource()
    if (source && !settingsStore.settings.activeUserSourceId) {
      settingsStore.updateSetting('activeUserSourceId', source.id)
    }
    message.success('自定义音源导入成功')
  } catch (error) {
    console.error('Failed to import user source:', error)
    const msgText = error instanceof Error ? error.message : String(error)
    message.error(`导入自定义音源失败: ${msgText}`)
  }
}

// Toggle user source
async function setActiveUserSource(id: string) {
  const source = userSourceStore.userSources.find((item) => item.id === id)
  if (!source || !source.enabled) {
    message.error('请先启用该自定义音源')
    return
  }
  settingsStore.updateSetting('activeUserSourceId', id)
  message.success('当前自定义音源已切换')
}

function getPreferredEnabledUserSource(excludeId?: string) {
  return userSourceStore.enabledSources.find((source) => source.id !== excludeId)
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

    message.success(enabled ? '自定义音源已启用' : '自定义音源已禁用')
  } catch (error) {
    console.error('Failed to toggle user source:', error)
    message.error('操作失败')
  }
}

// Delete user source
async function deleteUserSource(id: string) {
  dialog.warning({
    title: '确认删除',
    content: '确定要删除这个自定义音源吗？',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await userSourceStore.deleteSource(id)
        if (settingsStore.settings.activeUserSourceId === id) {
          const fallback = getPreferredEnabledUserSource(id)
          settingsStore.updateSetting('activeUserSourceId', fallback?.id || '')
        }
        message.success('自定义音源已删除')
      } catch (error) {
        console.error('Failed to delete user source:', error)
        message.error('删除失败')
      }
    },
  })
}

async function handlePriorityChange(id: string, event: Event) {
  const input = event.target as HTMLInputElement
  const nextPriority = Math.max(1, Math.floor(Number(input.value) || 1))

  try {
    await userSourceStore.updateSourcePriority(id, nextPriority)
    message.success('优先级已更新')
  } catch (error) {
    console.error('Failed to update source priority:', error)
    message.error('更新优先级失败')
  }
}

// Select download path using Tauri dialog
async function selectDownloadPath() {
  try {
    const selected = await open({
      directory: true,
      multiple: false,
      title: '选择下载路径',
    })

    if (selected && typeof selected === 'string') {
      settingsStore.updateSetting('downloadPath', selected)
      message.success('下载路径已更新')
    }
  } catch (error) {
    console.error('Failed to select directory:', error)
    message.error('选择路径失败')
  }
}

// Export settings to JSON file
async function exportSettings() {
  try {
    const settings = JSON.stringify(
      {
        ...settingsStore.settings,
        themeColor: themeStore.settings.themeColor,
        themeMode: themeStore.settings.themeMode,
        customColor: themeStore.settings.customColor,
        fontFamilyPreset: themeStore.settings.fontFamilyPreset,
        textColorPrimary: themeStore.settings.textColorPrimary,
        textColorSecondary: themeStore.settings.textColorSecondary,
        baseplateStyle: themeStore.settings.baseplateStyle,
        baseplateColorA: themeStore.settings.baseplateColorA,
        baseplateColorB: themeStore.settings.baseplateColorB,
        baseplateAngle: themeStore.settings.baseplateAngle,
        baseplateIntensity: themeStore.settings.baseplateIntensity,
        baseplateUseThemeAccent: themeStore.settings.baseplateUseThemeAccent,
        baseplateImagePath: themeStore.settings.baseplateImagePath,
        baseplateImageOpacity: themeStore.settings.baseplateImageOpacity,
        baseplateImageBlur: themeStore.settings.baseplateImageBlur,
      },
      null,
      2
    )
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `jiyu-music-settings-${timestamp}.json`

    const savePath = await save({
      defaultPath: filename,
      filters: [
        {
          name: 'JSON',
          extensions: ['json'],
        },
      ],
    })

    if (savePath && typeof savePath === 'string') {
      await writeTextFile(savePath, settings)
      message.success('设置已成功导出')
    }
  } catch (error) {
    console.error('Failed to export settings:', error)
    message.error('导出设置失败')
  }
}

// Import settings from JSON file
async function importSettings() {
  try {
    const filePath = await open({
      multiple: false,
      title: '导入设置',
      filters: [
        {
          name: 'JSON',
          extensions: ['json'],
        },
      ],
    })

    if (filePath && typeof filePath === 'string') {
      const content = await readTextFile(filePath)
      const importedSettings = JSON.parse(content)

      const {
        themeColor,
        themeMode,
        customColor,
        fontFamilyPreset,
        textColorPrimary,
        textColorSecondary,
        baseplateStyle,
        baseplateColorA,
        baseplateColorB,
        baseplateAngle,
        baseplateIntensity,
        baseplateUseThemeAccent,
        baseplateImagePath,
        baseplateImageOpacity,
        baseplateImageBlur,
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

      if (fontFamilyPreset) {
        await themeStore.setFontFamilyPreset(fontFamilyPreset)
      }

      await themeStore.updateTextColors({
        textColorPrimary,
        textColorSecondary,
      })

      await themeStore.updateBaseplateSettings({
        baseplateStyle,
        baseplateColorA,
        baseplateColorB,
        baseplateAngle,
        baseplateIntensity,
        baseplateUseThemeAccent,
        baseplateImagePath,
        baseplateImageOpacity,
        baseplateImageBlur,
      })

      settingsStore.syncThemeSettings(themeStore.settings)

      message.success('设置已成功导入')
    }
  } catch (error) {
    console.error('Failed to import settings:', error)
    message.error('导入设置失败')
  }
}

// Reset all settings to default
async function resetAllSettings() {
  dialog.warning({
    title: '确认重置',
    content: '确定要重置所有设置吗？此操作无法撤销。',
    positiveText: '确定重置',
    negativeText: '取消',
    onPositiveClick: async () => {
      settingsStore.resetSettings()
      await themeStore.resetTheme()
      settingsStore.syncThemeSettings(themeStore.settings)
      message.info('设置已重置为默认值')
    },
  })
}

onMounted(async () => {
  if (!userSourceStore.isLoaded) {
    await userSourceStore.loadUserSources()
  }

  await appUpdateStore.initialize()
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
  padding: 4px 2px;
  border-radius: 20px;
  background: transparent;
  box-shadow: none;
}

.setting-tabs {
  flex: 1 1 auto;
  min-width: 0;

  :deep(.n-tabs-nav) {
    width: 100%;
    margin-bottom: 0;
    padding: 4px;
    border-radius: 999px;
    background: transparent;
  }

  :deep(.n-tabs-rail) {
    background: transparent;
    box-shadow: none;
  }

  :deep(.n-tabs-capsule) {
    background: color-mix(in srgb, var(--panel-muted) 74%, transparent);
    border: 1px solid color-mix(in srgb, var(--border-color) 78%, transparent);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.12),
      0 10px 24px rgba(8, 14, 28, 0.08);
    backdrop-filter: blur(18px);
  }

  :deep(.n-tabs-nav-scroll-content) {
    width: 100%;
    display: flex;
    gap: 4px;
  }

  :deep(.n-tabs-tab) {
    flex: 1 1 0;
    justify-content: center;
    min-width: 0;
    border-radius: 999px;
    color: var(--text-secondary);
    font-weight: 600;
  }

  :deep(.n-tabs-tab--active) {
    color: var(--text-primary);
    background: color-mix(in srgb, var(--primary-color) 16%, rgba(255, 255, 255, 0.1));
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16);
  }
}

.setting-toolbar__actions {
  display: flex;
  gap: 8px;
  flex: 0 0 auto;

  :deep(.n-button) {
    background: var(--panel-muted);
    border: 1px solid var(--border-color);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
  }
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
  background: var(--panel-gradient);
}

.sync-placeholder {
  padding: 16px 0 4px;
  color: var(--text-secondary);
  line-height: 1.6;
  font-size: 0.9rem;
}

.update-card,
.update-status,
.update-notes {
  margin-top: 18px;
  padding: 18px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
}

.update-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.update-card__meta {
  flex: 1 1 420px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.update-card__item,
.update-notes__meta {
  display: grid;
  gap: 6px;
}

.update-card__label {
  font-size: 12px;
  color: var(--text-secondary);
}

.update-card__value {
  font-size: 14px;
  color: var(--text-primary);
}

.update-card__actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.update-status {
  display: grid;
  gap: 14px;
}

.update-status__header {
  display: grid;
  gap: 6px;
}

.update-status__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.update-status__desc,
.update-progress-meta {
  font-size: 12px;
  color: var(--text-secondary);
}

.update-progress-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.update-status__error {
  margin: 0;
  color: var(--danger-color);
  font-size: 12px;
}

.update-notes__meta {
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  margin-bottom: 12px;
}

.update-notes__content {
  margin: 0;
  padding: 14px;
  border-radius: 16px;
  background: rgba(0, 0, 0, 0.18);
  color: var(--text-primary);
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.baseplate-image-actions {
  margin-top: -4px;
  padding: 0 0 8px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
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
