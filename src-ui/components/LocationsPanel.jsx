import React from 'react'
import { motion } from 'motion/react'
import { useApp } from '../context/AppContext'

const formatAbbreviatedLat = (lat) => {
  const abs = Math.abs(lat)
  const dir = lat >= 0 ? 'N' : 'S'
  return `${abs.toFixed(2)}${String.fromCharCode(176)}${dir}`
}

// Pin icon for location rows
const PinIcon = ({ color = '#8B5CF6', className = 'h-4 w-4' }) => (
  <svg className={className} fill="none" stroke={color} viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const LocationsPanel = ({ onSelectLocation }) => {
  const { state, actions } = useApp()
  const { savedLocations, locationHistory } = state

  if (savedLocations.length === 0 && locationHistory.length === 0) return null

  return (
    <div
      className="w-[300px] rounded-[20px] border"
      style={{
        background: '#0F0F14CC',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderColor: '#FFFFFF10',
      }}
    >
      <div className="p-4">
        <div className="max-h-[calc(100vh-400px)] overflow-y-auto scrollbar-thin space-y-4">
          {/* Starred / Favorites */}
          {savedLocations.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                {/* Star icon - outline only */}
                <svg className="h-4 w-4" fill="none" stroke="#F59E0B" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                <span
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#FFFFFF',
                  }}
                >
                  Starred
                </span>
              </div>
              <div className="space-y-0.5">
                {savedLocations.slice(0, 5).map((loc) => (
                  <button
                    key={loc.id}
                    onClick={() => onSelectLocation(loc)}
                    className="group flex w-full items-center gap-3 py-2 px-1 text-left transition-colors no-drag rounded-lg"
                    style={{ background: 'transparent' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#FFFFFF08' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <PinIcon color="#8B5CF6" className="h-4 w-4 flex-shrink-0" />
                    <span
                      className="truncate flex-1"
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '13px',
                        color: '#D4D4D8',
                      }}
                    >
                      {loc.name}
                    </span>
                    <span
                      className="flex-shrink-0 group-hover:hidden"
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '11px',
                        color: '#71717A',
                      }}
                    >
                      {formatAbbreviatedLat(loc.latitude)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        actions.removeSavedLocation(loc.id)
                      }}
                      className="hidden group-hover:flex h-5 w-5 items-center justify-center rounded transition-colors hover:bg-white/10 flex-shrink-0"
                      aria-label={`Remove ${loc.name}`}
                    >
                      <svg className="h-3 w-3" fill="none" stroke="#71717A" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recent */}
          {locationHistory.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="#A1A1AA" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span
                    style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#FFFFFF',
                    }}
                  >
                    Recent
                  </span>
                </div>
                <button
                  onClick={() => actions.clearHistory()}
                  className="text-[11px] transition-colors no-drag"
                  style={{ color: '#71717A' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#A1A1AA' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#71717A' }}
                >
                  Clear
                </button>
              </div>
              <div className="space-y-0.5">
                {locationHistory.slice(0, 5).map((loc) => (
                  <button
                    key={loc.id}
                    onClick={() => onSelectLocation(loc)}
                    className="flex w-full items-center gap-3 py-2 px-1 text-left transition-colors no-drag rounded-lg"
                    style={{ background: 'transparent' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#FFFFFF08' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <PinIcon color="#71717A" className="h-4 w-4 flex-shrink-0" />
                    <span
                      className="truncate flex-1"
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '13px',
                        color: '#D4D4D8',
                      }}
                    >
                      {loc.name || `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`}
                    </span>
                    <span
                      className="flex-shrink-0"
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '11px',
                        color: '#71717A',
                      }}
                    >
                      {formatAbbreviatedLat(loc.latitude)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default LocationsPanel
