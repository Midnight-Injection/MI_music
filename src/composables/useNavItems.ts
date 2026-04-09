export interface NavItem {
  path: string
  label: string
  icon: string
}

const navItems: NavItem[] = [
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

// 移动端底部 Tab 用的精简导航项（5个主tab）
const mobileTabItems: NavItem[] = [
  navItems[0], // 搜索
  navItems[1], // 歌单
  navItems[2], // 榜单
  navItems[3], // 我的歌单
  navItems[5], // 设置
]

export function useNavItems() {
  return { navItems, mobileTabItems }
}
