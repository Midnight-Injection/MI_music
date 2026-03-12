<template>
  <div class="song-list-page page-shell">
    <section class="page-hero glass-panel">
      <div>
        <span class="page-kicker">Curated Playlist</span>
        <h1 class="page-title">按场景切换你要的氛围。</h1>
        <p class="page-subtitle">先把歌单页做成干净的内容列表，后续再替换成真实接口数据。</p>
      </div>
    </section>

    <section class="playlist-grid app-grid">
      <motion.article
        v-for="(playlist, index) in playlists"
        :key="playlist.title"
        class="playlist-card glass-panel"
        :initial="staggeredEnter(index).initial"
        :animate="staggeredEnter(index).animate"
      >
        <div class="playlist-card__cover" :style="{ background: playlist.cover }"></div>
        <div class="playlist-card__body">
          <span class="playlist-card__tag">{{ playlist.tag }}</span>
          <h2>{{ playlist.title }}</h2>
          <p>{{ playlist.description }}</p>
          <footer>
            <strong>{{ playlist.count }} 首</strong>
            <span>{{ playlist.mood }}</span>
          </footer>
        </div>
      </motion.article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { motion } from 'motion-v'
import { staggeredEnter } from '../lib/motion'

const playlists = [
  {
    title: '日落驾驶',
    tag: 'City Pop',
    description: '明亮合成器和缓慢鼓点，适合傍晚通勤和夜色开始前的那段路。',
    count: 28,
    mood: 'Warm Ride',
    cover: 'linear-gradient(135deg, rgba(249,115,22,.86), rgba(251,191,36,.76))',
  },
  {
    title: '凌晨写代码',
    tag: 'Lo-fi',
    description: '没有侵略性的节奏和细腻氛围噪声，让注意力稳定待在屏幕中央。',
    count: 41,
    mood: 'Deep Focus',
    cover: 'linear-gradient(135deg, rgba(59,130,246,.82), rgba(15,23,42,.88))',
  },
  {
    title: '通透清晨',
    tag: 'Acoustic',
    description: '吉他、钢琴和女声主导，适合打开窗的时候播放。',
    count: 22,
    mood: 'Fresh Start',
    cover: 'linear-gradient(135deg, rgba(34,197,94,.78), rgba(132,204,22,.72))',
  },
  {
    title: '低频健身房',
    tag: 'Bass',
    description: '更密集的鼓点和低频推进，适合需要提速的训练段落。',
    count: 36,
    mood: 'High Energy',
    cover: 'linear-gradient(135deg, rgba(236,72,153,.82), rgba(124,58,237,.82))',
  },
]
</script>

<style scoped lang="scss">
.playlist-grid {
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.playlist-card {
  overflow: hidden;
  border-radius: var(--radius-lg);
}

.playlist-card__cover {
  height: 170px;
}

.playlist-card__body {
  padding: 20px;

  h2 {
    margin-top: 10px;
    font-size: 1.25rem;
    letter-spacing: -0.04em;
  }

  p {
    margin-top: 10px;
    color: var(--text-secondary);
    line-height: 1.7;
  }

  footer {
    margin-top: 18px;
    display: flex;
    justify-content: space-between;
    color: var(--text-secondary);
  }
}

.playlist-card__tag {
  display: inline-flex;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.26);
  font-size: 0.78rem;
  font-weight: 700;
}
</style>
