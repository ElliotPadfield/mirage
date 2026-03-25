import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import DeviceSelector from './DeviceSelector'

const DevicesPanel = () => {
  const { state, actions } = useApp()
  const [isRefreshing, setIsRefreshing] = useState(false)

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

  const connectedCount = Object.keys(state.devices).length

  return (
    <div
      className="w-[300px] rounded-[20px] border"
      style={{
        background: '#0F0F14CC',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderColor: '#FFFFFF10',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2.5">
          <h2
            className="text-base font-bold text-white"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Devices
          </h2>
          <span
            className="rounded-full px-2 py-0.5 text-[11px]"
            style={{
              background: '#FFFFFF08',
              color: '#A1A1AA',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {connectedCount} connected
          </span>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-white/10 no-drag"
          aria-label="Refresh devices"
          title="Refresh devices"
        >
          <svg
            className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
            fill="none"
            stroke="#A1A1AA"
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

      {/* Device list */}
      <div className="max-h-[220px] overflow-y-auto px-3 pb-3 scrollbar-thin">
        <DeviceSelector isRefreshing={isRefreshing} onRefresh={handleRefresh} />
      </div>
    </div>
  )
}

export default DevicesPanel
