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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Guest Management</h1>
              <p className="text-gray-600">Manage all guests globally</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowGuestModal(true)}
                className={getButtonClasses('primary')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Guest
              </button>
              <button
                onClick={() => setShowCSVModal(true)}
                className={getButtonClasses('secondary')}
              >
                <Upload className="w-4 h-4 mr-2" />
                Bulk Import
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search guests by name, email, or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <div className="text-2xl font-bold text-gray-900">{guests.length}</div>
                <div className="text-sm text-gray-600">Total Guests</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <Crown className="w-8 h-8 text-yellow-600 mr-3" />
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {guests.filter(g => g.isVip).length}
                </div>
                <div className="text-sm text-gray-600">VIP Guests</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <Mail className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {guests.filter(g => g.email).length}
                </div>
                <div className="text-sm text-gray-600">With Email</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <Building className="w-8 h-8 text-purple-600 mr-3" />
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {new Set(guests.filter(g => g.company).map(g => g.company)).size}
                </div>
                <div className="text-sm text-gray-600">Companies</div>
              </div>
            </div>
          </div>
        </div>

        {/* Guests Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">All Guests</h2>
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
                      Events
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