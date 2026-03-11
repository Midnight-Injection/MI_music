/**
 * Script Runtime Composable
 *
 * Executes user music source scripts (LX Music format) for search and URL resolution.
 */

import { ref, getCurrentScope, onScopeDispose } from 'vue'
import { useUserSourceStore } from '../stores/userSource'
import type { UserSourceScript } from '../types/userSource'
import { invoke } from '@tauri-apps/api/core'
import CryptoJS from 'crypto-js'

export type MusicSource = 'kw' | 'kg' | 'tx' | 'wy' | 'mg' | 'local'
export type ScriptAction = 'musicUrl' | 'lyric' | 'pic' | 'search'

export interface ScriptSource {
  name: string
  type: string
  actions: string[]
  qualitys: string[]
}

export interface ScriptMusicInfo {
  name: string
  singer: string
  songmid?: string
  hash?: string
  albumId?: string
  albumName?: string
  interval?: number
  type?: string
  source?: string
  [key: string]: any
}

interface MusicUrlRequestInfo {
  type: string
  musicInfo: ScriptMusicInfo
}

interface SearchRequestInfo {
  keyword: string
  page: number
  limit: number
}

interface RequestEvent<TInfo = MusicUrlRequestInfo | SearchRequestInfo | Record<string, any>> {
  action: ScriptAction
  source: MusicSource
  info: TInfo
}

interface ScriptInstance {
  id: string
  script: string
  sources: Record<string, ScriptSource>
  handlers: Array<(event: RequestEvent) => Promise<any>>
  initialized: boolean
}

export interface ScriptCapability {
  channels: string[]
  canSearch: boolean
  canGetMusicUrl: boolean
}

const lxInstances = new Map<string, ScriptInstance>()

function buildCapabilityFromSource(source: Pick<UserSourceScript, 'sources'>): ScriptCapability {
  const channels = Object.keys(source.sources || {})
  const actionSet = new Set(
    Object.values(source.sources || {}).flatMap(item => item.actions || []),
  )

  return {
    channels,
    canSearch: actionSet.has('search'),
    canGetMusicUrl: actionSet.has('musicUrl'),
  }
}

function buildMockScriptResponse(url: string, source: UserSourceScript) {
  const normalizedUrl = url.toLowerCase()
  const sourceVersion = source.version || '1.0.0'
  const rawScript = source.script || ''
  const rawScriptHash = CryptoJS.MD5(rawScript.trim()).toString()
  const serializedSources = Object.entries(source.sources || {})
    .map(([channel, info]) => [channel, ...(info.qualitys || [])].join('|'))
    .join('&')

  if (normalizedUrl.includes('checkupdate=')) {
    return {
      statusCode: 200,
      body: { code: 0, data: null },
    }
  }

  if (normalizedUrl.endsWith('/package.json')) {
    return {
      statusCode: 200,
      body: { version: sourceVersion },
    }
  }

  if (normalizedUrl.includes('/urlinfo/')) {
    return {
      statusCode: 200,
      body: {
        m: rawScriptHash,
        s: serializedSources,
      },
    }
  }

  return null
}

function normalizeRequestHeaders(headers?: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {}

  for (const [key, value] of Object.entries(headers || {})) {
    if (value == null) continue
    const normalized = Array.isArray(value)
      ? JSON.stringify(value)
      : typeof value === 'object'
        ? JSON.stringify(value)
        : String(value)
    result[key] = normalized.replace(/[\r\n]+/g, '')
  }

  return result
}

function hasHeader(headers: Record<string, string>, name: string): boolean {
  const target = name.toLowerCase()
  return Object.keys(headers).some(key => key.toLowerCase() === target)
}

function serializeFormValue(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

function serializeFormBody(form: unknown): string | null {
  if (form == null) return null

  if (typeof URLSearchParams !== 'undefined' && form instanceof URLSearchParams) {
    return form.toString()
  }

  const searchParams = new URLSearchParams()

  if (Array.isArray(form)) {
    for (const entry of form) {
      if (!Array.isArray(entry) || entry.length < 2) continue
      searchParams.append(String(entry[0]), serializeFormValue(entry[1]))
    }
    return searchParams.toString()
  }

  if (typeof form === 'object') {
    for (const [key, value] of Object.entries(form as Record<string, unknown>)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          searchParams.append(key, serializeFormValue(item))
        }
        continue
      }
      searchParams.append(key, serializeFormValue(value))
    }
    return searchParams.toString()
  }

  return String(form)
}

function serializeFormDataBody(formData: unknown): { contentType: string; body: { kind: 'base64'; data: string } } | null {
  if (typeof FormData === 'undefined' || !(formData instanceof FormData)) {
    return null
  }

  const boundary = `----jiyu-music-${Math.random().toString(16).slice(2)}`
  const chunks: Uint8Array[] = []
  const encoder = new TextEncoder()

  for (const [key, rawValue] of formData.entries()) {
    if (typeof rawValue !== 'string') {
      throw new Error('FormData file fields are not supported in script runtime')
    }

    chunks.push(
      encoder.encode(
        `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="${key}"\r\n\r\n` +
          `${rawValue}\r\n`,
      ),
    )
  }

  chunks.push(encoder.encode(`--${boundary}--\r\n`))

  const size = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0)
  const merged = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.byteLength
  }

  return {
    contentType: `multipart/form-data; boundary=${boundary}`,
    body: {
      kind: 'base64',
      data: btoa(String.fromCharCode(...merged)),
    },
  }
}

function serializeRequestBody(body: unknown): { kind: 'text' | 'base64'; data: string } | null {
  if (body == null) return null
  if (typeof body === 'string') {
    return { kind: 'text', data: body }
  }
  if (body instanceof ArrayBuffer) {
    return { kind: 'base64', data: btoa(String.fromCharCode(...new Uint8Array(body))) }
  }
  if (ArrayBuffer.isView(body)) {
    return { kind: 'base64', data: btoa(String.fromCharCode(...new Uint8Array(body.buffer, body.byteOffset, body.byteLength))) }
  }
  return { kind: 'text', data: typeof body === 'object' ? JSON.stringify(body) : String(body) }
}

function normalizeScriptResponseBody(body: unknown): unknown {
  if (typeof body !== 'string') return body
  try {
    return JSON.parse(body)
  } catch {
    return body
  }
}

function createLxApi(_sourceId: string, source: UserSourceScript) {
  const handlers: Array<(event: RequestEvent) => Promise<any>> = []
  let sources: Record<string, ScriptSource> = {}

  const EVENT_NAMES = {
    request: 'request',
    inited: 'inited',
    musicUrl: 'musicUrl',
    lyric: 'lyric',
    pic: 'pic',
    search: 'search',
  }

  async function request(url: string, options: any = {}, callback?: Function) {
    let cancelled = false
    const mockResponse = buildMockScriptResponse(url, source)
    if (mockResponse) {
      const body = normalizeScriptResponseBody(mockResponse.body)
      const response = {
        statusCode: mockResponse.statusCode,
        statusMessage: 'OK',
        headers: {},
        body,
      }
      if (callback && !cancelled) callback.call(lxApi, null, response, body)
      return () => {
        cancelled = true
      }
    }

    const headers = normalizeRequestHeaders(options.headers)
    let requestBody = serializeRequestBody(options.body)

    if (!requestBody && options.form != null) {
      const formBody = serializeFormBody(options.form)
      if (formBody != null) {
        requestBody = { kind: 'text', data: formBody }
        if (!hasHeader(headers, 'content-type')) {
          headers['content-type'] = 'application/x-www-form-urlencoded'
        }
      }
    } else if (!requestBody && options.formData != null) {
      const serializedFormData = serializeFormDataBody(options.formData)
      if (serializedFormData) {
        requestBody = serializedFormData.body
        if (!hasHeader(headers, 'content-type')) {
          headers['content-type'] = serializedFormData.contentType
        }
      }
    }

    void invoke<{
      statusCode: number
      statusMessage?: string
      body: unknown
      headers: Record<string, any>
      bytes?: number[]
      raw?: number[]
    }>('script_http_request', {
      request: {
        url,
        method: typeof options.method === 'string' ? options.method.toUpperCase() : 'GET',
        headers,
        body: requestBody,
        timeoutMs: options.timeout,
      },
    })
      .then((result) => {
        const body = normalizeScriptResponseBody(result.body)
        const response = {
          ...result,
          body,
        }
        if (callback && !cancelled) callback.call(lxApi, null, response, body)
      })
      .catch((error: any) => {
        if (callback && !cancelled) callback.call(lxApi, error, null, null)
      })

    return () => {
      cancelled = true
    }
  }

  function on(eventName: string, handler: (event: RequestEvent) => Promise<any>) {
    if (eventName === EVENT_NAMES.request) {
      handlers.push(handler)
    }
  }

  function send(eventName: string, data: any) {
    if (eventName === EVENT_NAMES.inited && data.status && data.sources) {
      sources = data.sources
    }
  }

  const utils = {
    buffer: {
      from(data: any, _encoding?: string) {
        if (typeof data === 'string') return new TextEncoder().encode(data)
        return new Uint8Array(data)
      },
      bufToString(buf: Uint8Array, encoding?: string) {
        if (encoding === 'base64') {
          return btoa(String.fromCharCode.apply(null, Array.from(buf)))
        }
        return new TextDecoder('utf-8').decode(buf)
      },
    },
    crypto: {
      /**
       * MD5 hash function
       * @param str String to hash
       * @returns MD5 hash as hex string
       */
      md5(str: string): string {
        return CryptoJS.MD5(str).toString()
      },

      /**
       * AES encryption
       * @param buffer Data to encrypt
       * @param mode Encryption mode (e.g., 'cbc', 'ecb')
       * @param key Encryption key
       * @param iv Initialization vector (optional)
       * @returns Encrypted data as WordArray
       */
      aesEncrypt(buffer: Uint8Array | string, mode: string, key: Uint8Array | string, iv?: Uint8Array | string): any {
        try {
          const data = typeof buffer === 'string' ? buffer : CryptoJS.lib.WordArray.create(buffer as any)
          const keyWordArray = typeof key === 'string' ? key : CryptoJS.lib.WordArray.create(key as any)
          const ivWordArray = iv ? (typeof iv === 'string' ? iv : CryptoJS.lib.WordArray.create(iv as any)) : undefined

          let encrypted: any
          if (mode.toLowerCase() === 'cbc') {
            encrypted = CryptoJS.AES.encrypt(data, keyWordArray, { iv: ivWordArray, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 })
          } else if (mode.toLowerCase() === 'ecb') {
            encrypted = CryptoJS.AES.encrypt(data, keyWordArray, { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 })
          } else {
            // Default to CBC
            encrypted = CryptoJS.AES.encrypt(data, keyWordArray, { iv: ivWordArray, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 })
          }

          return encrypted.ciphertext
        } catch (error) {
          console.error('[ScriptRuntime] aesEncrypt error:', error)
          throw error
        }
      },

      /**
       * Random bytes generation
       * @param size Number of bytes to generate
       * @returns Uint8Array of random bytes
       */
      randomBytes(size: number): Uint8Array {
        const array = new Uint8Array(size)
        crypto.getRandomValues(array)
        return array
      },

      /**
       * RSA encryption (not fully supported in browser)
       * @param buffer Data to encrypt
       * @param key RSA public key
       * @throws Error - RSA not commonly used in music scripts
       */
      rsaEncrypt(buffer: Uint8Array | string, key: string): never {
        throw new Error('RSA encryption not supported in browser context. This script may not be compatible.')
      },
    },
  }

  const lxApi = {
    EVENT_NAMES,
    request,
    on,
    send,
    utils,
    env: 'jiyu-music',
    version: '1.0.0',
    currentScriptInfo: {
      name: source.name || 'custom-source',
      version: source.version || '1.0.0',
      author: source.author || 'user',
      description: source.description || 'User custom music source',
      openUrl: source.homepage || '',
      url: source.homepage || '',
      checkUpdate: false,
      rawScript: source.script,
    },
    _handlers: handlers,
    _sources: sources
  }

  return lxApi
}

async function initScript(source: UserSourceScript): Promise<ScriptInstance | null> {
  const { id: sourceId, script } = source
  if (lxInstances.has(sourceId)) {
    return lxInstances.get(sourceId)!
  }

  console.log(`[ScriptRuntime] initScript called for ${sourceId}`)

  try {
    const lx = createLxApi(sourceId, source)

    // Store reference to restore after script execution
    const existingLx = (globalThis as any).lx

    // Set globalThis.lx for script execution
    ;(globalThis as any).lx = lx

    try {
      // Don't wrap the script - LX Music scripts are self-contained
      // They access globalThis.lx directly and call on()/send() to register handlers
      const scriptFunc = new Function(`
        ${script}
      `)

      // Execute the script
      scriptFunc()

      // Wait for async initialization in scripts
      // Scripts should call lx.send('inited', { sources, status }) when ready
      // Give more time for heavily obfuscated scripts
      await new Promise(resolve => setTimeout(resolve, 500))

      const sourceKeys = Object.keys(lx._sources)
      const handlerCount = lx._handlers.length

      console.log(`[ScriptRuntime] Script ${sourceId} loaded: ${sourceKeys.length} sources (${sourceKeys.join(', ') || 'none'}), ${handlerCount} handlers`)

      if (handlerCount === 0) {
        console.warn(`[ScriptRuntime] Script ${sourceId} registered no handlers - script may not be compatible`)
      }

      const instance: ScriptInstance = {
        id: sourceId,
        script,
        sources: lx._sources,
        handlers: lx._handlers,
        initialized: true,
      }

      lxInstances.set(sourceId, instance)
      return instance
    } finally {
      // Restore previous lx or delete if none existed
      if (existingLx) {
        ;(globalThis as any).lx = existingLx
      } else {
        delete (globalThis as any).lx
      }
    }
  } catch (error) {
    console.error(`[ScriptRuntime] Failed to init script ${sourceId}:`, error)
    return null
  }
}

function getSupportedChannels(instance: ScriptInstance, action?: ScriptAction): MusicSource[] {
  return Object.entries(instance.sources)
    .filter(([, source]) => !action || source.actions?.includes(action))
    .map(([channel]) => channel as MusicSource)
}

function extractSearchItems(result: any): any[] {
  if (Array.isArray(result)) return result
  if (result && typeof result === 'object') {
    if (Array.isArray(result.list)) return result.list
    if (Array.isArray(result.data)) return result.data
    if (Array.isArray(result.result)) return result.result
    if (Array.isArray(result.songs)) return result.songs
  }
  return []
}

async function getMusicUrlFromScript(
  source: UserSourceScript,
  musicSource: MusicSource,
  musicInfo: ScriptMusicInfo,
  quality = '320k',
): Promise<string | null> {
  try {
    const existingInstance = lxInstances.get(source.id)
    const instance = existingInstance ?? await initScript(source)

    if (!instance || instance.handlers.length === 0) return null
    const availableSources = Object.keys(instance.sources).length > 0 ? instance.sources : source.sources
    if (!availableSources[musicSource] || !availableSources[musicSource].actions?.includes('musicUrl')) return null

    const event: RequestEvent<MusicUrlRequestInfo> = {
      action: 'musicUrl',
      source: musicSource,
      info: {
        type: quality,
        musicInfo,
      },
    }

    for (const handler of instance.handlers) {
      try {
        const result = await handler(event)
        if (result && typeof result === 'string') {
          console.log(`[ScriptRuntime] Got URL from ${source.id}:`, result)
          return result
        }
      } catch (error) {
        console.error(`[ScriptRuntime] Handler error in ${source.id} (${source.name}):`, error)
      }
    }

    return null
  } catch (error) {
    console.error(`[ScriptRuntime] getMusicUrl failed:`, error)
    return null
  }
}

async function searchFromScript(
  source: UserSourceScript,
  keyword: string,
  page = 1,
  limit = 30,
  preferredChannel?: MusicSource,
): Promise<any[]> {
  try {
    const existingInstance = lxInstances.get(source.id)
    const instance = existingInstance ?? await initScript(source)

    if (!instance || instance.handlers.length === 0) return []

    const availableSources = Object.keys(instance.sources).length > 0 ? instance.sources : source.sources
    const supportedChannels = Object.entries(availableSources)
      .filter(([, item]) => item.actions?.includes('search'))
      .map(([channel]) => channel as MusicSource)
    const searchChannels = preferredChannel
      ? supportedChannels.filter(channel => channel === preferredChannel)
      : supportedChannels

    if (searchChannels.length === 0) return []

    const results: any[] = []
    for (const channel of searchChannels) {
      const event: RequestEvent<SearchRequestInfo> = {
        action: 'search',
        source: channel,
        info: { keyword, page, limit },
      }

      for (const handler of instance.handlers) {
        try {
          const handlerResult = await handler(event)
          const items = extractSearchItems(handlerResult).map(item => {
            if (item && typeof item === 'object' && !Array.isArray(item)) {
              return {
                ...item,
                __sourceChannel: (item as any).__sourceChannel ?? channel,
              }
            }
            return item
          })
          if (items.length) results.push(...items)
        } catch (error) {
          console.error(`[ScriptRuntime] Search handler error in ${source.id}/${channel}:`, error)
        }
      }
    }

    return results
  } catch (error) {
    console.error(`[ScriptRuntime] search failed:`, error)
    return []
  }
}

export function useScriptRuntime() {
  const userSourceStore = useUserSourceStore()
  const isInitialized = ref(false)

  async function initialize() {
    console.log('[ScriptRuntime] initialize() called, isLoaded:', userSourceStore.isLoaded)

    if (!userSourceStore.isLoaded) {
      console.log('[ScriptRuntime] Loading user sources...')
      await userSourceStore.loadUserSources()
      console.log('[ScriptRuntime] User sources loaded, enabledSources:', userSourceStore.enabledSources.length)
    }

    isInitialized.value = true
    console.log('[ScriptRuntime] Initialized runtime state; enabledSources:', userSourceStore.enabledSources.length)
  }

  async function getMusicUrl(
    musicSource: MusicSource,
    musicInfo: ScriptMusicInfo,
    quality = '320k',
    preferredSourceId?: string,
  ): Promise<string | null> {
    await initialize()

    const sources = preferredSourceId
      ? userSourceStore.enabledSources.filter(source => source.id === preferredSourceId)
      : userSourceStore.enabledSources

    for (const source of sources) {
      const url = await getMusicUrlFromScript(source, musicSource, musicInfo, quality)
      if (url) return url
    }

    return null
  }

  async function search(
    sourceId: string,
    keyword: string,
    page = 1,
    limit = 30,
    preferredChannel?: MusicSource,
  ): Promise<any[]> {
    await initialize()

    const source = userSourceStore.enabledSources.find(item => item.id === sourceId)
    if (!source) return []

    return searchFromScript(source, keyword, page, limit, preferredChannel)
  }

  function getSourceCapabilities(): Record<string, ScriptCapability> {
    const result: Record<string, ScriptCapability> = {}

    for (const source of userSourceStore.enabledSources) {
      result[source.id] = buildCapabilityFromSource(source)
    }

    return result
  }

  function getAvailableSources(): Record<string, string[]> {
    const result: Record<string, string[]> = {}
    for (const [sourceId, instance] of lxInstances) {
      result[sourceId] = Object.keys(instance.sources)
    }
    return result
  }

  function cleanup() {
    lxInstances.clear()
    isInitialized.value = false
  }

  if (getCurrentScope()) {
    onScopeDispose(() => {
      cleanup()
    })
  }

  return {
    isInitialized,
    initialize,
    search,
    getMusicUrl,
    getAvailableSources,
    getSourceCapabilities,
    cleanup,
  }
}
