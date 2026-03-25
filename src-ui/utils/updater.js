import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

export async function checkForUpdates({ onUpdate, onNoUpdate, onError } = {}) {
  try {
    const update = await check()
    if (update) {
      onUpdate?.(update)
      return update
    } else {
      onNoUpdate?.()
      return null
    }
  } catch (e) {
    console.error('Update check failed:', e)
    onError?.(e)
    return null
  }
}

export async function installUpdate(update, onProgress) {
  let downloaded = 0
  let contentLength = 0

  await update.downloadAndInstall((event) => {
    switch (event.event) {
      case 'Started':
        contentLength = event.data.contentLength || 0
        onProgress?.({ phase: 'downloading', percent: 0 })
        break
      case 'Progress':
        downloaded += event.data.chunkLength
        if (contentLength > 0) {
          onProgress?.({ phase: 'downloading', percent: Math.round((downloaded / contentLength) * 100) })
        }
        break
      case 'Finished':
        onProgress?.({ phase: 'installing', percent: 100 })
        break
    }
  })

  await relaunch()
}
