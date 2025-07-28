'use client'

import { useState, useEffect } from 'react'
import { Users, Plus, Upload, Search, User, Mail, Building, Crown, X } from 'lucide-react'
import GuestForm from '@/components/GuestForm'
import CSVUpload from '@/components/CSVUpload'
import { getButtonClasses, componentStyles } from '@/lib/design-system'

interface Guest {
  id: string
  firstName: string
  lastName: string
  email: string
  company?: string
  position?: string
  phone?: string
  isVip: boolean
  isPlusOne: boolean
  eventGuests?: Array<{
    event: {
      id: string
      name: string
    }
  }>
}

export default function GuestsPage() {
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const [showGuestModal, setShowGuestModal] = useState(false)
  const [showCSVModal, setShowCSVModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredGuests, setFilteredGuests] = useState<Guest[]>([])

  useEffect(() => {
    fetchGuests()
  }, [])

  useEffect(() => {
    // Filter guests based on search term
    if (!searchTerm.trim()) {
      setFilteredGuests(guests)
    } else {
      const filtered = guests.filter(guest =>
        guest.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        guest.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        guest.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (guest.company && guest.company.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      setFilteredGuests(filtered)
    }
  }, [guests, searchTerm])

  const fetchGuests = async () => {
    try {
      const response = await fetch('/api/guests/all')
      const data = await response.json()
      
      // Ensure data is an array
      const guestsArray = Array.isArray(data) ? data : []
      setGuests(guestsArray)
    } catch (error) {
      console.error('Failed to fetch guests:', error)
      setGuests([])
    } finally {
      setLoading(false)
    }
  }

  const addGuest = async (data: { firstName: string; lastName: string; email: string; company?: string; position?: string; phone?: string; isVip: boolean }) => {
    try {
      // Create guest without event (global guest)
      const response = await fetch('/api/guests/global', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      
      if (response.ok) {
        await fetchGuests()
        setShowGuestModal(false)
      } else {
        throw new Error('Failed to add guest')
      }
    } catch (error) {
      console.error('Failed to add guest:', error)
      alert('Failed to add guest')
    }
  }

  const bulkUploadGuests = async (guestsData: Array<{ firstName: string; lastName: string; email: string; company?: string; position?: string; phone?: string; isVip: boolean }>) => {
    try {
      const response = await fetch('/api/guests/bulk-global', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guests: guestsData })
      })
      
      if (response.ok) {
        await fetchGuests()
        setShowCSVModal(false)
      } else {
        throw new Error('Failed to bulk upload guests')
      }
    } catch (error) {
      console.error('Failed to bulk upload guests:', error)
      alert('Failed to bulk upload guests')
    }
  }

  const deleteGuest = async (guestId: string, guestName: string) => {
    if (!confirm(`Are you sure you want to permanently delete ${guestName}? This action cannot be undone and will remove them from all events.`)) {
      return
    }

    try {
      const response = await fetch(`/api/guests/global?guestId=${guestId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        const result = await response.json()
        let message = `Guest ${guestName} has been permanently deleted.`
        
        if (result.deletedPlusOnes && result.deletedPlusOnes.length > 0) {
          const plusOneNames = result.deletedPlusOnes.map((po: any) => `${po.firstName} ${po.lastName} (${po.email})`).join(', ')
          message += `\n\nAlso deleted ${result.deletedPlusOnes.length} plus-one guest(s): ${plusOneNames}`
        }
        
        alert(message)
        await fetchGuests()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete guest')
      }
    } catch (error) {
      console.error('Failed to delete guest:', error)
      alert(`Failed to delete guest: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Guest Management Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Guest Management</h2>
              <p className="text-gray-600">Manage all guests globally across all events</p>
            </div>
            <div className="flex gap-2 ml-4">
              <button
                onClick={() => setShowGuestModal(true)}
                className={`${getButtonClasses('primary')} flex items-center gap-2`}
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Guest</span>
              </button>
              <button
                onClick={() => setShowCSVModal(true)}
                className={`${getButtonClasses('secondary')} flex items-center gap-2`}
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">Bulk Import</span>
              </button>
            </div>
          </div>
        </div>
        {/* Search & Filters */}
        <div className={`${componentStyles.card.base} mb-8`}>
          <div className={componentStyles.card.header}>
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Search className="w-5 h-5 mr-2" />
              Search & Filter Guests
            </h3>
          </div>
          <div className={componentStyles.card.content}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search guests by name, email, or company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {searchTerm && (
              <div className="mt-3 text-sm text-gray-600">
                Found {filteredGuests.length} of {guests.length} guests
              </div>
            )}
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className={`${componentStyles.card.base} hover:shadow-lg transition-shadow`}>
            <div className="flex items-center p-6">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Guests</p>
                <p className="text-2xl font-bold text-gray-900">{guests.length}</p>
              </div>
            </div>
          </div>
          <div className={`${componentStyles.card.base} hover:shadow-lg transition-shadow`}>
            <div className="flex items-center p-6">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Crown className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">VIP Guests</p>
                <p className="text-2xl font-bold text-gray-900">{guests.filter(g => g.isVip).length}</p>
              </div>
            </div>
          </div>
          <div className={`${componentStyles.card.base} hover:shadow-lg transition-shadow`}>
            <div className="flex items-center p-6">
              <div className="p-2 bg-green-100 rounded-lg">
                <Mail className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">With Email</p>
                <p className="text-2xl font-bold text-gray-900">{guests.filter(g => g.email).length}</p>
              </div>
            </div>
          </div>
          <div className={`${componentStyles.card.base} hover:shadow-lg transition-shadow`}>
            <div className="flex items-center p-6">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Building className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Companies</p>
                <p className="text-2xl font-bold text-gray-900">{new Set(guests.filter(g => g.company).map(g => g.company)).size}</p>
              </div>
            </div>
          </div>
          <div className={`${componentStyles.card.base} hover:shadow-lg transition-shadow`}>
            <div className="flex items-center p-6">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <User className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Plus-One Guests</p>
                <p className="text-2xl font-bold text-gray-900">{guests.filter(g => g.isPlusOne).length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Guest List Table */}
        <div className={componentStyles.card.base}>
          <div className={componentStyles.card.header}>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">All Guests</h3>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Total: {guests.length}</span>
                {searchTerm && (
                  <>
                    <span>•</span>
                    <span>Filtered: {filteredGuests.length}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {loading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Loading guests...</p>
            </div>
          ) : filteredGuests.length === 0 ? (
            <div className="p-12 text-center">
              <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No guests found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first guest.'}
              </p>
              <button
                onClick={() => setShowGuestModal(true)}
                className={getButtonClasses('primary')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First Guest
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Guest
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plus-One
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Events
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredGuests.map((guest) => (
                    <tr key={guest.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-700">
                                {guest.firstName.charAt(0)}{guest.lastName.charAt(0)}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {guest.firstName} {guest.lastName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {guest.position || 'No position'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{guest.email}</div>
                        {guest.phone && (
                          <div className="text-sm text-gray-500">{guest.phone}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{guest.company || 'No company'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          guest.isVip ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {guest.isVip ? 'VIP' : 'Regular'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          guest.isPlusOne ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {guest.isPlusOne ? 'Plus-One Guest' : 'Regular Guest'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {guest.eventGuests && guest.eventGuests.length > 0 ? (
                          <div>
                            {guest.eventGuests.map((eg) => (
                              <span key={eg.event.id} className="inline-block bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs mr-1 mb-1">
                                {eg.event.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">No events</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => deleteGuest(guest.id, `${guest.firstName} ${guest.lastName}`)}
                          className="text-red-600 hover:text-red-900 font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Guest Modal */}
      {showGuestModal && (
        <div className={componentStyles.modal.overlay}>
          <div className={componentStyles.modal.container}>
            <div className={componentStyles.modal.header}>
              <h2 className="text-2xl font-bold text-gray-900">Add New Guest</h2>
              <button
                onClick={() => setShowGuestModal(false)}
                className={componentStyles.modal.closeButton}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className={componentStyles.modal.content}>
              <GuestForm onSubmit={addGuest} isGlobal={true} />
            </div>
          </div>
        </div>
      )}

      {/* CSV Upload Modal */}
      {showCSVModal && (
        <div className={componentStyles.modal.overlay}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className={componentStyles.modal.header}>
              <h2 className="text-2xl font-bold text-gray-900">Bulk Import Guests</h2>
              <button
                onClick={() => setShowCSVModal(false)}
                className={componentStyles.modal.closeButton}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className={componentStyles.modal.content}>
              <CSVUpload onUpload={bulkUploadGuests} isGlobal={true} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 