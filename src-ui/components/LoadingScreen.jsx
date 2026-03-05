import React from 'react'
import { motion, useReducedMotion } from 'motion/react'

const BOOT_STEPS = [
  { id: 'boot', label: 'Warming up Mirage engines' },
  { id: 'bridge', label: 'Starting backend service' },
  { id: 'map', label: 'Calibrating teleport grid' },
  { id: 'wrap', label: 'Buffing mission control glass' }
]

const ORBIT_LAYERS = [
  { size: 148, duration: 8, opacity: 0.55, delay: 0 },
  { size: 188, duration: 10, opacity: 0.4, delay: -1.5 },
  { size: 228, duration: 14, opacity: 0.28, delay: -0.5 }
]

function LoadingScreen({ activeStep }) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div key="loading-screen" className="flex h-screen w-screen items-center justify-center surface-window">
      <div className="drag-region fixed top-0 left-0 right-0 h-8 z-50" />
      <div className="macos-elevated startup-panel relative w-[460px] max-w-[90vw] rounded-3xl px-10 pb-10 pt-12 text-center shadow-window no-drag">
        <div className="relative mx-auto mb-8 flex h-56 w-56 items-center justify-center">
          <div className="startup-glow" />
          <motion.div
            className="startup-core"
            animate={
              prefersReducedMotion
                ? { opacity: 1 }
                : { rotate: [0, 4, -2, 0], scale: [1, 1.02, 0.98, 1] }
            }
            transition={
              prefersReducedMotion
                ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 6, repeat: Infinity, ease: 'easeInOut' }
            }
          >
            <svg className="h-12 w-12 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C8.095 2 5 5.095 5 9c0 4.657 5.446 12.135 6.046 12.95a1.2 1.2 0 001.908 0C13.554 21.135 19 13.657 19 9c0-3.905-3.095-7-7-7zm0 9.5A2.5 2.5 0 1112 6a2.5 2.5 0 010 5z" />
            </svg>
          </motion.div>
          {ORBIT_LAYERS.map((layer, index) => (
            <motion.div
              key={layer.size}
              className="startup-orbit"
              style={{ '--startup-size': `${layer.size}px`, opacity: layer.opacity }}
              animate={prefersReducedMotion ? { opacity: layer.opacity } : { rotate: 360 }}
              transition={
                prefersReducedMotion
                  ? { duration: 2, repeat: Infinity, repeatType: 'mirror', delay: index * 0.2 }
                  : { duration: layer.duration, repeat: Infinity, ease: 'linear', delay: layer.delay }
              }
            >
              <span className="startup-pin" />
            </motion.div>
          ))}
        </div>
        <h2 className="font-sf-pro text-xl font-semibold text-primary">Spinning up the teleporters…</h2>
        <p className="mt-2 text-sm text-secondary">
          Hang tight while Mirage connects to the backend.
        </p>
        <ul className="startup-steps mt-6 space-y-2 text-left text-sm">
          {BOOT_STEPS.map((step, index) => {
            const status = index < activeStep ? 'done' : index === activeStep ? 'active' : 'pending'
            return (
              <li key={step.id} className={`startup-step startup-step-${status}`}>
                <span className="startup-step-icon">
                  {status === 'done' ? (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : status === 'active' ? (
                    <motion.span
                      className="startup-step-pulse"
                      animate={
                        prefersReducedMotion
                          ? { opacity: [0.6, 1, 0.6] }
                          : { scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }
                      }
                      transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  ) : (
                    <span className="startup-step-dot" />
                  )}
                </span>
                <span>{step.label}</span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

export { BOOT_STEPS }
export default LoadingScreen
