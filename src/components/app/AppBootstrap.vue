<template>
  <div class="app-bootstrap">
    <div v-if="!hasBootstrapped" class="app-bootstrap__splash">
      <div class="app-bootstrap__card glass-panel">
        <div class="app-bootstrap__spinner"></div>
        <strong>正在启动极域音乐</strong>
        <span>初始化主题、数据库与自定义音源…</span>
      </div>
    </div>

    <template v-else>
      <slot
        :hasBootstrapped="hasBootstrapped"
        :isLoading="isLoading"
        :isReady="isReady"
        :errorMessage="errorMessage"
      />

      <div v-if="errorMessage" class="app-bootstrap__notice glass-panel" role="status">
        <div class="app-bootstrap__notice-copy">
          <strong>应用已进入降级模式</strong>
          <span>{{ errorMessage }}</span>
        </div>
        <button type="button" class="app-bootstrap__retry" @click="bootstrapApp">
          重试初始化
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useAppBootstrap } from '../../composables/useAppBootstrap'

const { hasBootstrapped, isLoading, isReady, errorMessage, bootstrapApp } = useAppBootstrap()

onMounted(() => {
  void bootstrapApp()
})
</script>

<style scoped lang="scss">
.app-bootstrap {
  width: 100%;
  height: 100%;
  min-height: 0;
  position: relative;
}

.app-bootstrap__splash {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  padding: 24px;
}

.app-bootstrap__card {
  min-width: min(420px, 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 28px 32px;
  border-radius: 28px;
  text-align: center;

  strong {
    font-size: 1.04rem;
    letter-spacing: -0.03em;
  }

  span {
    color: var(--text-secondary);
    font-size: 0.82rem;
  }
}

.app-bootstrap__spinner {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.14);
  border-top-color: rgba(255, 255, 255, 0.88);
  animation: spin 0.9s linear infinite;
}

.app-bootstrap__notice {
  position: absolute;
  top: 16px;
  right: 16px;
  max-width: min(460px, calc(100% - 32px));
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border-radius: 20px;
  background: color-mix(in srgb, var(--warning-color) 10%, rgba(255, 255, 255, 0.08));
  z-index: 24;
}

.app-bootstrap__notice-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;

  strong {
    font-size: 0.84rem;
  }

  span {
    color: var(--text-secondary);
    font-size: 0.74rem;
    line-height: 1.45;
  }
}

.app-bootstrap__retry {
  flex: 0 0 auto;
  min-height: 38px;
  padding: 0 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  color: var(--text-primary);
  font-weight: 700;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 720px) {
  .app-bootstrap__notice {
    top: auto;
    right: 12px;
    bottom: 12px;
    left: 12px;
    max-width: none;
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
