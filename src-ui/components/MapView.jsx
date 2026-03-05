import React, { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import { motion, useReducedMotion } from 'motion/react'
import { useApp } from '../context/AppContext'
import { initializeMapWithUserCountry } from '../utils/countryUtils'
import SearchBar from './SearchBar'
import CoordinatesDisplay from './CoordinatesDisplay'
import SavedLocationsPanel from './SavedLocationsPanel'
import 'leaflet/dist/leaflet.css'

import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const TILE_LIGHT = {
  url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
}

const TILE_DARK = {
  url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
}

const MAP_LOADING_MESSAGES = [
  'Assembling passport stamps…',
  'Polishing the satellite lenses…',
  'Negotiating with map sprites…'
]

const MapView = () => {
  const { state, actions } = useApp()
  const [mapCenter, setMapCenter] = useState([-25.2744, 133.7751])
  const [mapZoom, setMapZoom] = useState(4)
  const [isInitializing, setIsInitializing] = useState(true)
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0)
  const [isDarkMode, setIsDarkMode] = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )
  const mapRef = useRef(null)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e) => setIsDarkMode(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView(mapCenter, mapZoom, { animate: true })
    }
  }, [mapCenter, mapZoom])

  useEffect(() => {
    const initializeMap = async () => {
      try {
        const userCountryCoords = await initializeMapWithUserCountry()
        setMapCenter(userCountryCoords)
        setMapZoom(6)
        setIsInitializing(false)
      } catch (error) {
        console.error('Failed to initialize map with user country:', error)
        setIsInitializing(false)
      }
    }
    initializeMap()
  }, [])

  useEffect(() => {
    if (!isInitializing) return
    const interval = setInterval(() => {
      setLoadingMessageIndex((prev) => (prev + 1) % MAP_LOADING_MESSAGES.length)
    }, 2200)
    return () => clearInterval(interval)
  }, [isInitializing])

  useEffect(() => {
    if (state.currentLocation) {
      setMapCenter([state.currentLocation.latitude, state.currentLocation.longitude])
      setMapZoom(15)
    }
  }, [state.currentLocation])

  const handleMapClick = (e) => {
    const { lat, lng } = e.latlng
    actions.setCurrentLocation({ latitude: lat, longitude: lng })
  }

  const handleSearchResult = ({ latitude, longitude, displayName }) => {
    setMapCenter([latitude, longitude])
    setMapZoom(15)
    actions.addNotification({
      type: 'success',
      title: 'Location Found',
      message: displayName
    })
  }

  const copyCoordinates = () => {
    if (state.currentLocation) {
      const coords = `${state.currentLocation.latitude}, ${state.currentLocation.longitude}`
      navigator.clipboard.writeText(coords)
      actions.addNotification({
        type: 'success',
        title: 'Coordinates Copied',
        message: coords
      })
    }
  }

  if (isInitializing) {
    const activeMessage = MAP_LOADING_MESSAGES[loadingMessageIndex]
    return (
      <div className="relative flex h-full w-full items-center justify-center">
        <div className="map-startup-card macos-elevated flex max-w-md flex-col items-center gap-6 rounded-3xl px-10 py-10 text-center">
          <div className="map-startup-orb-wrapper">
            <div className="map-startup-halo" />
            <motion.div
              className="map-startup-orb"
              animate={prefersReducedMotion ? { opacity: 1 } : { rotate: 360 }}
              transition={
                prefersReducedMotion
                  ? { duration: 4, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }
                  : { duration: 18, repeat: Infinity, ease: 'linear' }
              }
            >
              <span className="map-startup-orb-latitude map-startup-orb-latitude-1" />
              <span className="map-startup-orb-latitude map-startup-orb-latitude-2" />
              <span className="map-startup-orb-latitude map-startup-orb-latitude-3" />
              <motion.span
                className="map-startup-orb-pin"
                animate={
                  prefersReducedMotion
                    ? { opacity: [0.7, 1, 0.7] }
                    : { y: [-4, 4, -4], opacity: [0.6, 1, 0.6] }
                }
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              />
            </motion.div>
            <motion.div
              className="map-startup-spark"
              animate={
                prefersReducedMotion
                  ? { opacity: [0.3, 0.6, 0.3] }
                  : { scale: [0.9, 1.1, 0.9], opacity: [0.2, 0.6, 0.2] }
              }
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-primary">Charting your launch point</h3>
            <motion.p
              key={activeMessage}
              className="mt-2 text-sm text-secondary"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              {activeMessage}
            </motion.p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full">
      <SearchBar onSearch={handleSearchResult} />

      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        className="h-full w-full"
        ref={mapRef}
        whenCreated={(mapInstance) => { mapRef.current = mapInstance }}
        style={{ pointerEvents: 'auto' }}
      >
        <TileLayer
          key={isDarkMode ? 'dark' : 'light'}
          attribution={isDarkMode ? TILE_DARK.attribution : TILE_LIGHT.attribution}
          url={isDarkMode ? TILE_DARK.url : TILE_LIGHT.url}
        />

        {state.currentLocation && (
          <Marker
            position={[state.currentLocation.latitude, state.currentLocation.longitude]}
            icon={L.divIcon({
              className: 'custom-marker',
              html: `
                <div class="marker-bounce relative w-8 h-8 flex items-center justify-center">
                  <span class="marker-pulse-ring"></span>
                  <div class="relative w-6 h-6 bg-[#0a84ff] rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                    <div class="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                </div>
              `,
              iconSize: [32, 32],
              iconAnchor: [16, 16]
            })}
          >
            <Popup className="popup-panel">
              <div className="space-y-2 p-2">
                <div className="text-sm font-sf-pro font-medium text-primary">Selected Location</div>
                <div className="text-xs font-sf-mono text-secondary">
                  {state.currentLocation.latitude.toFixed(6)}, {state.currentLocation.longitude.toFixed(6)}
                </div>
                <button onClick={copyCoordinates} className="text-xs font-medium text-accent hover:underline no-drag">
                  Copy Coordinates
                </button>
              </div>
            </Popup>
          </Marker>
        )}

        <MapClickHandler onMapClick={handleMapClick} />
      </MapContainer>

      <CoordinatesDisplay
        location={state.currentLocation}
        onCopy={copyCoordinates}
        onSave={(name) => {
          actions.saveLocation(state.currentLocation, name || undefined)
        }}
      />

      <SavedLocationsPanel
        savedLocations={state.savedLocations}
        locationHistory={state.locationHistory}
        onSelectLocation={(loc) => {
          setMapCenter([loc.latitude, loc.longitude])
          setMapZoom(15)
          actions.setCurrentLocation({ latitude: loc.latitude, longitude: loc.longitude })
        }}
        onRemoveLocation={(id) => actions.removeSavedLocation(id)}
        onClearHistory={() => actions.clearHistory()}
      />

      {/* Location Status Badge */}
      {state.isLocationActive && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute right-5 top-5 z-[1000]"
        >
          <div className="pointer-events-auto simulation-badge">
            <div className="simulation-badge-orbit">
              <span className="simulation-badge-ring" />
              <span className="simulation-badge-core" />
              {!prefersReducedMotion && (
                <>
                  <motion.span
                    className="simulation-badge-spark"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3.2, repeat: Infinity, ease: 'linear' }}
                  >
                    <span className="simulation-badge-spark-dot" />
                  </motion.span>
                  <motion.span
                    className="simulation-badge-spark simulation-badge-spark-offset"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: 'linear', delay: 0.8 }}
                  >
                    <span className="simulation-badge-spark-dot" />
                  </motion.span>
                </>
              )}
            </div>
            <span className="simulation-badge-label">Location simulation active</span>
          </div>
        </motion.div>
      )}
    </div>
  )
}

const MapClickHandler = ({ onMapClick }) => {
  useMapEvents({ click: onMapClick })
  return null
}

export default MapView
