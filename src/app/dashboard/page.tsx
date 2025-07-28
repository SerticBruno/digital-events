'use client'

import { useState, useEffect } from 'react'
import { Calendar, Users, Mail, QrCode, BarChart3, Plus, Send, Download, X, Upload, Scan } from 'lucide-react'
import EventForm from '@/components/EventForm'
import GuestForm from '@/components/GuestForm'
import CSVUpload from '@/components/CSVUpload'
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
      setEvents(data)
      if (data.length > 0) {
        setSelectedEvent(data[0])
      }
    } catch (error) {
      console.error('Failed to fetch events:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchGuests = async (eventId: string) => {
    try {
      const response = await fetch(`/api/guests?eventId=${eventId}`)
      const data = await response.json()
      setGuests(data)
    } catch (error) {
      console.error('Failed to fetch guests:', error)
    }
  }

  const createEvent = async (data: any) => {
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

  const addGuest = async (data: any) => {
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

  const bulkUploadGuests = async (guests: any[]) => {
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

  const sendEmails = async (type: string, guestIds: string[]) => {
    try {
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, guestIds })
      })
      const result = await response.json()
      alert(result.message)
      if (selectedEvent) {
        fetchGuests(selectedEvent.id)
      }
    } catch (error) {
      console.error('Failed to send emails:', error)
      alert('Failed to send emails')
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
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Digital Events</h1>
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
      </header>

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
                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={() => sendEmails('save_the_date', guests.map(g => g.id))}
                    className={getButtonClasses('primary')}
                  >
                    <Send className="w-4 h-4" />
                    Send Save the Date
                  </button>
                  <button
                    onClick={() => sendEmails('invitation', guests.map(g => g.id))}
                    className={getButtonClasses('success')}
                  >
                    <Send className="w-4 h-4" />
                    Send Invitations
                  </button>
                  <button
                    onClick={() => sendEmails('qr_code', guests.map(g => g.id))}
                    className={getButtonClasses('warning')}
                  >
                    <QrCode className="w-4 h-4" />
                    Send QR Codes
                  </button>
                  <button className={getButtonClasses('secondary')}>
                    <Download className="w-4 h-4" />
                    Export Guest List
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
                      <tr key={guest.id}>
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
    </div>
  )
} 