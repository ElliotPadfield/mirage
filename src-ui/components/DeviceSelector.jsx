import React, { useState } from 'react'
import { useApp } from '../context/AppContext'

const CONNECTION_PRIORITY = ['USB', 'Network', 'Wifi', 'Manual Wifi']

const getConnectionPriority = (connectionType) => {
  const index = CONNECTION_PRIORITY.indexOf(connectionType)
  return index === -1 ? CONNECTION_PRIORITY.length : index
}

const formatConnectionLabel = (type) => {
  switch (type) {
    case 'USB':
      return 'USB Connected'
    case 'Wifi':
    case 'Manual Wifi':
      return 'WiFi Connected'
    case 'Network':
      return 'Network Connected'
    default:
      return 'Disconnected'
  }
}

const isConnectedType = (type) => {
  return ['USB', 'Wifi', 'Manual Wifi', 'Network'].includes(type)
}

// Smartphone icon for device cards
const SmartphoneIcon = ({ color = '#A1A1AA', className = 'h-5 w-5' }) => (
  <svg className={className} fill="none" stroke={color} viewBox="0 0 24 24" strokeWidth={2}>
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="12" y1="18" x2="12.01" y2="18" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

// Circle check icon for selected device
const CircleCheckIcon = ({ color = '#8B5CF6', className = 'h-5 w-5' }) => (
  <svg className={className} fill="none" stroke={color} viewBox="0 0 24 24" strokeWidth={2}>
    <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

// Skeleton loader for device cards
const DeviceSkeleton = () => (
  <div className="animate-pulse rounded-2xl p-3" style={{ background: '#FFFFFF08' }}>
    <div className="flex items-center justify-between gap-3">
      <div className="flex-1">
        <div className="h-3 w-32 rounded" style={{ background: '#FFFFFF10' }} />
        <div className="mt-2 h-2 w-40 rounded" style={{ background: '#FFFFFF08' }} />
      </div>
      <div className="h-6 w-16 rounded-full" style={{ background: '#FFFFFF08' }} />
    </div>
  </div>
)

const DeviceSelector = ({ isRefreshing = false, onRefresh = () => {} }) => {
  const { state, actions } = useApp()

  const handleDeviceSelect = async (device) => {
    try {
      actions.selectDevice(device)
      await actions.connectDevice({
        udid: device.udid,
        connType: device.connection_type,
        ios_version: device.ios_version
      })
    } catch (error) {
      console.error('Failed to connect device:', error)
    }
  }

  // Show skeleton while refreshing with no devices
  if (isRefreshing && Object.keys(state.devices).length === 0) {
    return (
      <div className="space-y-1.5">
        <DeviceSkeleton />
        <DeviceSkeleton />
      </div>
    )
  }

  if (Object.keys(state.devices).length === 0) {
    return (
      <div className="px-2 py-4 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: 'rgba(139,92,246,0.1)' }}>
          <SmartphoneIcon color="#8B5CF6" />
        </div>
        <p className="text-sm font-medium text-white">No devices detected</p>
        <p className="mt-1 text-xs" style={{ color: '#A1A1AA' }}>Connect an iPhone via USB or ensure Wi-Fi sync is enabled.</p>
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="mt-3 rounded-full px-4 py-1.5 text-xs font-medium text-white no-drag disabled:opacity-50"
          style={{ background: '#FFFFFF10' }}
        >
          {isRefreshing ? 'Scanning...' : 'Scan devices'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {Object.entries(state.devices).map(([udid, connections]) => {
        const connectionEntries = Object.entries(connections).flatMap(([connectionType, devices]) =>
          devices.map((device) => ({
            ...device,
            connectionType
          }))
        )
        const preferredDevice = connectionEntries.reduce((best, device) => {
          if (!best) {
            return device
          }
          return getConnectionPriority(device.connectionType) < getConnectionPriority(best.connectionType) ? device : best
        }, null)

        if (!preferredDevice) {
          return null
        }

        const isSelected = state.selectedDevice?.udid === preferredDevice.udid
        const connected = isConnectedType(preferredDevice.connectionType)
        const disconnected = !connected

        return (
          <button
            key={udid}
            onClick={() => handleDeviceSelect(preferredDevice)}
            className="w-full text-left transition-all duration-200 no-drag"
            style={{
              padding: '12px 14px',
              borderRadius: '16px',
              background: isSelected ? '#8B5CF618' : '#FFFFFF08',
              border: `1px solid ${isSelected ? '#8B5CF640' : '#FFFFFF10'}`,
            }}
            aria-pressed={isSelected}
            aria-label={`Connect to ${preferredDevice?.name || 'iOS Device'} via ${formatConnectionLabel(preferredDevice.connectionType)}`}
          >
            <div className="flex items-center" style={{ gap: '12px' }}>
              {/* Icon container - 40x40, rounded-xl (12px) */}
              <div
                className="flex items-center justify-center flex-shrink-0"
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: isSelected ? '#8B5CF6' : '#FFFFFF08',
                  border: isSelected ? 'none' : '1px solid #FFFFFF10',
                }}
              >
                <SmartphoneIcon
                  color={isSelected ? '#FFFFFF' : '#A1A1AA'}
                  className="h-5 w-5"
                />
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p
                  className="truncate"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '13px',
                    fontWeight: 600,
                    color: isSelected ? '#FFFFFF' : disconnected ? '#71717A' : '#D4D4D8',
                  }}
                >
                  {preferredDevice?.name || 'iOS Device'}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {connected && (
                    <span
                      className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                      style={{ background: '#14B8A6' }}
                    />
                  )}
                  {disconnected && (
                    <span
                      className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                      style={{ background: '#52525B' }}
                    />
                  )}
                  <span
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '11px',
                      color: connected ? '#A1A1AA' : '#52525B',
                    }}
                  >
                    {formatConnectionLabel(preferredDevice.connectionType)}
                  </span>
                </div>
              </div>

              {/* Checkmark for selected */}
              {isSelected && (
                <div className="flex-shrink-0">
                  <CircleCheckIcon color="#8B5CF6" className="h-5 w-5" />
                </div>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}

export default DeviceSelector
