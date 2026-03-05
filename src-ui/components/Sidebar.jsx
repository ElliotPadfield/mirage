import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import DeviceSelector from './DeviceSelector'

const Sidebar = () => {
  const { state, actions } = useApp()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isInstallingDaemon, setIsInstallingDaemon] = useState(false)

  const handleInstallDaemon = async () => {
    setIsInstallingDaemon(true)
    try {
      await actions.installDaemon()
    } catch (error) {
      console.error('Failed to install daemon:', error)
    } finally {
      setIsInstallingDaemon(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await actions.fetchDevices()
    } catch (error) {
      console.error('Failed to refresh devices:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-5 pb-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-secondary">Devices</p>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="icon-button no-drag"
            aria-label="Refresh devices"
            title="Refresh devices"
          >
            <svg
              className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        <DeviceSelector isRefreshing={isRefreshing} onRefresh={handleRefresh} />
      </div>

      <div className="px-5 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2" role="status" aria-live="polite">
            <span
              className={`block h-2 w-2 rounded-full ${state.pythonStatus.running ? 'status-dot-connected' : ''}`}
              style={{
                backgroundColor: state.pythonStatus.running ? 'var(--success-color)' : 'var(--danger-color)'
              }}
              aria-hidden="true"
            />
            <span className="text-xs text-secondary">
              {state.pythonStatus.running ? 'Backend connected' : 'Backend offline'}
            </span>
          </div>

          {/* Show daemon install button on macOS when not installed */}
          {state.daemonStatus.supported && !state.daemonStatus.installed && (
            <button
              onClick={handleInstallDaemon}
              disabled={isInstallingDaemon}
              className="text-xs text-accent hover:text-accent/80 transition-colors disabled:opacity-50"
              title="Install helper to skip password prompts on future launches"
            >
              {isInstallingDaemon ? 'Installing...' : 'Install Helper'}
            </button>
          )}

          {/* Show daemon status when installed */}
          {state.daemonStatus.supported && state.daemonStatus.installed && (
            <span className="text-xs text-tertiary" title="Helper service is installed">
              Helper active
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default Sidebar
