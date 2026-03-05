import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import Sidebar from './components/Sidebar'
import MapView from './components/MapView'
import ControlPanel from './components/ControlPanel'
import LoadingScreen, { BOOT_STEPS } from './components/LoadingScreen'
import { AppProvider, useApp } from './context/AppContext'
import './App.css'

function AppContent() {
  const { state } = useApp()
  const [activeBootStep, setActiveBootStep] = useState(0)
  const [minBootTimeReached, setMinBootTimeReached] = useState(false)
  const [bootTimeoutExceeded, setBootTimeoutExceeded] = useState(false)
  const { pythonStatus } = state
  const [showRaceBorder, setShowRaceBorder] = useState(false)
  const prevLocationActive = useRef(false)

  // Detect simulation start (false→true transition) and trigger racing border
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
    }, 10000)

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
      <div key="error-screen" className="flex h-screen w-screen items-center justify-center surface-window">
        <div className="drag-region fixed top-0 left-0 right-0 h-8 z-50" />
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="macos-elevated w-full max-w-md rounded-2xl px-8 py-6 text-center no-drag"
        >
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger">
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h2 className="text-lg font-sf-pro font-semibold text-primary">Backend unavailable</h2>
          <p className="mt-2 text-sm text-secondary">
            Mirage can't reach the Python service right now. Check that it's running and try again.
          </p>
          <button onClick={() => window.location.reload()} className="btn-macos btn-macos-primary mt-4 no-drag">
            Retry
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div key="main-ui" className="app-container surface-window text-primary">
      <div className="drag-region fixed top-0 left-0 right-0 h-8 z-50" />
      <div className="flex h-full pt-8">
        <motion.aside
          initial={{ opacity: 0, x: -36 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.32, ease: 'easeOut' }}
          className="surface-sidebar relative flex w-80 flex-col border-r border-window"
        >
          <Sidebar />
        </motion.aside>
        <div className="flex flex-1 flex-col">
          <div className={`relative flex-1${state.isLocationActive ? ' sim-active-glow' : ''}`}>
            <MapView />
            {showRaceBorder && <div className="sim-race-border" />}
          </div>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease: 'easeOut' }}
            className={`surface-toolbar border-t border-window transition-colors duration-500${state.isLocationActive ? ' toolbar-sim-active' : ''}`}
          >
            <ControlPanel />
          </motion.div>
        </div>
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
