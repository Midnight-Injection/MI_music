import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/search'
  },
  {
    path: '/search',
    name: 'Search',
    component: () => import('../views/Search.vue'),
    meta: { title: '搜索' }
  },
  {
    path: '/songList',
    name: 'SongList',
    component: () => import('../views/SongList.vue'),
    meta: { title: '歌单' }
  },
  {
    path: '/leaderboard',
    name: 'Leaderboard',
    component: () => import('../views/Leaderboard.vue'),
    meta: { title: '榜单' }
  },
  {
    path: '/list',
    name: 'List',
    component: () => import('../views/List.vue'),
    meta: { title: '我的歌单' }
  },
  {
    path: '/download',
    name: 'Download',
    component: () => import('../views/Download.vue'),
    meta: { title: '下载' }
  },
  {
    path: '/setting',
    name: 'Setting',
    component: () => import('../views/Setting.vue'),
    meta: { title: '设置' }
  },
  {
    path: '/player',
    name: 'PlayerDetail',
    component: () => import('../views/PlayerDetail.vue'),
    meta: { title: '播放器' }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
