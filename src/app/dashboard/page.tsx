'use client'

import { useState, useEffect } from 'react'
import { Users, Mail, QrCode, BarChart3, Plus, Send, Download, X, Upload, Scan, User, RefreshCw, Edit, Trash2 } from 'lucide-react'
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
  description?: string
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
    hasPlusOne?: boolean
    plusOneName?: string
    plusOneEmail?: string
  }>
  qrCodes: Array<{
    code: string
    type: string
    isUsed: boolean
    usedAt?: string
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
  const [updatingPlusOne, setUpdatingPlusOne] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [showEditEventModal, setShowEditEventModal] = useState(false)
  const [showEditGuestModal, setShowEditGuestModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null)

  useEffect(() => {
    fetchEvents()
  }, [])

  useEffect(() => {
    if (selectedEvent) {
      fetchGuests(selectedEvent.id)
    }
  }, [selectedEvent])

  // Auto-refresh guests every 30 seconds
  useEffect(() => {
    if (!selectedEvent) return

    const interval = setInterval(() => {
      fetchGuests(selectedEvent.id)
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
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
      setRefreshing(true)
      const response = await fetch(`/api/guests?eventId=${eventId}`)
      const data = await response.json()
      
      // Ensure data is an array
      const guestsArray = Array.isArray(data) ? data : []
      setGuests(guestsArray)
    } catch (error) {
      console.error('Failed to fetch guests:', error)
      setGuests([])
    } finally {
      setRefreshing(false)
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

  const togglePlusOne = async (guestId: string, currentHasPlusOne: boolean) => {
    if (!selectedEvent) return

    setUpdatingPlusOne(true)
    try {
      const response = await fetch('/api/guests/plus-one', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          guestId, 
          eventId: selectedEvent.id, 
          hasPlusOne: !currentHasPlusOne 
        })
      })

      if (response.ok) {
        await fetchGuests(selectedEvent.id)
      } else {
        alert('Failed to update plus-one status')
      }
    } catch (error) {
      console.error('Failed to update plus-one status:', error)
      alert('Failed to update plus-one status')
    } finally {
      setUpdatingPlusOne(false)
    }
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

  const sendQRCodesToConfirmedAttendees = async () => {
    if (!selectedEvent) {
      alert('Please select an event first')
      return
    }

    // Filter for confirmed attendees only
    const confirmedGuests = guests.filter(guest => 
      guest.invitations[0]?.response === 'COMING' || 
      guest.invitations[0]?.response === 'COMING_WITH_PLUS_ONE'
    )

    if (confirmedGuests.length === 0) {
      alert('No confirmed attendees found. Please wait for guests to respond to invitations.')
      return
    }

    setSendingEmails(true)
    try {
      // Send QR codes to main guests
      const mainGuestIds = confirmedGuests.map(g => g.id)
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'qr_code', 
          guestIds: mainGuestIds, 
          eventId: selectedEvent.id
        })
      })
      const result = await response.json()
      
      if (response.ok) {
        let successCount = result.results?.filter((r: { success: boolean }) => r.success).length || 0
        let failureCount = result.results?.filter((r: { success: boolean }) => !r.success).length || 0
        
        // Send QR codes to plus-one guests
        const plusOneGuests = confirmedGuests.filter(guest => 
          guest.invitations[0]?.response === 'COMING_WITH_PLUS_ONE' && 
          guest.invitations[0]?.plusOneEmail
        )

        if (plusOneGuests.length > 0) {
          const plusOneEmails = plusOneGuests.map(g => g.invitations[0]?.plusOneEmail || '')
          const plusOneNames = plusOneGuests.map(g => g.invitations[0]?.plusOneName || `Guest of ${g.firstName} ${g.lastName}`)
          
          const plusOneResponse = await fetch('/api/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              type: 'plus_one_qr_code', 
              guestIds: plusOneGuests.map(g => g.id), 
              eventId: selectedEvent.id,
              plusOneEmails,
              plusOneNames
            })
          })
          const plusOneResult = await plusOneResponse.json()
          
          if (plusOneResponse.ok) {
            const plusOneSuccessCount = plusOneResult.results?.filter((r: { success: boolean }) => r.success).length || 0
            const plusOneFailureCount = plusOneResult.results?.filter((r: { success: boolean }) => !r.success).length || 0
            
            successCount += plusOneSuccessCount
            failureCount += plusOneFailureCount
          } else {
            failureCount += plusOneGuests.length
          }
        }
        
        let message = `Successfully sent QR codes to ${successCount} attendees`
        if (failureCount > 0) {
          message += `, ${failureCount} failed`
        }
        
        alert(message)
        if (selectedEvent) {
          fetchGuests(selectedEvent.id)
        }
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Failed to send QR codes to confirmed attendees:', error)
      alert('Failed to send QR codes to confirmed attendees')
    } finally {
      setSendingEmails(false)
    }
  }

  const editEvent = async (data: { id: string; name: string; date: string; location?: string; description?: string }) => {
    try {
      const response = await fetch('/api/events', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      
      if (response.ok) {
        await fetchEvents()
        setShowEditEventModal(false)
        setEditingEvent(null)
        // Update selected event if it was the one being edited
        if (selectedEvent?.id === data.id) {
          const updatedEvent = await response.json()
          setSelectedEvent(updatedEvent)
        }
      } else {
        throw new Error('Failed to update event')
      }
    } catch (error) {
      console.error('Failed to update event:', error)
      alert('Failed to update event')
    }
  }

  const deleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/events?eventId=${eventId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        await fetchEvents()
        if (selectedEvent?.id === eventId) {
          setSelectedEvent(null)
        }
      } else {
        throw new Error('Failed to delete event')
      }
    } catch (error) {
      console.error('Failed to delete event:', error)
      alert('Failed to delete event')
    }
  }

  const editGuest = async (data: { id: string; firstName: string; lastName: string; email: string; company?: string; position?: string; phone?: string; isVip: boolean }) => {
    try {
      const response = await fetch('/api/guests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      
      if (response.ok) {
        if (selectedEvent) {
          await fetchGuests(selectedEvent.id)
        }
        setShowEditGuestModal(false)
        setEditingGuest(null)
      } else {
        throw new Error('Failed to update guest')
      }
    } catch (error) {
      console.error('Failed to update guest:', error)
      alert('Failed to update guest')
    }
  }

  const deleteGuest = async (guestId: string) => {
    if (!selectedEvent) return

    if (!confirm('Are you sure you want to remove this guest from the event?')) {
      return
    }

    try {
      const response = await fetch(`/api/guests?guestId=${guestId}&eventId=${selectedEvent.id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        await fetchGuests(selectedEvent.id)
      } else {
        throw new Error('Failed to remove guest from event')
      }
    } catch (error) {
      console.error('Failed to remove guest from event:', error)
      alert('Failed to remove guest from event')
    }
  }

  const generateQRCodes = async (guestIds: string[]) => {
    if (!selectedEvent) return

    setSendingEmails(true)
    try {
      const response = await fetch('/api/qr/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          guestIds, 
          eventId: selectedEvent.id,
          type: 'REGULAR'
        })
      })
      
      const result = await response.json()
      
      if (response.ok) {
        const successCount = result.results?.filter((r: { success: boolean }) => r.success).length || 0
        const failureCount = result.results?.filter((r: { success: boolean }) => !r.success).length || 0
        
        let message = `Successfully generated QR codes for ${successCount} guests`
        if (failureCount > 0) {
          message += `, ${failureCount} failed`
        }
        
        alert(message)
        await fetchGuests(selectedEvent.id)
        clearSelection()
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Failed to generate QR codes:', error)
      alert('Failed to generate QR codes')
    } finally {
      setSendingEmails(false)
    }
  }

  const regenerateMissingQRCodes = async () => {
    if (!selectedEvent) return

    setSendingEmails(true)
    try {
      const guestsWithoutQRCodes = guests.filter(guest => 
        !guest.qrCodes || guest.qrCodes.length === 0
      )
      
      if (guestsWithoutQRCodes.length === 0) {
        alert('All guests already have QR codes')
        return
      }
      
      const guestIds = guestsWithoutQRCodes.map(g => g.id)
      
      const response = await fetch('/api/qr/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          guestIds, 
          eventId: selectedEvent.id,
          type: 'REGULAR'
        })
      })
      
      const result = await response.json()
      
      if (response.ok) {
        const successCount = result.results?.filter((r: { success: boolean }) => r.success).length || 0
        const failureCount = result.results?.filter((r: { success: boolean }) => !r.success).length || 0
        
        let message = `Successfully generated QR codes for ${successCount} guests`
        if (failureCount > 0) {
          message += `, ${failureCount} failed`
        }
        
        alert(message)
        await fetchGuests(selectedEvent.id)
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Failed to regenerate QR codes:', error)
      alert('Failed to regenerate QR codes')
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
              <button
                onClick={() => selectedEvent && fetchGuests(selectedEvent.id)}
                disabled={refreshing}
                className={getButtonClasses('secondary')}
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
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
          <div className="flex justify-between items-center mb-4">
            <label className={componentStyles.label}>
              Select Event
            </label>
            {selectedEvent && (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingEvent(selectedEvent)
                    setShowEditEventModal(true)
                  }}
                  className={getButtonClasses('outline')}
                >
                  <Edit className="w-4 h-4" />
                  Edit Event
                </button>
                <button
                  onClick={() => deleteEvent(selectedEvent.id)}
                  className={getButtonClasses('danger')}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Event
                </button>
              </div>
            )}
          </div>

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
            <div className={`${componentStyles.card.base} mb-8`}>
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
                    onClick={sendQRCodesToConfirmedAttendees}
                    disabled={sendingEmails}
                    className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <QrCode className="w-4 h-4" />
                    {sendingEmails ? 'Sending...' : 'Send QR Codes to Confirmed Attendees'}
                  </button>
                  <button
                    onClick={() => generateQRCodes(Array.from(selectedGuests))}
                    disabled={selectedGuests.size === 0 || sendingEmails}
                    className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <QrCode className="w-4 h-4" />
                    {sendingEmails ? 'Generating...' : `Generate QR Codes (${selectedGuests.size})`}
                  </button>
                  <button
                    onClick={regenerateMissingQRCodes}
                    disabled={sendingEmails}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <QrCode className="w-4 h-4" />
                    {sendingEmails ? 'Regenerating...' : 'Regenerate Missing QR Codes'}
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
                <h3 className="text-lg font-medium text-gray-900 ">Guest List</h3>
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
                        Invitation Sent
                      </th>
                                               <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                           Plus-One
                         </th>
                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                           QR Status
                         </th>
                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                           Actions
                         </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {guests.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-6 py-4 text-center text-gray-500">
                          No guests found for this event. Add some guests to get started.
                        </td>
                      </tr>
                    ) : (
                      guests.map((guest) => (
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
                          <div className="space-y-1">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              guest.invitations[0]?.response === 'COMING' 
                                ? 'bg-green-100 text-green-800'
                                : guest.invitations[0]?.response === 'COMING_WITH_PLUS_ONE'
                                ? 'bg-blue-100 text-blue-800'
                                : guest.invitations[0]?.response === 'NOT_COMING'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {guest.invitations[0]?.response === 'COMING' ? 'Coming' :
                               guest.invitations[0]?.response === 'COMING_WITH_PLUS_ONE' ? 'Coming +1' :
                               guest.invitations[0]?.response === 'NOT_COMING' ? 'Not Coming' :
                               'No Response'}
                            </span>
                                                 {guest.invitations[0]?.plusOneEmail && (
                       <div className="text-xs text-gray-500">
                         +1: {guest.invitations[0].plusOneEmail}
                       </div>
                     )}
                          </div>
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
                            guest.invitations[0]?.status === 'SENT' 
                              ? 'bg-green-100 text-green-800'
                              : guest.invitations[0]?.status === 'PENDING'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {guest.invitations[0]?.status === 'SENT' ? 'Sent' :
                             guest.invitations[0]?.status === 'PENDING' ? 'Pending' :
                             'Not Sent'}
                          </span>
                        </td>
                                                   <td className="px-6 py-4 whitespace-nowrap">
                             <button
                               onClick={() => togglePlusOne(guest.id, guest.invitations[0]?.hasPlusOne || false)}
                               disabled={updatingPlusOne}
                               className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                                 guest.invitations[0]?.hasPlusOne 
                                   ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                                   : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                               }`}
                             >
                                                                {guest.invitations[0]?.hasPlusOne ? 'Enabled' : 'Disabled'}
                               </button>
                             </td>
                             <td className="px-6 py-4 whitespace-nowrap">
                               <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                 guest.qrCodes && guest.qrCodes.length > 0
                                   ? 'bg-green-100 text-green-800'
                                   : 'bg-gray-100 text-gray-800'
                               }`}>
                                 {guest.qrCodes && guest.qrCodes.length > 0 ? 'Active' : 'Inactive'}
                               </span>
                             </td>
                             <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <a
                            href={`/respond/${guest.id}?eventId=${selectedEvent?.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-600 hover:text-green-900 mr-3"
                          >
                            View Response
                          </a>
                          <button 
                            onClick={() => {
                              setEditingGuest(guest)
                              setShowEditGuestModal(true)
                            }}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => deleteGuest(guest.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))
                    )}
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

      {/* Edit Event Modal */}
      {showEditEventModal && editingEvent && (
        <div className={componentStyles.modal.overlay}>
          <div className={componentStyles.modal.container}>
            <div className={componentStyles.modal.header}>
              <h2 className="text-2xl font-bold text-gray-900">Edit Event</h2>
              <button
                onClick={() => {
                  setShowEditEventModal(false)
                  setEditingEvent(null)
                }}
                className={componentStyles.modal.closeButton}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className={componentStyles.modal.content}>
              <EventForm 
                onSubmit={(data) => editEvent({ ...data, id: editingEvent.id })} 
                initialData={{
                  name: editingEvent.name,
                  date: editingEvent.date,
                  location: editingEvent.location,
                  description: editingEvent.description
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Guest Modal */}
      {showEditGuestModal && editingGuest && (
        <div className={componentStyles.modal.overlay}>
          <div className={componentStyles.modal.container}>
            <div className={componentStyles.modal.header}>
              <h2 className="text-2xl font-bold text-gray-900">Edit Guest</h2>
              <button
                onClick={() => {
                  setShowEditGuestModal(false)
                  setEditingGuest(null)
                }}
                className={componentStyles.modal.closeButton}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className={componentStyles.modal.content}>
              <GuestForm 
                onSubmit={(data) => editGuest({ ...data, id: editingGuest.id })} 
                initialData={{
                  firstName: editingGuest.firstName,
                  lastName: editingGuest.lastName,
                  email: editingGuest.email,
                  company: editingGuest.company,
                  isVip: editingGuest.isVip
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 