import { invoke } from '@tauri-apps/api/core'
import { appDataDir } from '@tauri-apps/api/path'

let databaseInitPromise: Promise<void> | null = null

export function isTauriContext() {
  return typeof window !== 'undefined' && '__TAURI__' in window
}

export async function ensureDatabaseInitialized() {
  if (!isTauriContext()) return

  if (!databaseInitPromise) {
    databaseInitPromise = (async () => {
      const dataDir = await appDataDir()
      await invoke('init_database', { appPath: dataDir })
    })()
  }

  try {
    await databaseInitPromise
  } catch (error) {
    databaseInitPromise = null
    throw error
  }
}
