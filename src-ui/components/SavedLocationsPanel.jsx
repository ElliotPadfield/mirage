import React from 'react'
import { motion } from 'motion/react'

const SavedLocationsPanel = ({ savedLocations, locationHistory, onSelectLocation, onRemoveLocation, onClearHistory }) => {
  if (savedLocations.length === 0 && locationHistory.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      className="absolute bottom-5 right-5 z-[1000]"
    >
      <div className="surface-overlay-strong pointer-events-auto max-h-64 w-56 overflow-y-auto rounded-2xl border border-subtle shadow-md px-3 py-3">
        {savedLocations.length > 0 && (
          <div className="mb-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-medium uppercase tracking-wide text-secondary">Favorites</span>
              <span className="text-[10px] text-tertiary">{savedLocations.length}</span>
            </div>
            <div className="space-y-1">
              {savedLocations.slice(0, 5).map((loc) => (
                <button
                  key={loc.id}
                  onClick={() => onSelectLocation(loc)}
                  className="group flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-[color:var(--surface-overlay-active)] no-drag"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium text-primary">{loc.name}</div>
                    <div className="truncate text-[10px] text-tertiary">
                      {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemoveLocation(loc.id)
                    }}
                    className="ml-2 rounded p-0.5 opacity-0 transition-opacity hover:bg-[color:var(--surface-overlay-active)] group-hover:opacity-100"
                    aria-label={`Remove ${loc.name}`}
                  >
                    <svg className="h-3 w-3 text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </button>
              ))}
            </div>
          </div>
        )}

        {locationHistory.length > 0 && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-medium uppercase tracking-wide text-secondary">Recent</span>
              <button
                onClick={onClearHistory}
                className="text-[10px] text-tertiary hover:text-secondary no-drag"
              >
                Clear
              </button>
            </div>
            <div className="space-y-1">
              {locationHistory.slice(0, 5).map((loc) => (
                <button
                  key={loc.id}
                  onClick={() => onSelectLocation(loc)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-[color:var(--surface-overlay-active)] no-drag"
                >
                  <svg className="h-3 w-3 flex-shrink-0 text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="truncate text-[10px] text-secondary">
                    {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default SavedLocationsPanel
