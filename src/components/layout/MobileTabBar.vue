<template>
  <nav class="mobile-tab-bar">
    <router-link
      v-for="item in mobileTabItems"
      :key="item.path"
      :to="item.path"
      class="mobile-tab-bar__item"
      active-class="is-active"
    >
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path :d="item.icon" />
      </svg>
      <span>{{ item.label }}</span>
    </router-link>
  </nav>
</template>

<script setup lang="ts">
import { useNavItems } from '../../composables/useNavItems'

const { mobileTabItems } = useNavItems()
</script>
