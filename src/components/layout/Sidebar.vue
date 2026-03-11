<template>
  <aside class="sidebar">
    <nav class="nav">
      <router-link
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="nav-item"
        active-class="active"
      >
        <span class="icon">{{ item.icon }}</span>
        <span class="label">{{ item.label }}</span>
      </router-link>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface NavItem {
  path: string
  icon: string
  label: string
}

const navItems = ref<NavItem[]>([
  { path: '/search', icon: '🔍', label: '搜索' },
  { path: '/songList', icon: '📋', label: '歌单' },
  { path: '/leaderboard', icon: '🏆', label: '榜单' },
  { path: '/list', icon: '🎵', label: '我的歌单' },
  { path: '/download', icon: '⬇️', label: '下载' },
  { path: '/setting', icon: '⚙️', label: '设置' }
])
</script>

<style scoped lang="scss">
.sidebar {
  width: 200px;
  height: 100vh;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  padding: 20px 0;

  .nav {
    display: flex;
    flex-direction: column;
    gap: 8px;

    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 20px;
      color: var(--text-secondary);
      text-decoration: none;
      transition: all 0.2s;
      cursor: pointer;

      &:hover {
        background: var(--bg-hover);
        color: var(--text-primary);
      }

      &.active {
        background: var(--primary-color);
        color: white;
      }

      .icon {
        font-size: 20px;
      }

      .label {
        font-size: 14px;
      }
    }
  }
}
</style>
