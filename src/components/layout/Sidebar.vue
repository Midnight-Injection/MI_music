<template>
  <aside class="sidebar">
    <div class="sidebar__brand">
      <div class="sidebar__logo">
        <span></span>
      </div>
      <div>
        <strong>极域音乐</strong>
        <small>Desktop player</small>
      </div>
    </div>

    <nav class="sidebar__nav">
      <router-link
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="sidebar__nav-item"
        active-class="is-active"
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path :d="item.icon" />
        </svg>
        <span>{{ item.label }}</span>
      </router-link>
    </nav>
  </aside>
</template>

<script setup lang="ts">
const navItems = [
  {
    path: '/search',
    label: '搜索',
    icon: 'M10.5 4a6.5 6.5 0 1 0 4.03 11.6l4.44 4.44 1.41-1.41-4.44-4.44A6.5 6.5 0 0 0 10.5 4Z M6 10.5a4.5 4.5 0 1 1 9 0a4.5 4.5 0 0 1-9 0Z',
  },
  {
    path: '/songList',
    label: '歌单',
    icon: 'M5 6.5h14M5 12h14M5 17.5h9M17 16V8l4 2.25V18L17 16Z',
  },
  {
    path: '/leaderboard',
    label: '榜单',
    icon: 'M6 18.5h12M8 18.5V11m4 7.5V6m4 12.5v-9',
  },
  {
    path: '/list',
    label: '我的歌单',
    icon: 'M6 7h12M6 12h12M6 17h7M17.5 15.5V8l3.5 1.8v5.7',
  },
  {
    path: '/download',
    label: '下载',
    icon: 'M12 4v10m0 0l4-4m-4 4l-4-4M5 19h14',
  },
  {
    path: '/setting',
    label: '设置',
    icon: 'M12 8.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 0 0 0-7Zm8 3.5l-1.83-.4a6.98 6.98 0 0 0-.65-1.57l1.03-1.56-1.41-1.41-1.56 1.03a6.98 6.98 0 0 0-1.57-.65L12 4l-1.81 1.83a6.98 6.98 0 0 0-1.57.65L7.06 5.45 5.64 6.86l1.03 1.56c-.28.5-.49 1.02-.65 1.57L4.2 12l1.82 1.81c.16.55.37 1.07.65 1.57l-1.03 1.56 1.42 1.41 1.56-1.03c.5.28 1.02.49 1.57.65L12 20l1.83-1.82c.55-.16 1.07-.37 1.57-.65l1.56 1.03 1.41-1.41-1.03-1.56c.28-.5.49-1.02.65-1.57L20 12Z',
  },
]
</script>

<style scoped lang="scss">
.sidebar {
  height: 100%;
  padding: 18px 14px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  border-right: 1px solid var(--border-light);
  background: color-mix(in srgb, var(--bg-secondary) 82%, transparent);
  backdrop-filter: blur(16px);
}

.sidebar__brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 8px 14px;
  border-bottom: 1px solid var(--border-color);

  strong,
  small {
    display: block;
  }

  strong {
    font-size: 1rem;
    letter-spacing: -0.03em;
  }

  small {
    margin-top: 2px;
    color: var(--text-tertiary);
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }
}

.sidebar__logo {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: linear-gradient(145deg, var(--primary-color), #facc15);
  box-shadow: 0 12px 24px rgba(249, 115, 22, 0.18);

  span {
    width: 16px;
    height: 16px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.9);
  }
}

.sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sidebar__nav-item {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  min-height: 44px;
  padding: 0 14px;
  border-radius: 16px;
  color: var(--text-secondary);

  svg {
    width: 18px;
    height: 18px;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  span {
    font-size: 0.92rem;
    font-weight: 600;
  }

  &:hover,
  &.is-active {
    background: color-mix(in srgb, var(--primary-light) 88%, transparent);
    color: var(--primary-color);
  }
}

@media (max-width: 900px) {
  .sidebar {
    position: fixed;
    inset: 14px 14px auto;
    height: auto;
    padding: 10px;
    border-radius: 20px;
    z-index: 10;
  }

  .sidebar__brand {
    display: none;
  }

  .sidebar__nav {
    flex-direction: row;
    overflow: auto;
  }

  .sidebar__nav-item {
    min-width: 110px;
  }
}
</style>
