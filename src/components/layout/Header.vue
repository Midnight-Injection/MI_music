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
          <path
            d="M10.5 4a6.5 6.5 0 1 0 4.03 11.6l4.44 4.44 1.41-1.41-4.44-4.44A6.5 6.5 0 0 0 10.5 4Z M6 10.5a4.5 4.5 0 1 1 9 0a4.5 4.5 0 0 1-9 0Z"
          />
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
  align-items: center;
  gap: 10px;
  min-width: 0;
  min-height: 46px;
  padding: 4px 16px 0;
}

.header__title-block {
  min-width: 0;

  h2 {
    margin-top: 1px;
    font-size: 1.1rem;
    letter-spacing: -0.04em;
  }

  p {
    margin-top: 1px;
    color: var(--text-secondary);
    font-size: 0.74rem;
  }
}

.header__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}

.header__search {
  display: flex;
  align-items: center;
  gap: 8px;
  width: clamp(180px, 25vw, 320px);
  max-width: 100%;
  height: 40px;
  padding: 0 12px;
  border-radius: 999px;
  box-shadow: none;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-color);

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
  min-width: 100px;
  flex: 0 1 182px;
  max-width: 182px;
  min-height: 40px;
  padding: 0 12px;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(124, 82, 255, 0.16), rgba(255, 79, 139, 0.12));
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  box-shadow: none;

  strong,
  span {
    display: block;
    width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    font-size: 0.8rem;
    font-weight: 700;
  }

  span {
    margin-top: 2px;
    color: var(--text-secondary);
    font-size: 0.66rem;
  }
}

@media (max-width: 920px) {
  .header {
    grid-template-columns: 1fr;
    gap: 6px;
    padding: 4px 10px 0;
  }

  .header__actions {
    justify-content: flex-start;
  }

  .header__search {
    width: clamp(140px, 40vw, 260px);
  }

  .header__status {
    min-width: 80px;
    flex: 0 1 140px;
    max-width: 140px;
    min-height: 34px;

    strong {
      font-size: 0.74rem;
    }
  }

  .header__title-block {
    h2 {
      font-size: 0.96rem;
    }

    p {
      font-size: 0.68rem;
    }
  }
}

@media (max-width: 720px) {
  .header {
    padding: 2px 8px 0;
  }

  .header__title-block {
    .page-kicker {
      font-size: 0.64rem;
    }

    h2 {
      font-size: 0.86rem;
    }

    p {
      display: none;
    }
  }

  .header__search {
    width: clamp(100px, 35vw, 200px);
    height: 34px;
  }

  .header__status {
    flex: 0 1 120px;
    max-width: 120px;
    min-height: 34px;

    span {
      display: none;
    }
  }
}

@media (max-width: 920px) {
  .header {
    grid-template-columns: 1fr;
    gap: 6px;
    padding: 4px 10px 0;
  }

  .header__actions {
    justify-content: flex-start;
  }

  .header__search {
    width: clamp(140px, 40vw, 260px);
  }

  .header__status {
    min-width: 80px;
    flex: 0 1 140px;
    max-width: 140px;
    min-height: 34px;

    strong {
      font-size: 0.74rem;
    }
  }

  .header__title-block {
    h2 {
      font-size: 0.96rem;
    }

    p {
      font-size: 0.68rem;
    }
  }
}

@media (max-width: 720px) {
  .header {
    padding: 2px 8px 0;
  }

  .header__title-block {
    .page-kicker {
      font-size: 0.64rem;
    }

    h2 {
      font-size: 0.86rem;
    }

    p {
      display: none;
    }
  }

  .header__search {
    width: clamp(100px, 35vw, 200px);
    height: 34px;
  }

  .header__status {
    flex: 0 1 120px;
    max-width: 120px;
    min-height: 34px;

    span {
      display: none;
    }
  }
}
</style>
