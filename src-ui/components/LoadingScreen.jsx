import React from 'react'
import { motion } from 'motion/react'

const BOOT_STEPS = [
  { id: 'boot', label: 'Starting backend...' },
  { id: 'bridge', label: 'Connecting to bridge...' },
  { id: 'map', label: 'Loading map data...' },
  { id: 'wrap', label: 'Ready to launch...' }
]

function LoadingScreen({ activeStep }) {
  const progress = ((activeStep + 1) / BOOT_STEPS.length) * 100
  const currentLabel = BOOT_STEPS[activeStep]?.label ?? BOOT_STEPS[0].label

  return (
    <div
      key="loading-screen"
      className="flex h-screen w-screen items-center justify-center"
      style={{ background: '#0F0F14' }}
    >
      {/* Drag region for window controls */}
      <div className="drag-region fixed top-0 left-0 right-0 h-8 z-50" />

      {/* Subtle dark map background texture */}
      <div
        className="fixed inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 25% 35%, rgba(139, 92, 246, 0.15) 0%, transparent 50%), ' +
            'radial-gradient(circle at 75% 65%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)'
        }}
      />

      {/* Centered card */}
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-[380px] max-w-[90vw] flex flex-col items-center no-drag"
      >
        {/* App icon */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center justify-center"
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            background: 'rgba(139, 92, 246, 0.12)',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          {/* Navigation / arrow icon */}
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#8B5CF6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="3 11 22 2 13 21 11 13 3 11" fill="rgba(139, 92, 246, 0.2)" stroke="#8B5CF6" />
          </svg>
        </motion.div>

        {/* App name */}
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.18 }}
          className="mt-5 font-jakarta font-bold text-white"
          style={{ fontSize: 24 }}
        >
          Mirage
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.26 }}
          className="mt-1.5 font-inter"
          style={{ fontSize: 13, color: '#A1A1AA' }}
        >
          Location Simulation Tool
        </motion.p>

        {/* Progress bar */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0.9 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.4, delay: 0.34 }}
          className="w-full mt-8 rounded-full overflow-hidden"
          style={{
            height: 4,
            background: 'rgba(255, 255, 255, 0.06)'
          }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{ background: '#8B5CF6' }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          />
        </motion.div>

        {/* Status text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="mt-4 font-inter text-center"
          style={{ fontSize: 13, color: '#A1A1AA' }}
          key={currentLabel}
        >
          <motion.span
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            {currentLabel}
          </motion.span>
        </motion.p>

        {/* macOS password info box */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.55 }}
          className="w-full mt-10 flex gap-3 rounded-xl px-4 py-3.5"
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderLeft: '3px solid #F59E0B'
          }}
        >
          {/* Shield icon */}
          <div className="flex-shrink-0 mt-0.5">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#F59E0B"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <rect x="10" y="10" width="4" height="5" rx="1" fill="#F59E0B" stroke="none" />
              <path d="M10 10V8a2 2 0 1 1 4 0v2" fill="none" stroke="#F59E0B" />
            </svg>
          </div>

          <div className="flex flex-col gap-1">
            <span
              className="font-inter font-semibold text-white"
              style={{ fontSize: 13 }}
            >
              macOS may ask for your password
            </span>
            <span
              className="font-inter leading-relaxed"
              style={{ fontSize: 12, color: '#A1A1AA' }}
            >
              Mirage needs admin privileges to set up the network tunnel. This is normal and only happens once per session.
            </span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}

export { BOOT_STEPS }
export default LoadingScreen
