import React, { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import { useApp } from '../context/AppContext'
import { initializeMapWithUserCountry } from '../utils/countryUtils'

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

// Default center (Europe) shown immediately while geo-lookup runs in background
const DEFAULT_CENTER = [48.8566, 2.3522]
const DEFAULT_ZOOM = 4

const createCustomMarkerIcon = (locationName, lat, lng) => {
  const name = locationName || 'Selected Location'
  const coords = `${lat.toFixed(4)}, ${lng.toFixed(4)}`

  return L.divIcon({
    className: 'custom-marker-v2',
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
        <!-- Tooltip -->
        <div style="
          display:flex;align-items:center;gap:8px;
          padding:8px 14px;
          background:#0F0F14CC;
          backdrop-filter:blur(24px);
          -webkit-backdrop-filter:blur(24px);
          border:1px solid #FFFFFF10;
          border-radius:16px;
          white-space:nowrap;
          margin-bottom:0;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#8B5CF6" stroke="none">
            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z"/>
          </svg>
          <span style="font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:700;color:#FFFFFF;">${name}</span>
          <div style="width:1px;height:14px;background:#FFFFFF25;"></div>
          <span style="font-family:'Inter',sans-serif;font-size:11px;color:#A1A1AA;">${coords}</span>
        </div>
        <!-- Gradient line -->
        <div style="width:2px;height:24px;background:linear-gradient(to bottom,#8B5CF6,transparent);"></div>
        <!-- Glowing dot -->
        <div style="position:relative;display:flex;align-items:center;justify-content:center;">
          <div style="
            position:absolute;
            width:48px;height:48px;
            border-radius:50%;
            background:#8B5CF612;
          "></div>
          <div style="
            width:14px;height:14px;
            border-radius:50%;
            background:#8B5CF6;
            box-shadow:0 0 16px 6px #8B5CF660;
          "></div>
        </div>
      </div>
    `,
    iconSize: [200, 120],
    iconAnchor: [100, 120]
  })
}

const MapView = ({ mapRef: externalMapRef }) => {
  const { state, actions } = useApp()
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER)
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM)
  const [locationName, setLocationName] = useState(null)
  const isDarkMode = true // Always dark theme
  const internalMapRef = useRef(null)
  const geocodeTimeoutRef = useRef(null)

  // Sync the internal map ref to the external ref passed from App
  const setMapRef = (instance) => {
    internalMapRef.current = instance
    if (externalMapRef) {
      externalMapRef.current = instance
    }
  }

  useEffect(() => {
    if (internalMapRef.current) {
      internalMapRef.current.setView(mapCenter, mapZoom, { animate: true })
    }
  }, [mapCenter, mapZoom])

  // Geo-lookup runs in background — map shows immediately with default center
  useEffect(() => {
    const initializeMap = async () => {
      try {
        const userCountryCoords = await initializeMapWithUserCountry()
        setMapCenter(userCountryCoords)
        setMapZoom(6)
      } catch (error) {
        console.error('Failed to initialize map with user country:', error)
      }
    }
    initializeMap()
  }, [])

  useEffect(() => {
    if (state.currentLocation) {
      setMapCenter([state.currentLocation.latitude, state.currentLocation.longitude])
      setMapZoom(15)
    }
  }, [state.currentLocation])

  // Reverse geocode for marker tooltip
  useEffect(() => {
    if (!state.currentLocation) {
      setLocationName(null)
      return
    }
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
    return () => {
      if (geocodeTimeoutRef.current) {
        clearTimeout(geocodeTimeoutRef.current)
      }
    }
  }, [state.currentLocation?.latitude, state.currentLocation?.longitude])

  const handleMapClick = (e) => {
    const { lat, lng } = e.latlng
    actions.setCurrentLocation({ latitude: lat, longitude: lng })
  }

  return (
    <div className="h-full w-full">
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        className="h-full w-full"
        ref={setMapRef}
        whenCreated={(mapInstance) => { setMapRef(mapInstance) }}
        style={{ pointerEvents: 'auto' }}
        zoomControl={false}
        scrollWheelZoom={true}
        zoomSnap={0}
        zoomDelta={0.25}
        wheelDebounceTime={40}
        wheelPxPerZoomLevel={120}
        inertia={true}
        worldCopyJump={true}
      >
        <TileLayer
          key={isDarkMode ? 'dark' : 'light'}
          attribution={isDarkMode ? TILE_DARK.attribution : TILE_LIGHT.attribution}
          url={isDarkMode ? TILE_DARK.url : TILE_LIGHT.url}
        />

        {state.currentLocation && (
          <Marker
            position={[state.currentLocation.latitude, state.currentLocation.longitude]}
            interactive={false}
            icon={createCustomMarkerIcon(
              locationName,
              state.currentLocation.latitude,
              state.currentLocation.longitude
            )}
          />

        )}

        <MapClickHandler onMapClick={handleMapClick} />
      </MapContainer>
    </div>
  )
}

const MapClickHandler = ({ onMapClick }) => {
  useMapEvents({ click: onMapClick })
  return null
}

export default MapView
