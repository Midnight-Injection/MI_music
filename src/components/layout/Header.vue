<template>
  <header class="header">
    <div class="header__title-block">
      <span class="page-kicker">Jiyu Music</span>
      <h2>{{ title }}</h2>
      <p>{{ subtitle }}</p>
    </div>

    <div class="header__actions">
      <label v-if="!isSearchPage" class="header__search glass-panel">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M10.5 4a6.5 6.5 0 1 0 4.03 11.6l4.44 4.44 1.41-1.41-4.44-4.44A6.5 6.5 0 0 0 10.5 4Z M6 10.5a4.5 4.5 0 1 1 9 0a4.5 4.5 0 0 1-9 0Z" />
        </svg>
        <input
          v-model="searchText"
          type="text"
          placeholder="搜索歌曲、歌手、专辑"
          @keyup.enter="handleSearch"
        />
      </label>

      <button class="header__status" type="button" @click="router.push('/player')">
        <strong>{{ player.currentMusic?.name || '未播放' }}</strong>
        <span>{{ player.isPlaying ? '正在播放' : '播放器' }}</span>
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePlayerStore } from '../../store/player'

const route = useRoute()
const router = useRouter()
const player = usePlayerStore()
const searchText = ref('')

const copyMap: Record<string, string> = {
  Search: '从搜索开始，再进入播放和收藏。',
  SongList: '看精选歌单，不被多余信息打断。',
  Leaderboard: '近期热度变化与平台趋势。',
  List: '整理试听列表、收藏和自建歌单。',
  Download: '下载任务与路径配置。',
  Setting: '主题、音源与歌词偏好。',
  PlayerDetail: '播放控制与歌词联动。',
}

const title = computed(() => String(route.meta.title || '极域音乐'))
const subtitle = computed(() => copyMap[String(route.name || '')] || '更清晰的桌面音乐播放器。')
const isSearchPage = computed(() => route.name === 'Search')

function handleSearch() {
  if (!searchText.value.trim()) return
  router.push({ path: '/search', query: { q: searchText.value.trim() } })
}
</script>

<style scoped lang="scss">
.header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 16px;
  min-height: var(--header-height);
  padding: 18px 24px 8px;
}

.header__title-block {
  min-width: 0;

  h2 {
    margin-top: 8px;
    font-size: 1.3rem;
    letter-spacing: -0.04em;
  }

  p {
    margin-top: 6px;
    color: var(--text-secondary);
    font-size: 0.92rem;
  }
}

.header__actions {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.header__search {
  display: flex;
  align-items: center;
  gap: 10px;
  width: min(420px, 34vw);
  height: 46px;
  padding: 0 14px;
  border-radius: 999px;
  box-shadow: var(--shadow-sm);

  svg {
    width: 16px;
    height: 16px;
    stroke: var(--text-tertiary);
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  input {
    width: 100%;
    border: none;
    background: transparent;
    color: var(--text-primary);
    outline: none;
  }
}

.header__status {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  min-width: 120px;
  max-width: 180px;
  min-height: 46px;
  padding: 0 14px;
  border-radius: 999px;
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-primary);

  strong,
  span {
    display: block;
    width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    font-size: 0.88rem;
    font-weight: 700;
  }

  span {
    margin-top: 2px;
    color: var(--text-secondary);
    font-size: 0.74rem;
  }
}

@media (max-width: 900px) {
  .header {
    grid-template-columns: 1fr;
    align-items: stretch;
    padding: 0 14px 8px;
  }

  .header__actions {
    width: 100%;
  }

  .header__search {
    flex: 1;
    width: auto;
  }
}
</style>
