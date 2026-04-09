<template>
  <aside class="sidebar">
    <div class="sidebar__brand">
      <div class="sidebar__logo">
        <span></span>
      </div>
      <div class="sidebar__brand-copy">
        <strong>极域音乐</strong>
        <small>{{ uiMode.isTV ? 'TV Player' : uiMode.isMobile ? 'Mobile Player' : 'Desktop Player' }}</small>
      </div>
    </div>

    <nav class="sidebar__nav">
      <router-link
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="sidebar__nav-item"
        active-class="is-active"
        tabindex="0"
        :data-tv-focusable="uiMode.isTV ? '' : undefined"
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path :d="item.icon" />
        </svg>
        <span>{{ item.label }}</span>
      </router-link>
    </nav>

    <div v-if="!uiMode.isTV && !uiMode.isMobile" class="sidebar__panel">
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
import { useUIModeStore } from '../../store/uiMode'
import { useNavItems } from '../../composables/useNavItems'

const uiMode = useUIModeStore()
const { navItems } = useNavItems()
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

// === TV 模式适配 ===
[data-ui-mode='tv'] {
  .sidebar {
    padding: 24px 16px 20px;
    border-radius: var(--radius-lg);
    backdrop-filter: none;
  }

  .sidebar__logo {
    width: 56px;
    height: 56px;
    border-radius: 18px;

    span {
      width: 22px;
      height: 22px;
    }
  }

  .sidebar__brand-copy strong {
    font-size: 1.2rem;
  }

  .sidebar__brand-copy small {
    font-size: 0.78rem;
  }

  .sidebar__nav-item {
    min-height: 56px;
    padding: 0 16px;
    border-radius: 18px;

    svg {
      width: 24px;
      height: 24px;
    }

    span {
      font-size: 1.06rem;
    }
  }
}

</style>

<style lang="scss">
.app-layout-shell--compact .sidebar {
  flex-direction: row;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  overflow-x: auto;
  overflow-y: hidden;
}

.app-layout-shell--compact .sidebar__brand {
  flex-shrink: 0;
  gap: 8px;
  padding: 0 6px 0 0;
  border-bottom: none;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
}

.app-layout-shell--compact .sidebar__logo {
  width: 28px;
  height: 28px;
  border-radius: 10px;
}

.app-layout-shell--compact .sidebar__logo span {
  width: 10px;
  height: 10px;
}

.app-layout-shell--compact .sidebar__brand-copy {
  display: none;
}

.app-layout-shell--compact .sidebar__nav {
  flex-direction: row;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.app-layout-shell--compact .sidebar__nav-item {
  min-height: 30px;
  min-width: 30px;
  padding: 0;
  border-radius: 8px;
  flex: 0 0 auto;
  justify-content: center;
}

.app-layout-shell--compact .sidebar__nav-item span {
  display: none;
}

.app-layout-shell--compact .sidebar__nav-item svg {
  width: 16px;
  height: 16px;
}

.app-layout-shell--compact .sidebar__panel {
  display: none;
}
</style>
