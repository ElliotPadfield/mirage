import React, { useState, useRef, useEffect } from 'react'
import { motion } from 'motion/react'
import { useApp } from '../context/AppContext'

const CELEBRATION_DURATION = 2000
const CONFETTI_COLORS = ['#8B5CF6', '#22C55E', '#FBBF24', '#EF4444', '#3B82F6']
const CONFETTI_PIECES = Array.from({ length: 14 }, (_, index) => {
  const startX = -70 + index * (140 / 13)
  const endX = startX * 0.6 + (index % 2 === 0 ? -6 : 6)
  return {
    id: index,
    color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
    startX,
    endX,
    delay: (index % 7) * 0.06,
    duration: 1.1 + (index % 5) * 0.14,
    rotation: 20 + (index % 6) * 18
  }
})

// Navigation icon (tilted paper plane / arrow)
const NavigationIcon = ({ color = '#8B5CF6', className = 'h-5 w-5' }) => (
  <svg className={className} fill={color} viewBox="0 0 24 24" stroke="none">
    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
  </svg>
)

const ControlPanel = () => {
  const { state, actions } = useApp()
  const [isConnecting, setIsConnecting] = useState(false)
  const [isCelebrating, setIsCelebrating] = useState(false)
  const [confettiBurstId, setConfettiBurstId] = useState(0)
  const [locationName, setLocationName] = useState(null)
  const celebrationTimeoutRef = useRef(null)
  const geocodeTimeoutRef = useRef(null)

  useEffect(() => {
    return () => {
      if (celebrationTimeoutRef.current) {
        clearTimeout(celebrationTimeoutRef.current)
      }
      if (geocodeTimeoutRef.current) {
        clearTimeout(geocodeTimeoutRef.current)
      }
    }
  }, [])

  // Reverse geocode when location changes
  useEffect(() => {
    if (!state.currentLocation) {
      setLocationName(null)
      return
    }

    // Debounce geocoding
    if (geocodeTimeoutRef.current) {
      clearTimeout(geocodeTimeoutRef.current)
    }

    geocodeTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${state.currentLocation.latitude}&lon=${state.currentLocation.longitude}&zoom=14&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } }
        )
        const data = await res.json()
        if (data?.address) {
          const addr = data.address
          const name = addr.city || addr.town || addr.village || addr.county || addr.state || data.display_name?.split(',')[0]
          setLocationName(name || null)
        }
      } catch {
        setLocationName(null)
      }
    }, 300)
  }, [state.currentLocation?.latitude, state.currentLocation?.longitude])

  const triggerCelebration = () => {
    setIsCelebrating(true)
    setConfettiBurstId((prev) => prev + 1)
    if (celebrationTimeoutRef.current) {
      clearTimeout(celebrationTimeoutRef.current)
    }
    celebrationTimeoutRef.current = setTimeout(() => {
      setIsCelebrating(false)
    }, CELEBRATION_DURATION)
  }

  const handleSetLocation = async () => {
    if (!state.currentLocation) {
      actions.addNotification({
        type: 'error',
        title: 'No Location Selected',
        message: 'Please select a location on the map first'
      })
      return
    }

    if (!state.selectedDevice) {
      actions.addNotification({
        type: 'error',
        title: 'No Device Selected',
        message: 'Please connect to a device first'
      })
      return
    }

    setIsConnecting(true)
    try {
      await actions.setLocation(state.currentLocation)
      await actions.startLocationSimulation(state.selectedDevice.udid)
      triggerCelebration()
    } catch (error) {
      console.error('Failed to set location:', error)
    } finally {
      setIsConnecting(false)
    }
  }

  const handleStopLocation = async () => {
    try {
      await actions.stopLocationSimulation()
    } catch (error) {
      console.error('Failed to stop location:', error)
    }
  }

  return (
    <div
      className="flex items-center gap-3 rounded-[24px] border h-[60px] px-3 pl-5"
      style={{
        background: '#0F0F14CC',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderColor: '#FFFFFF10',
      }}
    >
      {/* Left: Location info with navigation icon + save button */}
      <div className="flex items-center gap-2.5 mr-2">
        <NavigationIcon color="#8B5CF6" className="h-5 w-5 flex-shrink-0" />
        <div className="min-w-0">
          {state.currentLocation ? (
            <>
              <p
                className="truncate max-w-[160px]"
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#FFFFFF',
                }}
              >
                {locationName || 'Selected Location'}
              </p>
              <p
                className="truncate max-w-[160px]"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '11px',
                  color: '#A1A1AA',
                }}
              >
                {state.currentLocation.latitude.toFixed(4)}° N, {state.currentLocation.longitude.toFixed(4)}° E
              </p>
            </>
          ) : (
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '12px',
                color: '#71717A',
              }}
            >
              Click map to select
            </p>
          )}
        </div>
        {/* Save / Star button */}
        {state.currentLocation && (
          <button
            onClick={() => {
              actions.saveLocation(state.currentLocation, locationName || undefined)
              actions.addNotification({
                type: 'success',
                title: 'Location Saved',
                message: locationName || 'Added to starred locations',
              })
            }}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-white/10 no-drag flex-shrink-0"
            aria-label="Save location"
            title="Save to starred locations"
          >
            <svg className="h-4 w-4" fill="none" stroke="#A1A1AA" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </button>
        )}
      </div>

      {/* Separator */}
      <div className="w-px" style={{ height: '14px', background: '#FFFFFF25' }} />

      {/* Center: Device chip */}
      <div className="flex items-center gap-2 mx-2">
        <div
          className="flex items-center gap-2 rounded-full"
          style={{
            padding: '6px 12px',
            background: '#FFFFFF08',
            border: '1px solid #FFFFFF10',
          }}
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            stroke={state.selectedDevice ? '#D4D4D8' : '#71717A'}
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="12" y1="18" x2="12.01" y2="18" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span
            className="truncate max-w-[120px]"
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '12px',
              color: state.selectedDevice ? '#D4D4D8' : '#71717A',
            }}
          >
            {state.selectedDevice?.name || 'No device'}
          </span>
          {state.selectedDevice && state.connectionStatus === 'connected' && (
            <span className="h-2 w-2 rounded-full animate-pulse" style={{ background: '#14B8A6' }} />
          )}
        </div>
      </div>

      {/* Separator */}
      <div className="w-px" style={{ height: '14px', background: '#FFFFFF25' }} />

      {/* Right: Action button */}
      <div className="ml-2">
        {isCelebrating ? (
          <div className="relative">
            <motion.button
              key="celebration"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: [1, 1.04, 1] }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="px-5 text-sm font-semibold text-white no-drag"
              style={{
                height: '44px',
                borderRadius: '18px',
                background: 'linear-gradient(135deg, #22C55E, #16A34A)',
              }}
              disabled
            >
              Beam delivered!
            </motion.button>
            <div className="celebration-confetti" key={confettiBurstId} aria-hidden="true">
              {CONFETTI_PIECES.map((piece) => (
                <span
                  key={`${confettiBurstId}-${piece.id}`}
                  className="celebration-confetti-piece"
                  style={{
                    '--confetti-color': piece.color,
                    '--confetti-start-x': `${piece.startX}px`,
                    '--confetti-end-x': `${piece.endX}px`,
                    '--confetti-duration': `${piece.duration}s`,
                    '--confetti-delay': `${piece.delay}s`,
                    '--confetti-rotation': `${piece.rotation}deg`
                  }}
                />
              ))}
            </div>
          </div>
        ) : state.isLocationActive ? (
          <motion.button
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={handleStopLocation}
            className="text-white no-drag transition-opacity hover:opacity-90"
            style={{
              height: '44px',
              borderRadius: '18px',
              padding: '0 22px',
              background: 'linear-gradient(180deg, #8B5CF6, #7C3AED)',
              boxShadow: '0 2px 16px #8B5CF640',
              fontFamily: "'Inter', sans-serif",
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            Stop Simulation
          </motion.button>
        ) : (
          <div className="group relative">
            <motion.button
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={handleSetLocation}
              disabled={
                !state.currentLocation || !state.selectedDevice || isConnecting || isCelebrating
              }
              className="text-white no-drag transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                height: '44px',
                borderRadius: '18px',
                padding: '0 22px',
                background: 'linear-gradient(180deg, #8B5CF6, #7C3AED)',
                boxShadow: '0 2px 16px #8B5CF640',
                fontFamily: "'Inter', sans-serif",
                fontSize: '13px',
                fontWeight: 600,
              }}
              aria-label={
                !state.selectedDevice
                  ? 'Select a device first'
                  : !state.currentLocation
                  ? 'Select a location on the map first'
                  : 'Simulate location'
              }
            >
              {isConnecting ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Applying...
                </span>
              ) : (
                'Simulate Location'
              )}
            </motion.button>
            {/* Tooltip for disabled state */}
            {(!state.currentLocation || !state.selectedDevice) && !isConnecting && (
              <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 opacity-0 transition-opacity group-hover:opacity-100">
                <div
                  className="whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-medium text-white shadow-lg"
                  style={{ background: '#1C1C22' }}
                >
                  {!state.selectedDevice
                    ? 'Select a device first'
                    : 'Click on the map to select a location'}
                  <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent" style={{ borderTopColor: '#1C1C22' }} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ControlPanel
