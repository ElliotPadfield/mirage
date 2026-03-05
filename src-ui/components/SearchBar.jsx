import React, { useState } from 'react'
import { motion } from 'motion/react'

function SearchBar({ onSearch }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState(null)

  const handleSearch = async (query) => {
    if (!query.trim() || isSearching) return

    setIsSearching(true)
    setSearchError(null)

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`
      )
      const data = await response.json()

      if (data.length > 0) {
        const { lat, lon, display_name } = data[0]
        onSearch({
          latitude: parseFloat(lat),
          longitude: parseFloat(lon),
          displayName: display_name?.split(',').slice(0, 2).join(',') || query
        })
        setSearchError(null)
      } else {
        setSearchError('No locations found. Try a different search term.')
      }
    } catch (error) {
      console.error('Search failed:', error)
      setSearchError('Search failed. Please check your connection and try again.')
    } finally {
      setIsSearching(false)
    }
  }

  const clearSearch = () => {
    setSearchQuery('')
    setSearchError(null)
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 top-5 z-[1000] flex flex-col items-center gap-2 px-5">
      <div className={`pointer-events-auto flex w-full max-w-md items-center gap-2 rounded-full border px-3 py-2 transition-all duration-200 ${
        searchError
          ? 'border-[rgba(255,69,58,0.4)] bg-[rgba(255,69,58,0.08)]'
          : 'border-transparent surface-overlay focus-within:border-subtle focus-within:shadow-md'
      }`}>
        {isSearching ? (
          <div
            className="h-4 w-4 animate-spin rounded-full border-2"
            style={{ borderColor: 'rgba(60,60,67,0.3)', borderTopColor: 'var(--accent-color)' }}
          />
        ) : (
          <svg className="h-4 w-4 text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        )}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            if (searchError) setSearchError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleSearch(searchQuery)
            }
            if (e.key === 'Escape') {
              clearSearch()
            }
          }}
          placeholder="Search for an address, landmark, or city"
          className="flex-1 bg-transparent text-sm text-primary placeholder:text-tertiary focus:outline-none"
          aria-label="Search for a location"
          aria-describedby={searchError ? 'search-error' : undefined}
        />
        {searchQuery ? (
          <button
            onClick={clearSearch}
            className="icon-button h-7 w-7 no-drag"
            aria-label="Clear search"
          >
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        ) : null}
      </div>
      {searchError && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="pointer-events-auto flex items-center gap-2 rounded-full bg-[rgba(255,69,58,0.12)] px-4 py-2 text-xs text-danger"
          id="search-error"
          role="alert"
        >
          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {searchError}
        </motion.div>
      )}
    </div>
  )
}

export default SearchBar
