import type {
  AppUpdateCheckResult,
  AppUpdateDownloadEvent,
  AppUpdateHandle,
  AppUpdateInstallResult,
  AppUpdaterAdapter,
} from '@/types/appUpdate'

export class AppUpdateService {
  constructor(private readonly adapter: AppUpdaterAdapter) {}

  isSupported(): boolean {
    return this.adapter.isSupported()
  }

  async getCurrentVersion(): Promise<string> {
    return this.adapter.getCurrentVersion()
  }

  async checkForUpdates(): Promise<AppUpdateCheckResult> {
    const [currentVersion, update] = await Promise.all([
      this.adapter.getCurrentVersion(),
      this.adapter.checkForUpdate(),
    ])

    return {
      currentVersion,
      checkedAt: new Date().toISOString(),
      update,
    }
  }

  async installUpdate(
    update: AppUpdateHandle,
    onEvent?: (event: AppUpdateDownloadEvent) => void
  ): Promise<AppUpdateInstallResult> {
    await update.downloadAndInstall(onEvent)
    const relaunchTriggered = await this.adapter.relaunchApp()

    return {
      relaunchTriggered,
    }
  }
}
