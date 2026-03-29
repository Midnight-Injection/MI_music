import fs from 'node:fs/promises'
import path from 'node:path'

const endpoint = process.env.MCP_BRIDGE_URL ?? 'ws://127.0.0.1:9223'
const outputDir = path.resolve('artifacts/window-validation')

await fs.mkdir(outputDir, { recursive: true })

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function send(payload) {
  return await new Promise((resolve, reject) => {
    const ws = new WebSocket(endpoint)
    const timer = setTimeout(() => {
      ws.close()
      reject(new Error(`timeout:${payload.id}`))
    }, 10000)

    ws.addEventListener('open', () => {
      ws.send(JSON.stringify(payload))
    })

    ws.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data))

      if (message.id !== payload.id) {
        return
      }

      clearTimeout(timer)
      ws.close()

      if (message.success === false) {
        reject(new Error(message.error || payload.id))
        return
      }

      resolve(message.data)
    })

    ws.addEventListener('error', (event) => {
      clearTimeout(timer)
      reject(new Error(String(event.message ?? event.type ?? event)))
    })
  })
}

async function getWindowInfo(id) {
  return await send({
    id,
    command: 'get_window_info',
    args: {
      windowId: 'main',
    },
  })
}

async function resizeWindow(id, width, height) {
  return await send({
    id,
    command: 'resize_window',
    args: {
      windowId: 'main',
      width,
      height,
      logical: true,
    },
  })
}

async function captureScreenshot(name) {
  const dataUrl = await send({
    id: `screenshot:${name}`,
    command: 'capture_native_screenshot',
    args: {
      windowLabel: 'main',
      format: 'png',
    },
  })

  const filePath = path.join(outputDir, `${name}.png`)
  const base64 = String(dataUrl).replace(/^data:image\/png;base64,/, '')
  await fs.writeFile(filePath, Buffer.from(base64, 'base64'))
  return filePath
}

async function executeJs(id, script) {
  return await send({
    id,
    command: 'execute_js',
    args: {
      windowLabel: 'main',
      script,
    },
  })
}

async function assertMainWindowResponsive(step) {
  return await executeJs(
    `responsive:${step}`,
    `(() => ({
      title: document.title,
      hash: window.location.hash,
      readyState: document.readyState
    }))()`
  )
}

async function clickSidebarAndReturn(step) {
  const goToSongList = await executeJs(
    `click:song-list:${step}`,
    `(() => {
      const links = Array.from(document.querySelectorAll('.sidebar__nav-item'))
      const songListLink = links[1]
      if (!(songListLink instanceof HTMLElement)) {
        throw new Error('song list link not found')
      }

      songListLink.click()
      return {
        clicked: true,
        hash: window.location.hash
      }
    })()`
  )

  await sleep(180)

  const afterSongList = await executeJs(
    `verify:song-list:${step}`,
    `(() => ({
      hash: window.location.hash,
      title: document.title
    }))()`
  )

  const backToSearch = await executeJs(
    `click:search:${step}`,
    `(() => {
      const links = Array.from(document.querySelectorAll('.sidebar__nav-item'))
      const searchLink = links[0]
      if (!(searchLink instanceof HTMLElement)) {
        throw new Error('search link not found')
      }

      searchLink.click()
      return {
        clicked: true,
        hash: window.location.hash
      }
    })()`
  )

  await sleep(180)

  const afterSearch = await executeJs(
    `verify:search:${step}`,
    `(() => ({
      hash: window.location.hash,
      title: document.title,
      hasSearchButton: Boolean(document.querySelector('.search-home__submit'))
    }))()`
  )

  return {
    goToSongList,
    afterSongList,
    backToSearch,
    afterSearch,
  }
}

async function clickSearchButton(step) {
  return await executeJs(
    `click:search-button:${step}`,
    `(() => {
      const button = document.querySelector('.search-home__submit')
      if (!(button instanceof HTMLButtonElement)) {
        throw new Error('search submit button not found')
      }

      button.click()
      return {
        clicked: true,
        disabled: button.disabled,
        hash: window.location.hash
      }
    })()`
  )
}

const targets = [
  { width: 1240, height: 860 },
  { width: 1360, height: 900 },
  { width: 1280, height: 880 },
]

const summary = {
  endpoint,
  before: await getWindowInfo('window:before'),
  responsiveBefore: await assertMainWindowResponsive('before'),
  baselineInteractions: {
    sidebar: await clickSidebarAndReturn('before'),
    searchButton: await clickSearchButton('before'),
  },
  screenshots: {
    before: await captureScreenshot('before-resize'),
  },
  cycles: [],
}

for (const [index, target] of targets.entries()) {
  const resizeResult = await resizeWindow(`resize:${index + 1}`, target.width, target.height)
  await sleep(300)

  summary.cycles.push({
    index: index + 1,
    target,
    resizeResult,
    windowInfo: await getWindowInfo(`window:${index + 1}`),
    responsive: await assertMainWindowResponsive(`cycle-${index + 1}`),
    interactions: {
      sidebar: await clickSidebarAndReturn(`cycle-${index + 1}`),
      searchButton: await clickSearchButton(`cycle-${index + 1}`),
    },
  })
}

summary.after = await getWindowInfo('window:after')
summary.responsiveAfter = await assertMainWindowResponsive('after')
summary.screenshots.after = await captureScreenshot('after-resize')

const summaryPath = path.join(outputDir, 'native-resize-summary.json')
await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2))

console.log(JSON.stringify(summary, null, 2))
console.log(`artifacts: ${outputDir}`)
