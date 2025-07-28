'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, User, Mail, Building, X } from 'lucide-react'
import { getInputClasses, getButtonClasses, componentStyles } from '@/lib/design-system'

interface Guest {
  id: string
  firstName: string
  lastName: string
  email: string
  company?: string
  position?: string
  phone?: string
  isVip: boolean
  event?: {
    id: string
    name: string
  }
}

interface AddExistingGuestProps {
  eventId: string
  onGuestAdded: () => void
  onClose: () => void
}

export default function AddExistingGuest({ eventId, onGuestAdded, onClose }: AddExistingGuestProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Guest[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedGuests, setSelectedGuests] = useState<Set<string>>(new Set())
  const [isAdding, setIsAdding] = useState(false)

  const searchGuests = useCallback(async () => {
    if (!searchTerm.trim()) {
      // If no search term, show all guests
      setIsSearching(true)
      try {
        const response = await fetch('/api/guests/all')
        const data = await response.json()
        console.log('All guests:', data)
        setSearchResults(data)
      } catch (error) {
        console.error('Failed to get all guests:', error)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(`/api/guests/search?q=${encodeURIComponent(searchTerm)}`)
      const data = await response.json()
      console.log('Search results:', data)
      setSearchResults(data)
    } catch (error) {
      console.error('Failed to search guests:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [searchTerm])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchGuests()
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchTerm, searchGuests])

  // Load all guests when component mounts
  useEffect(() => {
    searchGuests()
  }, [searchGuests])

  const toggleGuestSelection = (guestId: string) => {
    const newSelected = new Set(selectedGuests)
    if (newSelected.has(guestId)) {
      newSelected.delete(guestId)
    } else {
      newSelected.add(guestId)
    }
    setSelectedGuests(newSelected)
  }

  const addSelectedGuests = async () => {
    if (selectedGuests.size === 0) return

    const requestData = {
      eventId,
      guestIds: Array.from(selectedGuests)
    }
    
    console.log('Sending request to add guests:', requestData)

    setIsAdding(true)
    try {
      const response = await fetch('/api/events/guests/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })

      const responseData = await response.json()
      console.log('Response from add guests API:', { status: response.status, data: responseData })

      if (response.ok) {
        onGuestAdded()
        onClose()
      } else {
        throw new Error(responseData.error || 'Failed to add guests')
      }
    } catch (error) {
      console.error('Failed to add guests:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to add guests to event'
      alert(errorMessage)
    } finally {
      setIsAdding(false)
    }
  }

  const isGuestAlreadyInEvent = (guest: Guest) => {
    // Check if guest is already in the current event
    return guest.event?.id === eventId
  }

  return (
    <div className={componentStyles.modal.overlay}>
      <div className={componentStyles.modal.container}>
        <div className={componentStyles.modal.header}>
          <h2 className="text-2xl font-bold text-gray-900">Add Existing Guests</h2>
          <button
            onClick={onClose}
            className={componentStyles.modal.closeButton}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className={componentStyles.modal.content}>
          <div className="space-y-6">
            {/* Search */}
            <div>
              <label className={componentStyles.label}>
                <Search className="w-4 h-4 inline mr-2" />
                Search Guests
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={getInputClasses()}
                placeholder="Search by name, email, or company... (leave empty to see all guests)"
              />
            </div>

            {/* Search Results */}
            {isSearching && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-600">Searching...</p>
              </div>
            )}

            {!isSearching && searchResults.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Search Results ({searchResults.length})
                </h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {searchResults.map((guest) => {
                    const isSelected = selectedGuests.has(guest.id)
                    const isAlreadyInEvent = isGuestAlreadyInEvent(guest)
                    
                    return (
                      <div
                        key={guest.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        } ${isAlreadyInEvent ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={() => !isAlreadyInEvent && toggleGuestSelection(guest.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => !isAlreadyInEvent && toggleGuestSelection(guest.id)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                disabled={isAlreadyInEvent}
                              />
                              <div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium text-gray-900">
                                    {guest.firstName} {guest.lastName}
                                  </span>
                                  {guest.isVip && (
                                    <span className="px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded-full">
                                      VIP
                                    </span>
                                  )}
                                  {isAlreadyInEvent && (
                                    <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-800 rounded-full">
                                      Already Added
                                    </span>
                                  )}
                                </div>
                                                                 <div className="text-sm text-gray-600 mt-1">
                                   <div className="flex items-center space-x-4">
                                     <span className="flex items-center">
                                       <Mail className="w-3 h-3 mr-1" />
                                       {guest.email}
                                     </span>
                                     {guest.company && (
                                       <span className="flex items-center">
                                         <Building className="w-3 h-3 mr-1" />
                                         {guest.company}
                                       </span>
                                     )}
                                   </div>
                                   {guest.event && (
                                     <div className="mt-2 text-xs text-gray-500">
                                       <span>Currently in: {guest.event.name}</span>
                                     </div>
                                   )}
                                 </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {!isSearching && searchTerm && searchResults.length === 0 && (
              <div className="text-center py-8">
                <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No guests found matching your search</p>
                <p className="text-sm text-gray-500 mt-2">Try a different search term or check if there are any guests in the database</p>
              </div>
            )}

            {!isSearching && !searchTerm && searchResults.length === 0 && (
              <div className="text-center py-8">
                <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No guests found in database</p>
                <p className="text-sm text-gray-500 mt-2">Add some guests first using the &quot;Add Guest&quot; button</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                {selectedGuests.size > 0 && (
                  <span>{selectedGuests.size} guest(s) selected</span>
                )}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className={getButtonClasses('secondary')}
                >
                  Cancel
                </button>
                <button
                  onClick={addSelectedGuests}
                  disabled={selectedGuests.size === 0 || isAdding}
                  className={getButtonClasses('primary')}
                >
                  {isAdding ? 'Adding...' : `Add ${selectedGuests.size} Guest(s)`}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 