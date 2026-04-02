<template>
  <NConfigProvider :theme="darkTheme" :theme-overrides="themeOverrides" :cls-prefix="undefined">
    <NMessageProvider>
      <NDialogProvider>
        <NNotificationProvider>
          <AppBootstrap v-slot="{ isReady, errorMessage }">
            <DesktopWindowShell :caption="windowCaption" :is-ready="isReady" :error-message="errorMessage">
              <AppLayoutShell />
            </DesktopWindowShell>
          </AppBootstrap>
        </NNotificationProvider>
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { darkTheme, NConfigProvider, NMessageProvider, NDialogProvider, NNotificationProvider } from 'naive-ui'
import AppBootstrap from './components/app/AppBootstrap.vue'
import AppLayoutShell from './components/layout/AppLayoutShell.vue'
import DesktopWindowShell from './components/layout/DesktopWindowShell.vue'
import { themeOverrides } from './plugins/naive-ui'

const route = useRoute()
const windowCaption = computed(() => String(route.meta.title || '极域音乐'))
</script>

<style lang="scss">
@use './assets/styles/variables.scss';
@use './assets/styles/base.scss';

.n-config-provider {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: grid;
  overflow: hidden;
}
</style>
