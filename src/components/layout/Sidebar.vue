<template>
  <aside class="sidebar">
    <div class="sidebar__brand">
      <div class="sidebar__logo">
        <span></span>
      </div>
      <div class="sidebar__brand-copy">
        <strong>极域音乐</strong>
        <small>Desktop Player</small>
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

    <div class="sidebar__panel">
      <div class="sidebar__profile">
        <div class="sidebar__avatar">JY</div>
        <div class="sidebar__profile-copy">
          <strong>极域桌面端</strong>
          <span>已同步本地歌单与搜索记录</span>
        </div>
      </div>

      <div class="sidebar__panel-tags">
        <span>Search</span>
        <span>Player</span>
        <span>Playlist</span>
      </div>
    </div>
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
  min-width: 0;
  min-height: 0;
  padding: 18px 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow: auto;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.08), transparent 26%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.025));
  backdrop-filter: blur(18px);
  box-shadow: var(--panel-shadow-soft);
}

.sidebar__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 2px 4px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.14);
}

.sidebar__logo {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at 30% 25%, rgba(255, 255, 255, 0.34), transparent 30%),
    linear-gradient(145deg, #cfbbff, #8a68e0);
  box-shadow: 0 18px 36px rgba(74, 48, 134, 0.26);

  span {
    width: 16px;
    height: 16px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.92);
  }
}

.sidebar__brand-copy {
  strong,
  small {
    display: block;
  }

  strong {
    font-size: 0.92rem;
    letter-spacing: -0.03em;
  }

  small {
    margin-top: 3px;
    color: var(--text-tertiary);
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
  }
}

.sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.sidebar__nav-item {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  align-items: center;
  gap: 9px;
  min-height: 44px;
  padding: 0 12px;
  border-radius: 16px;
  color: var(--text-secondary);
  border: 1px solid transparent;
  background: rgba(255, 255, 255, 0.045);

  svg {
    width: 18px;
    height: 18px;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  span {
    font-size: 0.82rem;
    font-weight: 600;
  }

  &:hover,
  &.is-active {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(215, 192, 255, 0.08));
    color: var(--text-primary);
    border-color: rgba(255, 255, 255, 0.14);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
  }
}

.sidebar__panel {
  margin-top: auto;
  padding: 14px;
  border-radius: 14px;
  background:
    radial-gradient(circle at top right, rgba(255, 255, 255, 0.1), transparent 28%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.035));
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.sidebar__profile {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
}

.sidebar__avatar {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.28), rgba(210, 185, 255, 0.18));
  color: var(--text-primary);
  font-size: 0.84rem;
  font-weight: 800;
  letter-spacing: 0.06em;
}

.sidebar__profile-copy {
  min-width: 0;

  strong,
  span {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    font-size: 0.82rem;
  }

  span {
    margin-top: 4px;
    color: var(--text-secondary);
    font-size: 0.68rem;
    line-height: 1.4;
  }
}

.sidebar__panel-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;

  span {
    padding: 4px 8px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.1);
    color: var(--text-primary);
    font-size: 0.66rem;
  }
}

</style>
