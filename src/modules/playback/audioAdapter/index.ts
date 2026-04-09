import type { AudioAdapter } from './types'
import { Html5AudioAdapter } from './html5Adapter'
import { NativeAudioAdapter } from './nativeAdapter'

export type { AudioAdapter } from './types'

type AudioPlatform = 'html5' | 'native'

/**
 * 检测当前运行平台应该使用的音频策略
 *
 * 策略选择逻辑:
 *   - Android (Mobile/TV) → native（Tauri invoke → rodio/ExoPlayer）
 *   - Windows → html5（WebView2 autoplay 策略在 Rust 层配置）
 *   - macOS / Linux → html5（WebKit/WebKitGTK 原生支持良好）
 *   - 浏览器降级 → html5
 */
function detectAudioPlatform(): AudioPlatform {
  // 1. 非 Tauri 环境，只能用 HTML5
  if (!('__TAURI_INTERNALS__' in window)) return 'html5'

  // 2. Android 平台使用原生播放器
  try {
    const meta = (window as any).__TAURI_INTERNALS__?.metadata
    if (meta?.platform === 'android' || meta?.platform === 'ios') return 'native'
  } catch {}

  // 3. 桌面端使用 HTML5 Audio
  //    Windows WebView2 的 autoplay 策略在 Rust setup hook 中已配置
  return 'html5'
}

/**
 * 创建当前平台对应的 AudioAdapter 实例
 */
export function createAudioAdapter(): AudioAdapter {
  const platform = detectAudioPlatform()

  switch (platform) {
    case 'native':
      return new NativeAudioAdapter()
    case 'html5':
    default:
      return new Html5AudioAdapter()
  }
}
