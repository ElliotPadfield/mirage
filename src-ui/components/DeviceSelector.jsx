import React, { useState } from 'react'
import { useApp } from '../context/AppContext'

const CONNECTION_PRIORITY = ['USB', 'Network', 'Wifi', 'Manual Wifi']

const getConnectionPriority = (connectionType) => {
  const index = CONNECTION_PRIORITY.indexOf(connectionType)
  return index === -1 ? CONNECTION_PRIORITY.length : index
}

const formatConnectionLabel = (type) => {
  switch (type) {
    case 'Wifi':
      return 'Wi‑Fi'
    case 'Manual Wifi':
      return 'Manual Wi‑Fi'
    default:
      return type || 'Unknown'
  }
}

// Connection type icons
const ConnectionIcon = ({ type, className = "h-4 w-4" }) => {
  switch (type) {
    case 'USB':
      return (
        <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2a1 1 0 011 1v4.586l2.707-2.707a1 1 0 111.414 1.414L14.414 9H16a1 1 0 110 2h-3v4.17a3.001 3.001 0 11-2 0V11H8a1 1 0 110-2h1.586L6.879 6.293a1 1 0 011.414-1.414L11 7.586V3a1 1 0 011-1zm0 16a1 1 0 100 2 1 1 0 000-2z" />
        </svg>
      )
    case 'Network':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
      )
    case 'Wifi':
    case 'Manual Wifi':
      return (
        <svg className={className} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path fillRule="evenodd" d="M17.778 8.222c-4.296-4.296-11.26-4.296-15.556 0a1 1 0 01-1.414-1.414c5.076-5.076 13.308-5.076 18.384 0a1 1 0 01-1.414 1.414zM14.95 11.05c-2.73-2.73-7.17-2.73-9.9 0a1 1 0 01-1.414-1.414c3.512-3.511 9.205-3.511 12.717 0a1 1 0 01-1.414 1.414zM12.12 13.88c-1.17-1.17-3.07-1.17-4.24 0a1 1 0 01-1.415-1.415c1.951-1.951 5.12-1.951 7.07 0a1 1 0 01-1.415 1.415zM9 16a1 1 0 112 0 1 1 0 01-2 0z" clipRule="evenodd" />
        </svg>
      )
    default:
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      )
  }
}

// Copyable UDID component with tooltip and checkmark animation
const CopyableUDID = ({ udid }) => {
  const [copied, setCopied] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)

  const handleCopy = (e) => {
    e.stopPropagation()
    navigator.clipboard.writeText(udid)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shortUdid = udid.length > 12 ? `${udid.slice(0, 8)}...${udid.slice(-4)}` : udid

  return (
    <div className="group/udid relative inline-flex items-center gap-1">
      <button
        onClick={handleCopy}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-sf-mono text-tertiary transition-all duration-150 hover:bg-[color:var(--surface-overlay-strong)] hover:text-secondary"
        aria-label={`Copy UDID: ${udid}`}
      >
        <span>{shortUdid}</span>
        <span className="relative h-3.5 w-3.5">
          {copied ? (
            <span className="copy-feedback-check flex h-3.5 w-3.5 items-center justify-center rounded-full bg-success text-white">
              <svg className="h-2 w-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
          ) : (
            <svg className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover/udid:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </span>
      </button>
      {/* Tooltip */}
      {(showTooltip || copied) && (
        <div className="pointer-events-none absolute bottom-full left-1/2 z-[9999] mb-2 -translate-x-1/2">
          <div className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-[10px] font-medium text-white shadow-lg transition-all duration-200 ${copied ? 'bg-success' : 'bg-gray-900'}`}>
            {copied ? 'Copied!' : udid}
            <div className={`absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent ${copied ? 'border-t-success' : 'border-t-gray-900'}`} />
          </div>
        </div>
      )}
    </div>
  )
}

// Skeleton loader for device cards
const DeviceSkeleton = () => (
  <div className="skeleton-card animate-pulse">
    <div className="flex items-center justify-between gap-3">
      <div className="flex-1">
        <div className="skeleton skeleton-text mb-2 w-32" />
        <div className="skeleton skeleton-text-sm w-40" />
      </div>
      <div className="skeleton h-6 w-16 rounded-full" />
    </div>
    <div className="mt-4">
      <div className="flex items-center gap-3 rounded-xl border border-transparent p-3">
        <div className="skeleton h-8 w-8 rounded-lg" />
        <div className="flex-1">
          <div className="skeleton skeleton-text mb-1.5 w-16" />
          <div className="skeleton skeleton-text-sm w-12" />
        </div>
        <div className="skeleton h-2.5 w-2.5 rounded-full" />
      </div>
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
      <div className="space-y-4">
        <DeviceSkeleton />
        <DeviceSkeleton />
      </div>
    )
  }

  if (Object.keys(state.devices).length === 0) {
    return (
      <div className="px-4 py-6 text-center panel-enter">
        <div className="empty-state-icon mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-accent">
          <span className="empty-state-pulse" />
          <svg className="relative h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-primary">No devices detected</p>
        <p className="mt-1 text-xs text-secondary">Connect an iPhone via USB or ensure Wi‑Fi sync is enabled.</p>
        <div className="macos-card mt-4 space-y-2 px-4 py-3 text-left">
          <p className="text-xs font-medium text-primary">How to get started</p>
          <ul className="list-disc space-y-1 pl-4 text-xs text-secondary">
            <li>Unlock your iPhone and connect it with USB.</li>
            <li>Trust this computer if prompted.</li>
            <li>Enable Wi‑Fi sync in Finder or iTunes to connect wirelessly.</li>
          </ul>
        </div>
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="btn-macos mt-4 text-xs"
        >
          {isRefreshing ? 'Scanning…' : 'Scan devices'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
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
        const availableTypes = Array.from(new Set(connectionEntries.map((device) => device.connectionType)))
        const additionalTypes = availableTypes.filter((type) => type !== preferredDevice.connectionType)
        const usingNetworkFallback = preferredDevice.connectionType === 'Network'

        return (
          <section
            key={udid}
            className={`device-item rounded-2xl px-4 py-3 transition-all duration-200 ${
              isSelected
                ? 'device-item-selected surface-overlay-strong shadow-sm'
                : 'surface-overlay hover:bg-[color:var(--surface-overlay-strong)] hover:shadow-sm'
            }`}
          >
            <header className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-primary">
                  {preferredDevice?.name || 'iOS Device'}
                </p>
                <div className="mt-1">
                  <CopyableUDID udid={udid} />
                </div>
              </div>
              {state.connectionStatus === 'connected' && isSelected ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-[11px] font-medium text-success" role="status">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: 'var(--success-color)' }} aria-hidden="true" />
                  Active
                </span>
              ) : null}
            </header>

            <div className="mt-4 space-y-2">
              <button
                key={`${preferredDevice.udid}-${preferredDevice.connectionType}`}
                onClick={() => handleDeviceSelect(preferredDevice)}
                className={`group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition duration-150 no-drag ${
                  isSelected
                    ? 'bg-accent-soft'
                    : 'surface-overlay hover:bg-[color:var(--surface-overlay-strong)]'
                }`}
                aria-pressed={isSelected}
                aria-label={`Connect via ${formatConnectionLabel(preferredDevice.connectionType)}`}
              >
                <div className="flex items-center gap-3">
                  {/* Connection type icon */}
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    isSelected ? 'bg-accent text-white' : 'bg-[color:var(--surface-overlay-strong)] text-secondary'
                  }`}>
                    <ConnectionIcon type={preferredDevice.connectionType} className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-primary">
                      {formatConnectionLabel(preferredDevice.connectionType)}
                    </p>
                    <p className="text-[11px] text-secondary">iOS {preferredDevice.ios_version}</p>
                    {additionalTypes.length > 0 ? (
                      <p className="mt-0.5 text-[10px] text-tertiary">
                        +{additionalTypes.length} other {additionalTypes.length === 1 ? 'connection' : 'connections'}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {preferredDevice.wifi_state && preferredDevice.connectionType !== 'Wifi' && preferredDevice.connectionType !== 'Manual Wifi' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(60,60,67,0.08)] px-2 py-1 text-[10px] font-medium text-tertiary">
                      <ConnectionIcon type="Wifi" className="h-3 w-3" />
                      Wi‑Fi ready
                    </span>
                  ) : null}
                  <span
                    className={`h-2.5 w-2.5 rounded-full transition-colors ${
                      isSelected && state.connectionStatus === 'connected' ? 'animate-pulse' : ''
                    }`}
                    style={{
                      backgroundColor:
                        isSelected && state.connectionStatus === 'connected'
                          ? 'var(--success-color)'
                          : 'rgba(60,60,67,0.3)'
                    }}
                    aria-hidden="true"
                  />
                </div>
              </button>
              {usingNetworkFallback ? (
                <p className="text-[11px] text-secondary">
                  Cable unplugged—using the network tunnel. Reconnect via USB for best reliability.
                </p>
              ) : null}
            </div>
          </section>
        )
      })}
    </div>
  )
}

export default DeviceSelector
