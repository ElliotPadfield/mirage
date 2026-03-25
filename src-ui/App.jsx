import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import MapView from './components/MapView'
import ControlPanel from './components/ControlPanel'
import DevicesPanel from './components/DevicesPanel'
import LocationsPanel from './components/LocationsPanel'
import SearchBar from './components/SearchBar'
// CoordinatesDisplay removed — save is now in the control bar
import LoadingScreen, { BOOT_STEPS } from './components/LoadingScreen'
import { AppProvider, useApp } from './context/AppContext'
import { checkForUpdates, installUpdate } from './utils/updater'
import './App.css'

function UpdateBanner({ update, onDismiss }) {
  const [installing, setInstalling] = useState(false)
  const [progress, setProgress] = useState(null)

  const handleInstall = async () => {
    setInstalling(true)
    try {
      await installUpdate(update, setProgress)
    } catch (e) {
      console.error('Update install failed:', e)
      setInstalling(false)
    }
  }

  return (
    <motion.div
      initial={{ y: -48, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -48, opacity: 0 }}
      className="absolute top-12 left-1/2 -translate-x-1/2 z-50"
    >
      <div
        className="flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm shadow-lg border"
        style={{
          background: '#0F0F14CC',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderColor: '#FFFFFF10',
        }}
      >
        <span className="font-medium text-white">
          {installing
            ? (progress?.phase === 'downloading'
                ? `Downloading update... ${progress.percent}%`
                : 'Installing...')
            : `Update v${update.version} available`}
        </span>
        {!installing && (
          <>
            <button
              onClick={handleInstall}
              className="rounded-lg px-3 py-1 text-xs font-medium text-white no-drag"
              style={{ background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' }}
            >
              Update & Restart
            </button>
            <button onClick={onDismiss} className="text-xs no-drag" style={{ color: '#A1A1AA' }}>
              Later
            </button>
          </>
        )}
      </div>
    </motion.div>
  )
}

function AppContent() {
  const { state, actions } = useApp()
  const [activeBootStep, setActiveBootStep] = useState(0)
  const [minBootTimeReached, setMinBootTimeReached] = useState(false)
  const [bootTimeoutExceeded, setBootTimeoutExceeded] = useState(false)
  const { pythonStatus } = state
  const [showRaceBorder, setShowRaceBorder] = useState(false)
  const prevLocationActive = useRef(false)
  const [pendingUpdate, setPendingUpdate] = useState(null)

  // Map control callbacks - lifted from MapView so floating panels can use them
  const mapRef = useRef(null)

  const handleSearchResult = ({ latitude, longitude, displayName }) => {
    actions.setCurrentLocation({ latitude, longitude })
    if (mapRef.current) {
      mapRef.current.setView([latitude, longitude], 15, { animate: true })
    }
    actions.addNotification({
      type: 'success',
      title: 'Location Found',
      message: displayName,
    })
  }

  const handleSelectLocation = (loc) => {
    if (mapRef.current) {
      mapRef.current.setView([loc.latitude, loc.longitude], 15, { animate: true })
    }
    actions.setCurrentLocation({ latitude: loc.latitude, longitude: loc.longitude })
  }

  const copyCoordinates = () => {
    if (state.currentLocation) {
      const coords = `${state.currentLocation.latitude}, ${state.currentLocation.longitude}`
      navigator.clipboard.writeText(coords)
      actions.addNotification({
        type: 'success',
        title: 'Coordinates Copied',
        message: coords,
      })
    }
  }

  const handleCompassClick = () => {
    if (mapRef.current && state.currentLocation) {
      mapRef.current.setView(
        [state.currentLocation.latitude, state.currentLocation.longitude],
        mapRef.current.getZoom(),
        { animate: true }
      )
    } else if (mapRef.current) {
      // Reset to default view if no location selected
      mapRef.current.setView(
        mapRef.current.getCenter(),
        mapRef.current.getZoom(),
        { animate: true }
      )
    }
  }

  // Check for updates on startup
  useEffect(() => {
    checkForUpdates({ onUpdate: setPendingUpdate })
  }, [])

  // Detect simulation start (false->true transition) and trigger racing border
  useEffect(() => {
    if (state.isLocationActive && !prevLocationActive.current) {
      setShowRaceBorder(true)
      const timer = setTimeout(() => setShowRaceBorder(false), 1200)
      return () => clearTimeout(timer)
    }
    prevLocationActive.current = state.isLocationActive
  }, [state.isLocationActive])

  useEffect(() => {
    const minBootTimer = setTimeout(() => {
      setMinBootTimeReached(true)
    }, 2000)

    const bootTimeoutTimer = setTimeout(() => {
      setBootTimeoutExceeded(true)
    }, 45000)

    return () => {
      clearTimeout(minBootTimer)
      clearTimeout(bootTimeoutTimer)
    }
  }, [])

  const showLoading =
    !minBootTimeReached || (!pythonStatus?.running && !bootTimeoutExceeded)

  useEffect(() => {
    if (!showLoading) return

    setActiveBootStep(0)
    const intervalId = setInterval(() => {
      setActiveBootStep((prev) => Math.min(prev + 1, BOOT_STEPS.length - 1))
    }, 1100)

    return () => clearInterval(intervalId)
  }, [showLoading])

  useEffect(() => {
    if (pythonStatus?.running) {
      setActiveBootStep(BOOT_STEPS.length - 1)
    }
  }, [pythonStatus])

  if (showLoading) {
    return <LoadingScreen activeStep={activeBootStep} />
  }

  if (!pythonStatus?.running) {
    return (
      <div key="error-screen" className="flex h-screen w-screen items-center justify-center" style={{ background: '#0A0A0F' }}>
        <div className="drag-region fixed top-0 left-0 right-0 h-8 z-50" />
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-2xl px-8 py-6 text-center no-drag border"
          style={{
            background: '#0F0F14CC',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderColor: '#FFFFFF10',
          }}
        >
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: 'rgba(239,68,68,0.15)' }}>
            <svg className="h-6 w-6" fill="#EF4444" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-white">Backend unavailable</h2>
          <p className="mt-2 text-sm" style={{ color: '#D4D4D8' }}>
            Mirage can't reach the Python service right now. Check that it's running and try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-xl px-5 py-2 text-sm font-medium text-white no-drag"
            style={{ background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' }}
          >
            Retry
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div key="main-ui" className="relative w-screen h-screen overflow-hidden" style={{ background: '#0A0A0F' }}>
      {/* Drag region for window controls */}
      <div className="drag-region fixed top-0 left-0 right-0 h-8 z-50" />

      {/* Full-bleed map background */}
      <div className="absolute inset-0 z-0">
        <MapView mapRef={mapRef} />
        {showRaceBorder && <div className="sim-race-border" />}
      </div>

      {/* Update Banner */}
      <AnimatePresence>
        {pendingUpdate && <UpdateBanner update={pendingUpdate} onDismiss={() => setPendingUpdate(null)} />}
      </AnimatePresence>

      {/* Floating Search Bar - top center */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 z-40">
        <SearchBar onSearch={handleSearchResult} />
      </div>

      {/* Devices Panel - top left */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.32, ease: 'easeOut' }}
        className="absolute top-10 left-4 z-40"
      >
        <DevicesPanel />
      </motion.div>

      {/* Locations Panel (Starred & Recent) - below devices panel, left */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.32, ease: 'easeOut', delay: 0.06 }}
        className="absolute top-[330px] left-4 z-40"
      >
        <LocationsPanel
          onSelectLocation={handleSelectLocation}
        />
      </motion.div>

      {/* Coordinates display removed — save button is in control bar */}

      {/* Simulation Info Panel - top right, matches Pencil design */}
      <AnimatePresence>
        {state.isLocationActive && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.32, ease: 'easeOut' }}
            className="absolute top-10 right-4 z-40"
          >
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
              <div className="flex items-center gap-3 p-4 pb-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#8B5CF6" stroke="none">
                  <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z"/>
                </svg>
                <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '16px', fontWeight: 700, color: '#FFFFFF' }}>
                  Simulation
                </span>
                <div className="flex-1" />
                <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: '#14B8A6' }}>
                  <span className="h-2 w-2 rounded-full animate-pulse" style={{ background: '#14B8A6' }} />
                  Active
                </span>
              </div>

              {/* Spoofed Location */}
              {state.currentLocation && (
                <div className="px-4 pb-3">
                  <p className="text-[11px] font-medium mb-1" style={{ color: '#A1A1AA' }}>Spoofed Location</p>
                  <div className="flex items-start gap-2">
                    <svg className="h-4 w-4 mt-0.5 flex-shrink-0" fill="none" stroke="#8B5CF6" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {state.currentLocation.latitude.toFixed(4)}° N, {state.currentLocation.longitude.toFixed(4)}° E
                      </p>
                      <p className="text-[11px] mt-0.5" style={{ color: '#A1A1AA' }}>
                        {state.currentLocation.latitude.toFixed(4)}° N, {state.currentLocation.longitude.toFixed(4)}° E
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Separator */}
              <div className="mx-4 h-px" style={{ background: '#FFFFFF10' }} />

              {/* Real Location */}
              <div className="px-4 py-3">
                <p className="text-[11px] font-medium mb-1" style={{ color: '#A1A1AA' }}>Real Location</p>
                <div className="flex items-start gap-2">
                  <svg className="h-4 w-4 mt-0.5 flex-shrink-0" fill="none" stroke="#71717A" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#D4D4D8' }}>
                      {state.selectedDevice?.name || 'Unknown'}
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: '#71717A' }}>
                      Real location unavailable
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Control Bar - bottom center */}
      <div className="absolute bottom-5 left-0 right-0 z-40 flex justify-center pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: 'easeOut' }}
          className="pointer-events-auto"
        >
          <ControlPanel />
        </motion.div>
      </div>

      {/* Zoom Controls + Compass - right side, vertical center */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-1">
        <button
          onClick={() => mapRef.current && mapRef.current.zoomIn()}
          className="flex h-10 w-10 items-center justify-center rounded-xl border text-white transition-colors hover:bg-white/10 no-drag"
          style={{
            background: '#0F0F14CC',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderColor: '#FFFFFF10',
          }}
          aria-label="Zoom in"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12M6 12h12" />
          </svg>
        </button>
        <button
          onClick={() => mapRef.current && mapRef.current.zoomOut()}
          className="flex h-10 w-10 items-center justify-center rounded-xl border text-white transition-colors hover:bg-white/10 no-drag"
          style={{
            background: '#0F0F14CC',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderColor: '#FFFFFF10',
          }}
          aria-label="Zoom out"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12h12" />
          </svg>
        </button>

        {/* Compass button - gap between zoom and compass */}
        <div className="h-2" />
        <button
          onClick={handleCompassClick}
          className="flex h-10 w-10 items-center justify-center border text-white transition-colors hover:bg-white/10 no-drag"
          style={{
            borderRadius: '14px',
            background: '#0F0F14CC',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderColor: '#FFFFFF10',
          }}
          aria-label="Reset view to current location"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5}>
            {/* Compass icon */}
            <circle cx="12" cy="12" r="10" stroke="currentColor" />
            <polygon points="12,2 13.5,10 12,8 10.5,10" fill="#EF4444" stroke="none" />
            <polygon points="12,22 10.5,14 12,16 13.5,14" fill="currentColor" stroke="none" />
            <polygon points="2,12 10,10.5 8,12 10,13.5" fill="currentColor" stroke="none" />
            <polygon points="22,12 14,13.5 16,12 14,10.5" fill="currentColor" stroke="none" />
          </svg>
        </button>
      </div>
    </div>
  )
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}

export default App
