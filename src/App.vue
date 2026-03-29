<template>
  <AppBootstrap v-slot="{ isReady, errorMessage }">
    <DesktopWindowShell :caption="windowCaption" :is-ready="isReady" :error-message="errorMessage">
      <AppLayoutShell />
    </DesktopWindowShell>
  </AppBootstrap>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppBootstrap from './components/app/AppBootstrap.vue'
import AppLayoutShell from './components/layout/AppLayoutShell.vue'
import DesktopWindowShell from './components/layout/DesktopWindowShell.vue'

const route = useRoute()
const windowCaption = computed(() => String(route.meta.title || '极域音乐'))
</script>

<style lang="scss">
@use './assets/styles/variables.scss';
@use './assets/styles/base.scss';
</style>
