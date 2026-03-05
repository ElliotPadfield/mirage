import { invoke } from '@tauri-apps/api/core'

export const tauriAPI = {
  getPythonStatus: () => invoke('get_python_status'),
  getDaemonStatus: () => invoke('get_daemon_status'),
  installDaemon: () => invoke('install_daemon'),
  uninstallDaemon: () => invoke('uninstall_daemon'),
}
