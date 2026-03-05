import React, { useState, useRef, useEffect } from 'react'
import { motion } from 'motion/react'
import { useApp } from '../context/AppContext'

const CELEBRATION_DURATION = 2000
const CONFETTI_COLORS = ['#0a84ff', '#30d158', '#ff9f0a', '#ff375f', '#af52de']
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

const ControlPanel = () => {
  const { state, actions } = useApp()
  const [isConnecting, setIsConnecting] = useState(false)
  const [isCelebrating, setIsCelebrating] = useState(false)
  const [confettiBurstId, setConfettiBurstId] = useState(0)
  const celebrationTimeoutRef = useRef(null)

  useEffect(() => {
    return () => {
      if (celebrationTimeoutRef.current) {
        clearTimeout(celebrationTimeoutRef.current)
      }
    }
  }, [])

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
    <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-center px-6">
      <div className="flex items-center gap-3">
        {state.selectedDevice && (
          <span className="text-xs text-secondary">{state.selectedDevice.name}</span>
        )}
        {isCelebrating ? (
          <div className="relative">
            <motion.button
              key="celebration"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: [1, 1.04, 1] }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="btn-macos btn-macos-success celebration-button h-10 px-5 no-drag"
              disabled
            >
              <span role="img" aria-hidden="true" className="mr-2">
                🎯
              </span>
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
            className="btn-macos btn-macos-danger h-10 px-5 no-drag"
          >
            Stop simulation
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
              className="btn-macos btn-macos-primary h-10 px-5 no-drag"
              aria-label={
                !state.selectedDevice
                  ? 'Select a device first'
                  : !state.currentLocation
                  ? 'Select a location on the map first'
                  : 'Simulate location'
              }
            >
              {isConnecting ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Applying…
                </>
              ) : (
                'Simulate location'
              )}
            </motion.button>
            {/* Tooltip for disabled state */}
            {(!state.currentLocation || !state.selectedDevice) && !isConnecting && (
              <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 opacity-0 transition-opacity group-hover:opacity-100">
                <div className="whitespace-nowrap rounded-lg bg-gray-900 px-3 py-1.5 text-xs text-white shadow-lg">
                  {!state.selectedDevice
                    ? 'Select a device first'
                    : 'Click on the map to select a location'}
                  <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
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
