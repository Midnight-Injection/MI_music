export type AppUpdateStatus =
  | 'idle'
  | 'checking'
  | 'up-to-date'
  | 'available'
  | 'downloading'
  | 'installing'
  | 'completed'
  | 'error'
  | 'unsupported'

export type AppUpdateDownloadEvent =
  | {
      event: 'Started'
      contentLength: number | null
    }
  | {
      event: 'Progress'
      chunkLength: number
    }
  | {
      event: 'Finished'
    }

export interface AppUpdateInfo {
  currentVersion: string
  version: string
  publishedAt: string | null
  notes: string | null
  rawJson: Record<string, unknown>
}

export interface AppUpdateProgress {
  contentLength: number | null
  downloadedBytes: number
  percent: number | null
}

export interface AppUpdateHandle {
  metadata: AppUpdateInfo
  downloadAndInstall(onEvent?: (event: AppUpdateDownloadEvent) => void): Promise<void>
  close(): Promise<void>
}

export interface AppUpdateCheckResult {
  currentVersion: string
  checkedAt: string
  update: AppUpdateHandle | null
}

export interface AppUpdateInstallResult {
  relaunchTriggered: boolean
}

export interface AppUpdaterAdapter {
  isSupported(): boolean
  getCurrentVersion(): Promise<string>
  checkForUpdate(): Promise<AppUpdateHandle | null>
  relaunchApp(): Promise<boolean>
}
