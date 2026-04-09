/**
 * TV D-Pad 导航管理器
 * 处理遥控器方向键、确认键、返回键的导航逻辑
 */

type NavigationZone = 'sidebar' | 'main' | 'player'

const ZONES: NavigationZone[] = ['sidebar', 'main', 'player']

export class TVNavigationManager {
  private currentZone: NavigationZone = 'sidebar'
  private handleKeyBound: (e: KeyboardEvent) => void

  constructor() {
    this.handleKeyBound = this.handleKey.bind(this)
  }

  install() {
    document.addEventListener('keydown', this.handleKeyBound)
  }

  uninstall() {
    document.removeEventListener('keydown', this.handleKeyBound)
  }

  private handleKey(e: KeyboardEvent) {
    // 不拦截输入框内的按键
    if (
      e.target instanceof HTMLInputElement
      || e.target instanceof HTMLTextAreaElement
    ) return

    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowDown':
        this.handleVerticalNav(e)
        break
      case 'ArrowLeft':
      case 'ArrowRight':
        this.handleHorizontalNav(e)
        break
      case 'Enter':
        this.activateFocused()
        break
      case 'Escape':
      case 'Backspace':
        this.goBack()
        break
      default:
        break
    }
  }

  private handleVerticalNav(e: KeyboardEvent) {
    e.preventDefault()
    const focusables = this.getZoneFocusables(this.currentZone)
    if (!focusables.length) return

    const activeIndex = this.findActiveIndex(focusables)
    const direction = e.key === 'ArrowUp' ? -1 : 1
    const nextIndex = Math.max(0, Math.min(focusables.length - 1, activeIndex + direction))

    focusables[nextIndex]?.focus()
  }

  private handleHorizontalNav(e: KeyboardEvent) {
    e.preventDefault()
    const focusables = this.getZoneFocusables(this.currentZone)

    // 如果当前区域有多个可聚焦元素，先在区域内水平导航
    if (focusables.length > 1) {
      const activeIndex = this.findActiveIndex(focusables)
      const direction = e.key === 'ArrowLeft' ? -1 : 1
      const nextIndex = activeIndex + direction

      // 如果还在范围内，区域内导航
      if (nextIndex >= 0 && nextIndex < focusables.length) {
        focusables[nextIndex]?.focus()
        return
      }
    }

    // 区域间切换
    const zoneIndex = ZONES.indexOf(this.currentZone)
    const direction = e.key === 'ArrowLeft' ? -1 : 1
    const nextZoneIndex = zoneIndex + direction

    if (nextZoneIndex >= 0 && nextZoneIndex < ZONES.length) {
      this.switchZone(ZONES[nextZoneIndex])
    }
  }

  private switchZone(zone: NavigationZone) {
    this.currentZone = zone
    const focusables = this.getZoneFocusables(zone)
    if (focusables.length) {
      focusables[0]?.focus()
    }
  }

  private activateFocused() {
    const focused = document.activeElement
    if (focused && focused instanceof HTMLElement) {
      focused.click()
    }
  }

  private goBack() {
    window.history.back()
  }

  private getZoneFocusables(zone: NavigationZone): HTMLElement[] {
    const selector = zone === 'sidebar'
      ? '.sidebar [data-tv-focusable]'
      : zone === 'player'
        ? '.player-bar [data-tv-focusable]'
        : '.app-layout-shell__main [data-tv-focusable]'

    return Array.from(document.querySelectorAll<HTMLElement>(selector))
      .filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null)
  }

  private findActiveIndex(focusables: HTMLElement[]): number {
    const active = document.activeElement
    const index = focusables.indexOf(active as HTMLElement)
    return index >= 0 ? index : 0
  }
}

// 单例
let instance: TVNavigationManager | null = null

export function installTVNavigation() {
  if (instance) return
  instance = new TVNavigationManager()
  instance.install()
}

export function uninstallTVNavigation() {
  if (!instance) return
  instance.uninstall()
  instance = null
}
