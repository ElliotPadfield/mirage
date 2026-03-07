import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react'
import { tauriAPI } from '../utils/tauriAPI'
import ToastContainer from '../components/ToastContainer'

const API_PREFIX = '/api/v1'
const DEFAULT_API_PORT = import.meta.env.VITE_API_PORT || '54323'
const DEFAULT_API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || `http://localhost:${DEFAULT_API_PORT}${API_PREFIX}`

const buildApiBaseUrl = (baseUrl) => {
  if (!baseUrl) {
    return DEFAULT_API_BASE_URL
  }
  const sanitized = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  return `${sanitized}${API_PREFIX}`
}

const SIMULATION_SUCCESS_PREFIXES = [
  "✨ Your device thinks it's at",
  '🛸 Beam locked in at',
  '🎉 Coordinates set to',
  '🌍 Now streaming from',
  '🚀 Location relay active at'
]

// Load saved locations from localStorage
const loadSavedLocations = () => {
  try {
    const saved = localStorage.getItem('mirage-saved-locations')
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

// Load location history from localStorage
const loadLocationHistory = () => {
  try {
    const history = localStorage.getItem('mirage-location-history')
    return history ? JSON.parse(history) : []
  } catch {
    return []
  }
}

// Initial state
const initialState = {
  // Device state
  devices: {},
  selectedDevice: null,
  connectionStatus: 'disconnected',

  // Location state
  currentLocation: null,
  isLocationActive: false,
  savedLocations: loadSavedLocations(),
  locationHistory: loadLocationHistory(),

  // API state
  pythonStatus: { running: false },
  daemonStatus: { installed: false, running: false, supported: false },
  apiBaseUrl: DEFAULT_API_BASE_URL,

  // Notifications
  notifications: []
}

// Action types
export const ActionTypes = {
  SET_DEVICES: 'SET_DEVICES',
  SELECT_DEVICE: 'SELECT_DEVICE',
  SET_CONNECTION_STATUS: 'SET_CONNECTION_STATUS',
  SET_CURRENT_LOCATION: 'SET_CURRENT_LOCATION',
  SET_LOCATION_ACTIVE: 'SET_LOCATION_ACTIVE',
  SET_PYTHON_STATUS: 'SET_PYTHON_STATUS',
  SET_DAEMON_STATUS: 'SET_DAEMON_STATUS',
  SET_API_BASE_URL: 'SET_API_BASE_URL',
  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
  REMOVE_NOTIFICATION: 'REMOVE_NOTIFICATION',
  ADD_SAVED_LOCATION: 'ADD_SAVED_LOCATION',
  REMOVE_SAVED_LOCATION: 'REMOVE_SAVED_LOCATION',
  ADD_LOCATION_HISTORY: 'ADD_LOCATION_HISTORY',
  CLEAR_LOCATION_HISTORY: 'CLEAR_LOCATION_HISTORY'
}

// Reducer
function appReducer(state, action) {
  switch (action.type) {
    case ActionTypes.SET_DEVICES:
      return { ...state, devices: action.payload }
    
    case ActionTypes.SELECT_DEVICE:
      return { ...state, selectedDevice: action.payload }
    
    case ActionTypes.SET_CONNECTION_STATUS:
      return { ...state, connectionStatus: action.payload }
    
    case ActionTypes.SET_CURRENT_LOCATION:
      return { ...state, currentLocation: action.payload }
    
    case ActionTypes.SET_LOCATION_ACTIVE:
      return { ...state, isLocationActive: action.payload }

    case ActionTypes.SET_PYTHON_STATUS:
      return { ...state, pythonStatus: action.payload }

    case ActionTypes.SET_DAEMON_STATUS:
      return { ...state, daemonStatus: action.payload }

    case ActionTypes.SET_API_BASE_URL:
      return { ...state, apiBaseUrl: action.payload }
    
    case ActionTypes.ADD_NOTIFICATION:
      return {
        ...state,
        notifications: [...state.notifications, action.payload]
      }
    
    case ActionTypes.REMOVE_NOTIFICATION:
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload)
      }

    case ActionTypes.ADD_SAVED_LOCATION: {
      const newSaved = [action.payload, ...state.savedLocations.filter(
        loc => !(loc.latitude === action.payload.latitude && loc.longitude === action.payload.longitude)
      )].slice(0, 10) // Keep max 10 saved locations
      localStorage.setItem('mirage-saved-locations', JSON.stringify(newSaved))
      return { ...state, savedLocations: newSaved }
    }

    case ActionTypes.REMOVE_SAVED_LOCATION: {
      const filtered = state.savedLocations.filter(loc => loc.id !== action.payload)
      localStorage.setItem('mirage-saved-locations', JSON.stringify(filtered))
      return { ...state, savedLocations: filtered }
    }

    case ActionTypes.ADD_LOCATION_HISTORY: {
      const newHistory = [action.payload, ...state.locationHistory.filter(
        loc => !(loc.latitude === action.payload.latitude && loc.longitude === action.payload.longitude)
      )].slice(0, 20) // Keep max 20 history items
      localStorage.setItem('mirage-location-history', JSON.stringify(newHistory))
      return { ...state, locationHistory: newHistory }
    }

    case ActionTypes.CLEAR_LOCATION_HISTORY:
      localStorage.removeItem('mirage-location-history')
      return { ...state, locationHistory: [] }

    default:
      return state
  }
}

// Context
const AppContext = createContext()

// Provider component
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState)
  const devicesFetchedRef = useRef(false)
  const successMessageIndexRef = useRef(0)
  const apiBaseUrlRef = useRef(initialState.apiBaseUrl)
  
  // Check daemon status on mount
  useEffect(() => {
    const checkDaemonStatus = async () => {
      try {
        const status = await tauriAPI.getDaemonStatus()
        dispatch({ type: ActionTypes.SET_DAEMON_STATUS, payload: status })
      } catch (error) {
        console.error('Failed to check daemon status:', error)
      }
    }
    checkDaemonStatus()
  }, [])

  // Check Python status periodically
  useEffect(() => {
    let intervalId = null
    let isPythonStable = false
    let lastRunningState = null

    const checkPythonStatus = async () => {
      try {
        {
          const status = await tauriAPI.getPythonStatus()

          // Only dispatch if status actually changed (prevents unnecessary re-renders)
          if (lastRunningState !== status.running) {
            lastRunningState = status.running
            dispatch({ type: ActionTypes.SET_PYTHON_STATUS, payload: status })
            console.log('🔍 Python status changed:', status.running)
          }
          
          if (status.baseUrl) {
            const nextApiBase = buildApiBaseUrl(status.baseUrl)
            if (apiBaseUrlRef.current !== nextApiBase) {
              apiBaseUrlRef.current = nextApiBase
              dispatch({ type: ActionTypes.SET_API_BASE_URL, payload: nextApiBase })
            }
          }
          
          // If Python is running and we haven't fetched devices yet, fetch them
          if (status.running && !devicesFetchedRef.current && status.baseUrl) {
            console.log('🔍 Python is running, fetching devices...')
            // Small delay to ensure API base URL is properly set
            setTimeout(async () => {
              try {
                await actions.fetchDevices()
                devicesFetchedRef.current = true
              } catch (error) {
                console.error('Failed to fetch devices:', error)
              }
            }, 100)
          }
          
          // If Python has been running for a while, reduce check frequency
          if (status.running && !isPythonStable) {
            console.log('🔍 Python is stable, reducing check frequency')
            isPythonStable = true
            clearInterval(intervalId)
            // Check every 30 seconds instead of 3 seconds
            intervalId = setInterval(checkPythonStatus, 30000)
          }
        }
      } catch (error) {
        console.error('Failed to check Python status:', error)
        // Set status to not running on error
        dispatch({ type: ActionTypes.SET_PYTHON_STATUS, payload: { running: false } })
        isPythonStable = false
      }
    }
    
    // Initial check
    checkPythonStatus()
    
    // Check every 3 seconds initially, then reduce frequency once Python is stable
    intervalId = setInterval(checkPythonStatus, 3000)
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, []) // Keep empty dependency array to avoid infinite loops
  
  // Removed API URL state management - using fixed URL
  
  // API helper functions
  const apiCall = async (endpoint, options = {}) => {
    try {
      const baseUrl = apiBaseUrlRef.current || state.apiBaseUrl
      const fullUrl = `${baseUrl}${endpoint}`
      console.log('🔍 Making API call to:', fullUrl)
      
      const response = await fetch(fullUrl, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          ...options.headers
        },
        cache: 'no-cache',
        ...options
      })
      
      if (!response.ok) {
        let errorMessage = `API call failed: ${response.status}`
        try {
          const errorData = await response.json()
          if (errorData.error) errorMessage = errorData.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      return await response.json()
    } catch (error) {
      console.error('API call failed:', error)
      throw error
    }
  }
  
  // Action creators
  const actions = {
    setDevices: (devices) => dispatch({ type: ActionTypes.SET_DEVICES, payload: devices }),
    selectDevice: (device) => dispatch({ type: ActionTypes.SELECT_DEVICE, payload: device }),
    setConnectionStatus: (status) => dispatch({ type: ActionTypes.SET_CONNECTION_STATUS, payload: status }),
    setCurrentLocation: (location) => dispatch({ type: ActionTypes.SET_CURRENT_LOCATION, payload: location }),
    setLocationActive: (active) => dispatch({ type: ActionTypes.SET_LOCATION_ACTIVE, payload: active }),
    setApiBaseUrl: (baseUrl) => {
      const nextBase = buildApiBaseUrl(baseUrl)
      apiBaseUrlRef.current = nextBase
      dispatch({ type: ActionTypes.SET_API_BASE_URL, payload: nextBase })
    },
    addNotification: (notification) => {
      const id = Date.now() + Math.random()
      dispatch({ type: ActionTypes.ADD_NOTIFICATION, payload: { ...notification, id } })
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        dispatch({ type: ActionTypes.REMOVE_NOTIFICATION, payload: id })
      }, 5000)
    },
    removeNotification: (id) => dispatch({ type: ActionTypes.REMOVE_NOTIFICATION, payload: id }),

    // Location favorites/history
    saveLocation: (location, name) => {
      const savedLocation = {
        ...location,
        id: Date.now(),
        name: name || `Location ${state.savedLocations.length + 1}`,
        savedAt: new Date().toISOString()
      }
      dispatch({ type: ActionTypes.ADD_SAVED_LOCATION, payload: savedLocation })
      actions.addNotification({
        type: 'success',
        title: 'Location Saved',
        message: `"${savedLocation.name}" added to favorites`
      })
    },

    removeSavedLocation: (id) => {
      dispatch({ type: ActionTypes.REMOVE_SAVED_LOCATION, payload: id })
    },

    addToHistory: (location) => {
      const historyItem = {
        ...location,
        id: Date.now(),
        usedAt: new Date().toISOString()
      }
      dispatch({ type: ActionTypes.ADD_LOCATION_HISTORY, payload: historyItem })
    },

    clearHistory: () => {
      dispatch({ type: ActionTypes.CLEAR_LOCATION_HISTORY })
      actions.addNotification({
        type: 'info',
        title: 'History Cleared',
        message: 'Location history has been cleared'
      })
    },

    // Daemon actions
    installDaemon: async () => {
      try {
        await tauriAPI.installDaemon()
        const status = await tauriAPI.getDaemonStatus()
        dispatch({ type: ActionTypes.SET_DAEMON_STATUS, payload: status })
        actions.addNotification({
          type: 'success',
          title: 'Helper Installed',
          message: 'Mirage helper service installed. No more password prompts!'
        })
        return true
      } catch (error) {
        actions.addNotification({
          type: 'error',
          title: 'Installation Failed',
          message: error.message
        })
        throw error
      }
    },

    uninstallDaemon: async () => {
      try {
        await tauriAPI.uninstallDaemon()
        const status = await tauriAPI.getDaemonStatus()
        dispatch({ type: ActionTypes.SET_DAEMON_STATUS, payload: status })
        actions.addNotification({
          type: 'info',
          title: 'Helper Removed',
          message: 'Mirage helper service has been uninstalled'
        })
        return true
      } catch (error) {
        actions.addNotification({
          type: 'error',
          title: 'Uninstall Failed',
          message: error.message
        })
        throw error
      }
    },

    // API actions
    fetchDevices: async () => {
      try {
        const devices = await apiCall('/devices')
        actions.setDevices(devices)
        devicesFetchedRef.current = true
        return devices
      } catch (error) {
        actions.addNotification({
          type: 'error',
          title: 'Failed to fetch devices',
          message: error.message
        })
        throw error
      }
    },
    
    connectDevice: async (deviceData) => {
      try {
        const result = await apiCall('/devices/connect', {
          method: 'POST',
          body: JSON.stringify(deviceData)
        })
        actions.setConnectionStatus('connected')
        actions.addNotification({
          type: 'success',
          title: 'Device Connected',
          message: `Connected to ${deviceData.udid}`
        })
        return result
      } catch (error) {
        actions.addNotification({
          type: 'error',
          title: 'Connection Failed',
          message: error.message
        })
        throw error
      }
    },
    
    setLocation: async (location) => {
      try {
        // Convert from { latitude, longitude } to { lat, lng } format expected by API
        const apiLocation = {
          lat: location.latitude,
          lng: location.longitude
        }
        
        await apiCall('/location/update', {
          method: 'POST',
          body: JSON.stringify(apiLocation)
        })
        actions.setCurrentLocation(location)
        return true
      } catch (error) {
        actions.addNotification({
          type: 'error',
          title: 'Failed to set location',
          message: error.message
        })
        throw error
      }
    },
    
    startLocationSimulation: async (udid) => {
      try {
        const connType = state.selectedDevice?.connection_type || 'USB'
        await apiCall('/location/set', {
          method: 'POST',
          body: JSON.stringify({ udid, connType })
        })
        actions.setLocationActive(true)

        // Add current location to history
        if (state.currentLocation) {
          actions.addToHistory(state.currentLocation)
        }

        // Build location-aware success message
        const successIndex =
          SIMULATION_SUCCESS_PREFIXES.length > 0
            ? successMessageIndexRef.current % SIMULATION_SUCCESS_PREFIXES.length
            : 0
        const prefix = SIMULATION_SUCCESS_PREFIXES[successIndex] || '✨ Location set to'
        successMessageIndexRef.current += 1

        // Try to get place name via reverse geocoding
        let locationName = 'the selected location'
        if (state.currentLocation) {
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${state.currentLocation.latitude}&lon=${state.currentLocation.longitude}&zoom=14`
            )
            const data = await response.json()
            if (data.address) {
              // Build a concise location name
              const parts = []
              if (data.address.suburb || data.address.neighbourhood || data.address.hamlet) {
                parts.push(data.address.suburb || data.address.neighbourhood || data.address.hamlet)
              }
              if (data.address.city || data.address.town || data.address.village) {
                parts.push(data.address.city || data.address.town || data.address.village)
              }
              if (data.address.country) {
                parts.push(data.address.country)
              }
              locationName = parts.slice(0, 2).join(', ') || data.display_name?.split(',').slice(0, 2).join(',') || locationName
            }
          } catch {
            // Fallback to coordinates if reverse geocode fails
            locationName = `${state.currentLocation.latitude.toFixed(4)}, ${state.currentLocation.longitude.toFixed(4)}`
          }
        }

        actions.addNotification({
          type: 'success',
          title: 'Beam engaged',
          message: `${prefix} ${locationName}`
        })
        return true
      } catch (error) {
        actions.addNotification({
          type: 'error',
          title: 'Failed to start location simulation',
          message: error.message
        })
        throw error
      }
    },
    
    stopLocationSimulation: async () => {
      try {
        await apiCall('/location/stop', { method: 'POST' })
        actions.setLocationActive(false)
        actions.addNotification({
          type: 'success',
          title: 'Location Simulation Stopped',
          message: 'Location simulation has been cleared'
        })
        return true
      } catch (error) {
        actions.addNotification({
          type: 'error',
          title: 'Failed to stop location simulation',
          message: error.message
        })
        throw error
      }
    },
    
    // Expose apiCall function for components to use
    apiCall: apiCall
  }
  
  return (
    <AppContext.Provider value={{ state, actions, apiCall }}>
      {children}

      <ToastContainer
        notifications={state.notifications}
        onDismiss={(id) => actions.removeNotification(id)}
      />
    </AppContext.Provider>
  )
}

// Hook to use context
export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}
