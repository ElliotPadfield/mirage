import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'

const CoordinatesDisplay = ({ location, onCopy, onSave }) => {
  const [isSaving, setIsSaving] = useState(false)
  const [saveName, setSaveName] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (isSaving && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isSaving])

  if (!location) return null

  const handleSave = () => {
    if (isSaving) {
      onSave(saveName || undefined)
      setIsSaving(false)
      setSaveName('')
    } else {
      setIsSaving(true)
    }
  }

  const handleCancel = () => {
    setIsSaving(false)
    setSaveName('')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute bottom-5 left-5 z-[1000]"
    >
      <div className="surface-overlay-strong pointer-events-auto rounded-2xl border border-subtle shadow-md px-4 py-3">
        <div className="text-xs font-medium uppercase tracking-wide text-secondary">Current Location</div>
        <div className="mt-1 text-sm font-sf-mono text-primary">
          {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
        </div>
        <AnimatePresence mode="wait">
          {isSaving ? (
            <motion.div
              key="save-input"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 overflow-hidden"
            >
              <input
                ref={inputRef}
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave()
                  if (e.key === 'Escape') handleCancel()
                }}
                placeholder="Name this location..."
                className="w-full rounded-lg bg-[color:var(--surface-overlay)] px-3 py-1.5 text-xs text-primary placeholder:text-tertiary focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <div className="mt-1.5 flex items-center gap-2">
                <button onClick={handleSave} className="text-xs font-medium text-accent hover:underline no-drag">
                  Save
                </button>
                <button onClick={handleCancel} className="text-xs font-medium text-tertiary hover:text-secondary no-drag">
                  Cancel
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="actions" className="mt-2 flex items-center gap-3">
              <button onClick={onCopy} className="text-xs font-medium text-accent hover:underline no-drag">
                Copy
              </button>
              <button
                onClick={handleSave}
                className="text-xs font-medium text-accent hover:underline no-drag"
                aria-label="Save location to favorites"
              >
                Save
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

export default CoordinatesDisplay
