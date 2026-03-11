<template>
  <header class="header">
    <div class="search-box">
      <input
        v-model="searchText"
        type="text"
        placeholder="搜索歌曲、歌手..."
        class="search-input"
        @keyup.enter="handleSearch"
      />
      <button class="search-button" @click="handleSearch">搜索</button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const searchText = ref('')

function handleSearch() {
  if (searchText.value.trim()) {
    router.push({ path: '/search', query: { q: searchText.value } })
  }
}
</script>

<style scoped lang="scss">
.header {
  height: 60px;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  padding: 0 20px;

  .search-box {
    display: flex;
    gap: 10px;
    flex: 1;
    max-width: 600px;

    .search-input {
      flex: 1;
      padding: 8px 16px;
      border: 1px solid var(--border-color);
      border-radius: 4px;
      background: var(--bg-secondary);
      color: var(--text-primary);
      outline: none;

      &:focus {
        border-color: var(--primary-color);
      }
    }

    .search-button {
      padding: 8px 20px;
      background: var(--primary-color);
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: opacity 0.2s;

      &:hover {
        opacity: 0.9;
      }
    }
  }
}
</style>
