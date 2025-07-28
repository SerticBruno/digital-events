'use client'

import { useState, useEffect } from 'react'
import { Users, Mail, QrCode, BarChart3, Plus, Send, Download, X, Upload, Scan, User } from 'lucide-react'
import EventForm from '@/components/EventForm'
import GuestForm from '@/components/GuestForm'
import CSVUpload from '@/components/CSVUpload'
import AddExistingGuest from '@/components/AddExistingGuest'
import { getButtonClasses, getInputClasses, componentStyles } from '@/lib/design-system'

interface Event {
  id: string
  name: string
  date: string
  location?: string
  _count: {
    guests: number
    invitations: number
    qrCodes: number
    surveys: number
  }
}

interface Guest {
  id: string
  firstName: string
  lastName: string
  email: string
  company?: string
  isVip: boolean
  invitations: Array<{
    type: string
    status: string
    response?: string
  }>
}

export default function Dashboard() {
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const [showEventModal, setShowEventModal] = useState(false)
  const [showGuestModal, setShowGuestModal] = useState(false)
  const [showCSVModal, setShowCSVModal] = useState(false)
  const [showExistingGuestModal, setShowExistingGuestModal] = useState(false)
  const [selectedGuests, setSelectedGuests] = useState<Set<string>>(new Set())
  const [sendingEmails, setSendingEmails] = useState(false)

  useEffect(() => {
    fetchEvents()
  }, [])

  useEffect(() => {
    if (selectedEvent) {
      fetchGuests(selectedEvent.id)
    }
  }, [selectedEvent])

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events')
      const data = await response.json()
      
      // Ensure data is an array
      const eventsArray = Array.isArray(data) ? data : []
      setEvents(eventsArray)
      
      if (eventsArray.length > 0) {
        setSelectedEvent(eventsArray[0])
      }
    } catch (error) {
      console.error('Failed to fetch events:', error)
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  const fetchGuests = async (eventId: string) => {
    try {
      const response = await fetch(`/api/guests?eventId=${eventId}`)
      const data = await response.json()
      
      // Ensure data is an array
      const guestsArray = Array.isArray(data) ? data : []
      setGuests(guestsArray)
    } catch (error) {
      console.error('Failed to fetch guests:', error)
      setGuests([])
    }
  }

  const createEvent = async (data: { name: string; date: string; location?: string; description?: string }) => {
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      
      if (response.ok) {
        await fetchEvents()
        setShowEventModal(false)
      } else {
        throw new Error('Failed to create event')
      }
    } catch (error) {
      console.error('Failed to create event:', error)
      alert('Failed to create event')
    }
  }

  const addGuest = async (data: { firstName: string; lastName: string; email: string; company?: string; position?: string; phone?: string; isVip: boolean }) => {
    if (!selectedEvent) return
    
    try {
      const response = await fetch('/api/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, eventId: selectedEvent.id })
      })
      
      if (response.ok) {
        await fetchGuests(selectedEvent.id)
        setShowGuestModal(false)
      } else {
        throw new Error('Failed to add guest')
      }
    } catch (error) {
      console.error('Failed to add guest:', error)
      alert('Failed to add guest')
    }
  }

  const bulkUploadGuests = async (guests: Array<{ firstName: string; lastName: string; email: string; company?: string; position?: string; phone?: string; isVip: boolean }>) => {
    if (!selectedEvent) return
    
    try {
      const response = await fetch('/api/guests/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: selectedEvent.id, guests })
      })
      
      if (response.ok) {
        await fetchGuests(selectedEvent.id)
        setShowCSVModal(false)
      } else {
        throw new Error('Failed to bulk upload guests')
      }
    } catch (error) {
      console.error('Failed to bulk upload guests:', error)
      alert('Failed to bulk upload guests')
    }
  }

  const toggleGuestSelection = (guestId: string) => {
    const newSelected = new Set(selectedGuests)
    if (newSelected.has(guestId)) {
      newSelected.delete(guestId)
    } else {
      newSelected.add(guestId)
    }
    setSelectedGuests(newSelected)
  }

  const selectAllGuests = () => {
    setSelectedGuests(new Set(guests.map(g => g.id)))
  }

  const clearSelection = () => {
    setSelectedGuests(new Set())
  }

  const testEmail = async () => {
    const testEmail = prompt('Enter email address for testing (use budasevo.trouts@gmail.com for testing):')
    if (!testEmail) return

    try {
      const response = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail })
      })
      const result = await response.json()
      
      if (response.ok) {
        alert('Test email sent successfully! Check your inbox.')
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Failed to send test email:', error)
      alert('Failed to send test email')
    }
  }

  const sendEmails = async (type: string, guestIds: string[]) => {
    if (!selectedEvent) {
      alert('Please select an event first')
      return
    }

    if (guestIds.length === 0) {
      alert('Please select at least one guest')
      return
    }

    setSendingEmails(true)
    try {
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, guestIds, eventId: selectedEvent.id })
      })
      const result = await response.json()
      
      if (response.ok) {
        const successCount = result.results?.filter((r: { success: boolean }) => r.success).length || 0
        const failureCount = result.results?.filter((r: { success: boolean }) => !r.success).length || 0
        
        let message = `Successfully sent ${successCount} emails`
        if (failureCount > 0) {
          message += `, ${failureCount} failed`
        }
        
        console.log('Email sending results:', result.results)
        alert(message)
        clearSelection()
        if (selectedEvent) {
          fetchGuests(selectedEvent.id)
        }
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Failed to send emails:', error)
      alert('Failed to send emails')
    } finally {
      setSendingEmails(false)
    }
  }

  const sendPlusOneInvitations = async (guestIds: string[]) => {
    if (!selectedEvent) {
      alert('Please select an event first')
      return
    }

    if (guestIds.length === 0) {
      alert('Please select at least one guest')
      return
    }

    // Prompt for plus-one information
    const plusOneEmails: string[] = []
    const plusOneNames: string[] = []

    for (const guestId of guestIds) {
      const guest = guests.find(g => g.id === guestId)
      if (!guest) continue

      const plusOneEmail = prompt(`Enter plus-one email for ${guest.firstName} ${guest.lastName}:`)
      const plusOneName = prompt(`Enter plus-one name for ${guest.firstName} ${guest.lastName}:`)
      
      if (plusOneEmail && plusOneName) {
        plusOneEmails.push(plusOneEmail)
        plusOneNames.push(plusOneName)
      } else {
        alert('Plus-one email and name are required')
        return
      }
    }

    setSendingEmails(true)
    try {
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'plus_one_invitation', 
          guestIds, 
          eventId: selectedEvent.id,
          plusOneEmails,
          plusOneNames
        })
      })
      const result = await response.json()
      
      if (response.ok) {
        const successCount = result.results?.filter((r: { success: boolean }) => r.success).length || 0
        const failureCount = result.results?.filter((r: { success: boolean }) => !r.success).length || 0
        
        let message = `Successfully sent ${successCount} plus-one invitations`
        if (failureCount > 0) {
          message += `, ${failureCount} failed`
        }
        
        console.log('Plus-one invitation results:', result.results)
        alert(message)
        clearSelection()
        if (selectedEvent) {
          fetchGuests(selectedEvent.id)
        }
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Failed to send plus-one invitations:', error)
      alert('Failed to send plus-one invitations')
    } finally {
      setSendingEmails(false)
    }
  }

  const sendPlusOneQRCodes = async (guestIds: string[]) => {
    if (!selectedEvent) {
      alert('Please select an event first')
      return
    }

    if (guestIds.length === 0) {
      alert('Please select at least one guest')
      return
    }

    // Prompt for plus-one information
    const plusOneEmails: string[] = []
    const plusOneNames: string[] = []

    for (const guestId of guestIds) {
      const guest = guests.find(g => g.id === guestId)
      if (!guest) continue

      const plusOneEmail = prompt(`Enter plus-one email for ${guest.firstName} ${guest.lastName}:`)
      const plusOneName = prompt(`Enter plus-one name for ${guest.firstName} ${guest.lastName}:`)
      
      if (plusOneEmail && plusOneName) {
        plusOneEmails.push(plusOneEmail)
        plusOneNames.push(plusOneName)
      } else {
        alert('Plus-one email and name are required')
        return
      }
    }

    setSendingEmails(true)
    try {
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'plus_one_qr_code', 
          guestIds, 
          eventId: selectedEvent.id,
          plusOneEmails,
          plusOneNames
        })
      })
      const result = await response.json()
      
      if (response.ok) {
        const successCount = result.results?.filter((r: { success: boolean }) => r.success).length || 0
        const failureCount = result.results?.filter((r: { success: boolean }) => !r.success).length || 0
        
        let message = `Successfully sent ${successCount} plus-one QR codes`
        if (failureCount > 0) {
          message += `, ${failureCount} failed`
        }
        
        console.log('Plus-one QR code results:', result.results)
        alert(message)
        clearSelection()
        if (selectedEvent) {
          fetchGuests(selectedEvent.id)
        }
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Failed to send plus-one QR codes:', error)
      alert('Failed to send plus-one QR codes')
    } finally {
      setSendingEmails(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Event Dashboard</h1>
              <p className="text-gray-600">Manage your events and guests</p>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="/scanner"
                className={getButtonClasses('warning')}
              >
                <Scan className="w-4 h-4" />
                QR Scanner
              </a>
              <button 
                onClick={() => setShowEventModal(true)}
                className={getButtonClasses('primary')}
              >
                <Plus className="w-4 h-4" />
                New Event
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Event Selection */}
        <div className="mb-8">
          <label className={componentStyles.label}>
            Select Event
          </label>
          <select
            value={selectedEvent?.id || ''}
            onChange={(e) => {
              const event = events.find(ev => ev.id === e.target.value)
              setSelectedEvent(event || null)
            }}
            className={getInputClasses()}
          >
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name} - {new Date(event.date).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>

        {selectedEvent && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className={componentStyles.card.base}>
                <div className="flex items-center p-6">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Guests</p>
                    <p className="text-2xl font-bold text-gray-900">{selectedEvent._count.guests}</p>
                  </div>
                </div>
              </div>

              <div className={componentStyles.card.base}>
                <div className="flex items-center p-6">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Mail className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Emails Sent</p>
                    <p className="text-2xl font-bold text-gray-900">{selectedEvent._count.invitations}</p>
                  </div>
                </div>
              </div>

              <div className={componentStyles.card.base}>
                <div className="flex items-center p-6">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <QrCode className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">QR Codes</p>
                    <p className="text-2xl font-bold text-gray-900">{selectedEvent._count.qrCodes}</p>
                  </div>
                </div>
              </div>

              <div className={componentStyles.card.base}>
                <div className="flex items-center p-6">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <BarChart3 className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Surveys</p>
                    <p className="text-2xl font-bold text-gray-900">{selectedEvent._count.surveys}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className={componentStyles.card.base}>
              <div className={componentStyles.card.header}>
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowCSVModal(true)}
                      className={getButtonClasses('warning')}
                    >
                      <Upload className="w-4 h-4" />
                      Bulk Import
                    </button>
                    <button
                      onClick={() => setShowExistingGuestModal(true)}
                      className={getButtonClasses('outline')}
                    >
                      <User className="w-4 h-4" />
                      Add Existing
                    </button>
                    <button
                      onClick={() => setShowGuestModal(true)}
                      className={getButtonClasses('success')}
                    >
                      <Plus className="w-4 h-4" />
                      Add Guest
                    </button>
                  </div>
                </div>
              </div>
              <div className={componentStyles.card.content}>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">
                      {selectedGuests.size} of {guests.length} guests selected
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={selectAllGuests}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Select All
                      </button>
                      <button
                        onClick={clearSelection}
                        className="text-sm text-gray-600 hover:text-gray-800"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={() => sendEmails('save_the_date', Array.from(selectedGuests))}
                    disabled={selectedGuests.size === 0 || sendingEmails}
                    className={getButtonClasses('primary')}
                  >
                    <Send className="w-4 h-4" />
                    {sendingEmails ? 'Sending...' : `Send Save the Date (${selectedGuests.size})`}
                  </button>
                  <button
                    onClick={() => sendEmails('invitation', Array.from(selectedGuests))}
                    disabled={selectedGuests.size === 0 || sendingEmails}
                    className={getButtonClasses('success')}
                  >
                    <Send className="w-4 h-4" />
                    {sendingEmails ? 'Sending...' : `Send Invitations (${selectedGuests.size})`}
                  </button>
                  <button
                    onClick={() => sendEmails('qr_code', Array.from(selectedGuests))}
                    disabled={selectedGuests.size === 0 || sendingEmails}
                    className={getButtonClasses('warning')}
                  >
                    <QrCode className="w-4 h-4" />
                    {sendingEmails ? 'Sending...' : `Send QR Codes (${selectedGuests.size})`}
                  </button>
                  <button
                    onClick={() => sendPlusOneInvitations(Array.from(selectedGuests))}
                    disabled={selectedGuests.size === 0 || sendingEmails}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    {sendingEmails ? 'Sending...' : `Send Plus-One Invitations (${selectedGuests.size})`}
                  </button>
                  <button
                    onClick={() => sendPlusOneQRCodes(Array.from(selectedGuests))}
                    disabled={selectedGuests.size === 0 || sendingEmails}
                    className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <QrCode className="w-4 h-4" />
                    {sendingEmails ? 'Sending...' : `Send Plus-One QR Codes (${selectedGuests.size})`}
                  </button>
                  <button className={getButtonClasses('secondary')}>
                    <Download className="w-4 h-4" />
                    Export Guest List
                  </button>
                  <button
                    onClick={testEmail}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    Test Email
                  </button>
                </div>
              </div>
            </div>

            {/* Guests Table */}
            <div className={componentStyles.card.base}>
              <div className={componentStyles.card.header}>
                <h3 className="text-lg font-medium text-gray-900">Guest List</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={selectedGuests.size === guests.length && guests.length > 0}
                          onChange={() => selectedGuests.size === guests.length ? clearSelection() : selectAllGuests()}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Guest
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Company
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {guests.map((guest) => (
                      <tr key={guest.id} className={selectedGuests.has(guest.id) ? 'bg-blue-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedGuests.has(guest.id)}
                            onChange={() => toggleGuestSelection(guest.id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {guest.firstName} {guest.lastName}
                            </div>
                            <div className="text-sm text-gray-500">{guest.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {guest.company || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            guest.invitations[0]?.response === 'COMING' 
                              ? 'bg-green-100 text-green-800'
                              : guest.invitations[0]?.response === 'NOT_COMING'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {guest.invitations[0]?.response || 'No Response'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            guest.isVip ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {guest.isVip ? 'VIP' : 'Regular'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button className="text-blue-600 hover:text-blue-900 mr-3">
                            Edit
                          </button>
                          <button className="text-red-600 hover:text-red-900">
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Event Modal */}
      {showEventModal && (
        <div className={componentStyles.modal.overlay}>
          <div className={componentStyles.modal.container}>
            <div className={componentStyles.modal.header}>
              <h2 className="text-2xl font-bold text-gray-900">Create New Event</h2>
              <button
                onClick={() => setShowEventModal(false)}
                className={componentStyles.modal.closeButton}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className={componentStyles.modal.content}>
              <EventForm onSubmit={createEvent} />
            </div>
          </div>
        </div>
      )}

      {/* Guest Modal */}
      {showGuestModal && selectedEvent && (
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
              <GuestForm eventId={selectedEvent.id} onSubmit={addGuest} />
            </div>
          </div>
        </div>
      )}

      {/* CSV Upload Modal */}
      {showCSVModal && selectedEvent && (
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
              <CSVUpload eventId={selectedEvent.id} onUpload={bulkUploadGuests} />
            </div>
          </div>
        </div>
      )}

      {/* Add Existing Guest Modal */}
      {showExistingGuestModal && selectedEvent && (
        <AddExistingGuest
          eventId={selectedEvent.id}
          onGuestAdded={() => {
            fetchGuests(selectedEvent.id)
            setShowExistingGuestModal(false)
          }}
          onClose={() => setShowExistingGuestModal(false)}
        />
      )}
    </div>
  )
} 