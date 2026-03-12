<template>
  <div class="leaderboard-page page-shell">
    <section class="page-hero glass-panel">
      <div>
        <span class="page-kicker">Trend Watch</span>
        <h1 class="page-title">把近期热度走势做成一眼能扫的榜单。</h1>
        <p class="page-subtitle">保留一屏可读的榜单节奏，后续接接口时只替换数据内容。</p>
      </div>
    </section>

    <section class="leaderboard-table glass-panel section-card">
      <motion.div
        v-for="(item, index) in leaders"
        :key="item.title"
        class="leader-row"
        :initial="staggeredEnter(index, 12).initial"
        :animate="staggeredEnter(index, 12).animate"
      >
        <div class="leader-row__rank">{{ String(index + 1).padStart(2, '0') }}</div>
        <div class="leader-row__meta">
          <strong>{{ item.title }}</strong>
          <span>{{ item.artist }}</span>
        </div>
        <div class="leader-row__delta" :class="{ up: item.delta > 0 }">
          {{ item.delta > 0 ? `+${item.delta}` : item.delta }}
        </div>
      </motion.div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { motion } from 'motion-v'
import { staggeredEnter } from '../lib/motion'

const leaders = [
  { title: '夜航信号', artist: 'Luna Echo', delta: 8 },
  { title: '白昼反射', artist: 'Polar Noon', delta: 5 },
  { title: '海盐浪潮', artist: 'Mare Unit', delta: 2 },
  { title: '空轨切片', artist: 'Aster Lab', delta: -1 },
  { title: '逆光之后', artist: 'Sora', delta: -3 },
]
</script>

<style scoped lang="scss">
.leaderboard-table {
  display: grid;
  gap: 10px;
}

.leader-row {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) 72px;
  align-items: center;
  gap: 16px;
  padding: 16px 18px;
  border-radius: 20px;
  background: color-mix(in srgb, var(--bg-secondary) 72%, transparent);
}

.leader-row__rank {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--primary-color);
}

.leader-row__meta {
  strong,
  span {
    display: block;
  }

  span {
    margin-top: 6px;
    color: var(--text-secondary);
  }
}

.leader-row__delta {
  justify-self: end;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(239, 68, 68, 0.12);
  color: var(--error-color);
  font-weight: 700;

  &.up {
    background: rgba(34, 197, 94, 0.12);
    color: var(--success-color);
  }
}
</style>
