<template>
  <aside class="context-rail" :class="{ 'context-rail--search': isSearchPage }">
    <template v-if="isSearchPage">
      <section class="context-rail__panel context-rail__panel--history">
        <div class="context-rail__panel-head">
          <span>搜索历史</span>
          <button
            v-if="recentKeywords.length"
            type="button"
            class="context-rail__link"
            @click="searchStore.clearRecentKeywords()"
          >
            清空
          </button>
        </div>

        <div v-if="recentKeywords.length" class="context-rail__keywords context-rail__keywords--soft">
          <button
            v-for="keyword in recentKeywords"
            :key="keyword"
            type="button"
            class="context-rail__keyword"
            @click="applyRecentKeyword(keyword)"
          >
            {{ keyword }}
          </button>
        </div>
        <p v-else class="context-rail__empty-copy">还没有搜索历史。搜索过的关键词会显示在这里，点击即可再次搜索。</p>
      </section>

      <section class="context-rail__panel context-rail__panel--player">
        <div class="context-rail__panel-head">
          <span>Now playing</span>
          <button type="button" class="context-rail__link" @click="router.push('/player')">打开详情</button>
        </div>

        <div class="context-rail__player-card">
          <img
            v-if="player.currentMusic"
            :src="player.currentMusic.cover || defaultCover"
            :alt="player.currentMusic.name"
            class="context-rail__cover"
            @error="handleCoverError"
          />
          <div v-else class="context-rail__cover context-rail__cover--placeholder"></div>

          <div class="context-rail__track">
            <strong>{{ player.currentMusic?.name || '未播放' }}</strong>
            <span>{{ player.currentMusic?.artist || '选择一首歌开始播放' }}</span>
          </div>

          <div class="context-rail__progress">
            <div class="context-rail__progress-bar">
              <div class="context-rail__progress-fill" :style="{ width: `${progressPercent}%` }"></div>
            </div>
            <div class="context-rail__progress-meta">
              <span>{{ formatTime(player.currentTime) }}</span>
              <span>{{ formatTime(player.duration) }}</span>
            </div>
          </div>
        </div>
      </section>
    </template>

    <template v-else>
      <section class="context-rail__panel context-rail__panel--headline">
        <span class="context-rail__kicker">{{ route.meta.title || '极域音乐' }}</span>
        <strong class="context-rail__time">{{ currentTimeText }}</strong>
        <p class="context-rail__copy">{{ routeCopy }}</p>
      </section>

      <section class="context-rail__panel context-rail__panel--player">
        <div class="context-rail__panel-head">
          <span>Now playing</span>
          <button type="button" class="context-rail__link" @click="router.push('/player')">打开详情</button>
        </div>

        <div class="context-rail__player-card">
          <img
            v-if="player.currentMusic"
            :src="player.currentMusic.cover || defaultCover"
            :alt="player.currentMusic.name"
            class="context-rail__cover"
            @error="handleCoverError"
          />
          <div v-else class="context-rail__cover context-rail__cover--placeholder"></div>

          <div class="context-rail__track">
            <strong>{{ player.currentMusic?.name || '未播放' }}</strong>
            <span>{{ player.currentMusic?.artist || '选择一首歌开始播放' }}</span>
          </div>
        </div>
      </section>
    </template>
  </aside>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePlayerStore } from '../../store/player'
import { useSearchStore } from '../../store/search'

const router = useRouter()
const route = useRoute()
const player = usePlayerStore()
const searchStore = useSearchStore()

const defaultCover = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="160" height="160"%3E%3Crect fill="%236551a3" width="160" height="160"/%3E%3Ccircle cx="80" cy="80" r="34" fill="%23ffffff" fill-opacity="0.18"/%3E%3C/svg%3E'
const now = ref(new Date())
let timer: number | null = null

const isSearchPage = computed(() => route.name === 'Search')
const recentKeywords = computed(() => searchStore.recentKeywords)
const progressPercent = computed(() => {
  if (!player.duration) return 0
  return Math.max(0, Math.min(100, (player.currentTime / player.duration) * 100))
})
const currentTimeText = computed(() => new Intl.DateTimeFormat('zh-CN', {
  hour: '2-digit',
  minute: '2-digit',
}).format(now.value))

const routeCopyMap: Record<string, string> = {
  SongList: '精选歌单和主壳层使用同一套浅紫玻璃系统。',
  Leaderboard: '榜单页延续播放器感，不再切成工具后台。',
  List: '歌单管理保留功能，但保持一致的壳层节奏。',
  Download: '下载任务和设置保持在同一块产品面板里。',
  Setting: '配置项沿用同一套卡片体系和间距。',
}

const routeCopy = computed(() => routeCopyMap[String(route.name || '')] || '保持播放器产品感，而不是纯工具页。')

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function handleCoverError(event: Event) {
  const img = event.target as HTMLImageElement
  img.src = defaultCover
}

function applyRecentKeyword(keyword: string) {
  searchStore.setKeyword(keyword)
  void router.push({
    path: '/search',
    query: {
      q: keyword,
      stamp: String(Date.now()),
    },
  })
}

onMounted(() => {
  timer = window.setInterval(() => {
    now.value = new Date()
  }, 30_000)
})

onUnmounted(() => {
  if (timer !== null) window.clearInterval(timer)
})
</script>

<style scoped lang="scss">
.context-rail {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
  min-width: 0;
  min-height: 0;
  padding: 18px 12px 16px;
  overflow: auto;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.08), transparent 26%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.025));
  backdrop-filter: blur(18px);
  box-shadow: var(--panel-shadow-soft);
}

.context-rail__panel {
  display: flex;
  flex-direction: column;
  padding: 14px;
  border-radius: 14px;
  background:
    radial-gradient(circle at top right, rgba(255, 255, 255, 0.1), transparent 30%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.04));
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: var(--panel-shadow-soft);
}

.context-rail__panel--history,
.context-rail__panel--headline {
  padding-top: 16px;
}

.context-rail__panel--player {
  flex: 1;
}

.context-rail__kicker,
.context-rail__panel-head span {
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.64rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.context-rail__time {
  display: block;
  margin-top: 10px;
  font-size: 1.82rem;
  line-height: 0.96;
  letter-spacing: -0.05em;
}

.context-rail__copy {
  margin-top: 8px;
  color: var(--text-secondary);
  font-size: 0.74rem;
  line-height: 1.55;
}

.context-rail__panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.context-rail__link {
  padding: 4px 9px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
  font-size: 0.66rem;
}

.context-rail__keywords {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.context-rail__keywords--soft {
  gap: 7px;
}

.context-rail__keyword {
  padding: 7px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
  font-size: 0.7rem;
  transition: background-color 0.18s ease, transform 0.18s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.14);
    transform: translateY(-1px);
  }
}

.context-rail__empty-copy {
  color: var(--text-secondary);
  font-size: 0.74rem;
  line-height: 1.5;
}

.context-rail__player-card {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 10px;
}

.context-rail__cover {
  width: 100%;
  aspect-ratio: 1.08;
  border-radius: 14px;
  object-fit: cover;
  background: rgba(255, 255, 255, 0.08);
  box-shadow: 0 10px 24px rgba(6, 3, 18, 0.14);
}

.context-rail__cover--placeholder {
  background: linear-gradient(135deg, rgba(231, 214, 255, 0.3), rgba(176, 151, 230, 0.22));
}

.context-rail__track {
  strong,
  span {
    display: block;
  }

  strong {
    font-size: 0.84rem;
    line-height: 1.35;
  }

  span {
    margin-top: 3px;
    color: var(--text-secondary);
    font-size: 0.72rem;
  }
}

.context-rail__progress-bar {
  height: 5px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.context-rail__progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #f2d2ff, #b8efff);
}

.context-rail__progress-meta {
  margin-top: 6px;
  display: flex;
  justify-content: space-between;
  color: var(--text-tertiary);
  font-size: 0.68rem;
}
</style>
