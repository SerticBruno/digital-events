'use client'

import { useState, useEffect } from 'react'
import { Users, Mail, QrCode, BarChart3, Plus, Send, Download, X, Upload, Scan, User, RefreshCw, Edit, Trash2, Calendar, MapPin, Eye } from 'lucide-react'
import EventForm from '@/components/EventForm'
import GuestForm from '@/components/GuestForm'
import CSVUpload from '@/components/CSVUpload'
import AddExistingGuest from '@/components/AddExistingGuest'
import DataTable, { columnRenderers } from '@/components/DataTable'
import { getButtonClasses, componentStyles } from '@/lib/design-system'

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
  isPlusOne: boolean
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
    status: string
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

  const [refreshing, setRefreshing] = useState(false)
  const [showEditEventModal, setShowEditEventModal] = useState(false)
  const [showEditGuestModal, setShowEditGuestModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null)

  // Animation states for modals
  const [eventModalVisible, setEventModalVisible] = useState(false)
  const [guestModalVisible, setGuestModalVisible] = useState(false)
  const [csvModalVisible, setCsvModalVisible] = useState(false)
  const [editEventModalVisible, setEditEventModalVisible] = useState(false)
  const [editGuestModalVisible, setEditGuestModalVisible] = useState(false)

  // Table columns configuration
  const guestColumns = [
    {
      key: 'guest',
      label: 'Guest',
      sortable: true,
      render: columnRenderers.guest
    },
    {
      key: 'saveTheDateStatus',
      label: 'Save the Date',
      sortable: true,
      render: (value: unknown, row: Guest) => {
        const saveTheDateInvitation = row.invitations?.find(inv => inv.type === 'SAVETHEDATE')
        return columnRenderers.saveTheDateStatus(saveTheDateInvitation)
      }
    },
    {
      key: 'response',
      label: 'Status',
      sortable: true,
      render: (value: unknown, row: Guest) => columnRenderers.status(row.invitations?.[0]?.response)
    },
    {
      key: 'isVip',
      label: 'Type',
      sortable: true,
      render: columnRenderers.vip
    },
    {
      key: 'invitationStatus',
      label: 'Invitation Sent',
      sortable: true,
      render: (value: unknown, row: Guest) => {
        const invitationInvitation = row.invitations?.find(inv => inv.type === 'INVITATION')
        return columnRenderers.status(invitationInvitation?.status)
      }
    },
    {
      key: 'plusOne',
      label: 'Plus-One',
      sortable: true,
      render: columnRenderers.plusOne
    },
    {
      key: 'qrStatus',
      label: 'QR Status',
      sortable: true,
      render: columnRenderers.qrStatus
    },
    {
      key: 'actions',
      label: 'Actions',
      width: 'w-48',
      render: (value: unknown, row: Guest) => (
        <div className="flex items-center space-x-2">
          <a
            href={`/respond/${row.id}?eventId=${selectedEvent?.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 text-gray-400 hover:text-green-600 transition-colors"
            title="View Response"
          >
            <Eye className="w-4 h-4" />
          </a>
          <button 
            onClick={() => {
              setEditingGuest(row)
              setShowEditGuestModal(true)
            }}
            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button 
            onClick={() => deleteGuest(row.id)}
            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
            title="Remove"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ]

  useEffect(() => {
    fetchEvents()
  }, [])

  useEffect(() => {
    if (selectedEvent) {
      fetchGuests(selectedEvent.id)
    }
  }, [selectedEvent])

  // Animation triggers for modals
  useEffect(() => {
    if (showEventModal) {
      const timer = setTimeout(() => setEventModalVisible(true), 10)
      return () => clearTimeout(timer)
    } else {
      setEventModalVisible(false)
    }
  }, [showEventModal])

  useEffect(() => {
    if (showGuestModal) {
      const timer = setTimeout(() => setGuestModalVisible(true), 10)
      return () => clearTimeout(timer)
    } else {
      setGuestModalVisible(false)
    }
  }, [showGuestModal])

  useEffect(() => {
    if (showCSVModal) {
      const timer = setTimeout(() => setCsvModalVisible(true), 10)
      return () => clearTimeout(timer)
    } else {
      setCsvModalVisible(false)
    }
  }, [showCSVModal])

  useEffect(() => {
    if (showEditEventModal) {
      const timer = setTimeout(() => setEditEventModalVisible(true), 10)
      return () => clearTimeout(timer)
    } else {
      setEditEventModalVisible(false)
    }
  }, [showEditEventModal])

  useEffect(() => {
    if (showEditGuestModal) {
      const timer = setTimeout(() => setEditGuestModalVisible(true), 10)
      return () => clearTimeout(timer)
    } else {
      setEditGuestModalVisible(false)
    }
  }, [showEditGuestModal])

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
        const result = await response.json()
        console.log('Bulk upload result:', result)
        
        // Show success message with details
        const successCount = result.results?.length || 0
        const errorCount = result.errors?.length || 0
        
        let message = `Successfully imported ${successCount} guests`
        if (errorCount > 0) {
          message += `, ${errorCount} failed`
        }
        
        alert(message)
        await fetchGuests(selectedEvent.id)
        setShowCSVModal(false)
      } else {
        // Try to get error details from response
        let errorMessage = 'Failed to bulk upload guests'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          // If we can't parse JSON, use the status text
          errorMessage = `${errorMessage}: ${response.statusText}`
        }
        throw new Error(errorMessage)
      }
    } catch (error) {
      console.error('Failed to bulk upload guests:', error)
      alert(error instanceof Error ? error.message : 'Failed to bulk upload guests')
    }
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

  const deleteSelectedGuests = async () => {
    if (!selectedEvent) return

    if (selectedGuests.size === 0) {
      alert('Please select guests to delete')
      return
    }

    const selectedGuestNames = Array.from(selectedGuests).map(id => {
      const guest = guests.find(g => g.id === id)
      return guest ? `${guest.firstName} ${guest.lastName}` : 'Unknown'
    })

    if (!confirm(`Are you sure you want to permanently delete ${selectedGuests.size} guest(s)? This action cannot be undone and will remove them from all events.\n\nGuests to delete:\n${selectedGuestNames.join('\n')}`)) {
      return
    }

    setSendingEmails(true)
    try {
      const deletePromises = Array.from(selectedGuests).map(async guestId => {
        const response = await fetch(`/api/guests/global?guestId=${guestId}`, {
          method: 'DELETE'
        })
        return { response, guestId }
      })

      const results = await Promise.all(deletePromises)
      const successResults = results.filter(r => r.response.ok)
      const failureCount = results.length - successResults.length

      let message = `Successfully deleted ${successResults.length} guest(s)`
      if (failureCount > 0) {
        message += `, ${failureCount} failed`
      }

      // Check for deleted plus-ones
      let totalPlusOnesDeleted = 0
      for (const result of successResults) {
        try {
          const data = await result.response.json()
          if (data.deletedPlusOnes && data.deletedPlusOnes.length > 0) {
            totalPlusOnesDeleted += data.deletedPlusOnes.length
          }
        } catch {
          // Ignore JSON parsing errors
        }
      }

      if (totalPlusOnesDeleted > 0) {
        message += `\n\nAlso deleted ${totalPlusOnesDeleted} plus-one guest(s) associated with the deleted guests.`
      }

      alert(message)
      clearSelection()
      await fetchGuests(selectedEvent.id)
    } catch (error) {
      console.error('Failed to delete guests:', error)
      alert('Failed to delete guests')
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


      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Event Selection & Management */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Event Dashboard</h2>
              {selectedEvent ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-semibold text-gray-800">{selectedEvent.name}</h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Active Event
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                    {selectedEvent.date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(selectedEvent.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                    )}
                    {selectedEvent.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {selectedEvent.location}
                      </div>
                    )}
                  </div>
                  {selectedEvent.description && (
                    <p className="text-sm text-gray-600 max-w-2xl">
                      {selectedEvent.description}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-gray-600">Select an event to get started</p>
              )}
            </div>
            <div className="flex gap-2 ml-4">
              <a
                href="/scanner"
                className={getButtonClasses('warning')}
              >
                <Scan className="w-4 h-4" />
                <span className="hidden sm:inline">QR Scanner</span>
              </a>
              <button 
                onClick={() => setShowEventModal(true)}
                className={getButtonClasses('primary')}
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Event</span>
              </button>
              {selectedEvent && (
                <>
                  <button
                    onClick={() => {
                      setEditingEvent(selectedEvent)
                      setShowEditEventModal(true)
                    }}
                    className={getButtonClasses('outline')}
                  >
                    <Edit className="w-4 h-4" />
                    <span className="hidden sm:inline">Edit Event</span>
                  </button>
                  <button
                    onClick={() => deleteEvent(selectedEvent.id)}
                    className={getButtonClasses('danger')}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Delete Event</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Event Selector */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-4 border-b border-gray-200">
              <label className="text-sm font-medium text-gray-700">
                Select Event to Manage
              </label>
            </div>
            <div className="p-4">
              {events.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-6 h-6 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Events Created</h3>
                  <p className="text-gray-600 mb-4">Create your first event to get started with guest management.</p>
                  <button
                    onClick={() => setShowEventModal(true)}
                    className={`${getButtonClasses('primary')} mx-auto`}
                  >
                    <Plus className="w-4 h-4" />
                    Create First Event
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {events.map((event) => (
                    <div
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                        selectedEvent?.id === event.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-gray-900">{event.name}</h4>
                            {selectedEvent?.id === event.id && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Selected
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(event.date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </div>
                            {event.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {event.location}
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {event._count.guests} guests
                            </div>
                          </div>
                          {event.description && (
                            <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                              {event.description}
                            </p>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center">
                            {selectedEvent?.id === event.id && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {selectedEvent && (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className={`${componentStyles.card.base} hover:shadow-lg transition-shadow`}>
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

              <div className={`${componentStyles.card.base} hover:shadow-lg transition-shadow`}>
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

              <div className={`${componentStyles.card.base} hover:shadow-lg transition-shadow`}>
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

              <div className={`${componentStyles.card.base} hover:shadow-lg transition-shadow`}>
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

            {/* Workflow-Based Action Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Guest Management Card */}
              <div className={`${componentStyles.card.base} hover:shadow-lg transition-shadow`}>
                <div className={componentStyles.card.header}>
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <Users className="w-5 h-5 mr-2" />
                    Guest Management
                  </h3>
                </div>
                <div className={componentStyles.card.content}>
                  <div className="space-y-3">
                    <button
                      onClick={() => setShowGuestModal(true)}
                      className={`${getButtonClasses('success')} w-full`}
                    >
                      <Plus className="w-4 h-4" />
                      Add Individual Guest
                    </button>
                    <button
                      onClick={() => setShowCSVModal(true)}
                      className={`${getButtonClasses('warning')} w-full`}
                    >
                      <Upload className="w-4 h-4" />
                      Bulk Import (CSV)
                    </button>
                    <button
                      onClick={() => setShowExistingGuestModal(true)}
                      className={`${getButtonClasses('outline')} w-full`}
                    >
                      <User className="w-4 h-4" />
                      Add Existing Guest
                    </button>
                  </div>
                </div>
              </div>

              {/* Communication Card */}
              <div className={`${componentStyles.card.base} hover:shadow-lg transition-shadow`}>
                <div className={componentStyles.card.header}>
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <Send className="w-5 h-5 mr-2" />
                    Communication
                  </h3>
                </div>
                <div className={componentStyles.card.content}>
                  <div className="space-y-3">
                    <button
                      onClick={() => sendEmails('save_the_date', Array.from(selectedGuests))}
                      disabled={selectedGuests.size === 0 || sendingEmails}
                      className={`${getButtonClasses('primary')} w-full`}
                    >
                      <Send className="w-4 h-4" />
                      Send Save the Date
                    </button>
                    <button
                      onClick={() => sendEmails('invitation', Array.from(selectedGuests))}
                      disabled={selectedGuests.size === 0 || sendingEmails}
                      className={`${getButtonClasses('success')} w-full`}
                    >
                      <Send className="w-4 h-4" />
                      Send Invitations
                    </button>
                    <button
                      onClick={() => sendPlusOneInvitations(Array.from(selectedGuests))}
                      disabled={selectedGuests.size === 0 || sendingEmails}
                      className={`${getButtonClasses('indigo')} w-full`}
                    >
                      <Send className="w-4 h-4" />
                      Plus-One Invitations
                    </button>
                    <button
                      onClick={testEmail}
                      className={`${getButtonClasses('purple')} w-full`}
                    >
                      <Send className="w-4 h-4" />
                      Test Email
                    </button>
                  </div>
                </div>
              </div>

              {/* QR & Check-in Card */}
              <div className={`${componentStyles.card.base} hover:shadow-lg transition-shadow`}>
                <div className={componentStyles.card.header}>
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <QrCode className="w-5 h-5 mr-2" />
                    QR & Check-in
                  </h3>
                </div>
                <div className={componentStyles.card.content}>
                  <div className="space-y-3">
                    <button
                      onClick={() => generateQRCodes(Array.from(selectedGuests))}
                      disabled={selectedGuests.size === 0 || sendingEmails}
                      className={`${getButtonClasses('teal')} w-full`}
                    >
                      <QrCode className="w-4 h-4" />
                      Generate QR Codes
                    </button>
                    <button
                      onClick={() => sendEmails('qr_code', Array.from(selectedGuests))}
                      disabled={selectedGuests.size === 0 || sendingEmails}
                      className={`${getButtonClasses('warning')} w-full`}
                    >
                      <QrCode className="w-4 h-4" />
                      Send QR Codes
                    </button>
                    <button
                      onClick={sendQRCodesToConfirmedAttendees}
                      disabled={sendingEmails}
                      className={`${getButtonClasses('pink')} w-full`}
                    >
                      <QrCode className="w-4 h-4" />
                      QR to Confirmed
                    </button>
                    <a
                      href="/scanner"
                      className={`${getButtonClasses('orange')} w-full`}
                    >
                      <Scan className="w-4 h-4" />
                      QR Scanner
                    </a>
                  </div>
                </div>
              </div>
            </div>



            {/* Guest List Table */}
            <div className={componentStyles.card.base}>
              <div className={componentStyles.card.header}>
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Guest List</h3>
                  <div className="flex items-center gap-4">
                    {/* Guest Selection Info */}
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600">Total: {guests.length}</span>
                      <span className="text-gray-400">•</span>
                      <span className={`font-medium ${selectedGuests.size > 0 ? 'text-blue-600' : 'text-gray-600'}`}>
                        Selected: {selectedGuests.size}
                      </span>
                    </div>
                    
                    {/* Selection Controls */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={selectAllGuests}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Select All
                      </button>
                      <button
                        onClick={clearSelection}
                        className="text-sm text-gray-600 hover:text-gray-800 font-medium"
                      >
                        Clear
                      </button>
                    </div>
                    
                    {/* Bulk Actions */}
                    <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-300">
                      <button
                        onClick={regenerateMissingQRCodes}
                        disabled={selectedGuests.size === 0 || sendingEmails}
                        className={`${getButtonClasses('orange')} text-xs`}
                      >
                        <QrCode className="w-3 h-3" />
                        Regenerate QR
                      </button>
                      <button 
                        disabled={selectedGuests.size === 0}
                        className={`${getButtonClasses('secondary')} text-xs`}
                      >
                        <Download className="w-3 h-3" />
                        Export
                      </button>
                      <button
                        onClick={deleteSelectedGuests}
                        disabled={selectedGuests.size === 0 || sendingEmails}
                        className={`${getButtonClasses('danger')} text-xs`}
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <DataTable
                data={guests}
                columns={guestColumns}
                onRowSelect={setSelectedGuests}
                selectable={true}
                searchable={true}
                pagination={true}
                itemsPerPage={15}
                loading={loading}
                emptyMessage="No guests found for this event. Add some guests to get started."
              />
            </div>
          </>
        )}
      </div>

      {/* Event Modal */}
      {showEventModal && (
        <div className={componentStyles.modal.overlay} data-state={eventModalVisible ? "open" : undefined}>
          <div className={componentStyles.modal.container} data-state={eventModalVisible ? "open" : undefined}>
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
        <div className={componentStyles.modal.overlay} data-state={guestModalVisible ? "open" : undefined}>
          <div className={componentStyles.modal.container} data-state={guestModalVisible ? "open" : undefined}>
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
        <div className={componentStyles.modal.overlay} data-state={csvModalVisible ? "open" : undefined}>
          <div className={`${componentStyles.modal.container} max-w-4xl`} data-state={csvModalVisible ? "open" : undefined}>
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
        <div className={componentStyles.modal.overlay} data-state={editEventModalVisible ? "open" : undefined}>
          <div className={componentStyles.modal.container} data-state={editEventModalVisible ? "open" : undefined}>
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
        <div className={componentStyles.modal.overlay} data-state={editGuestModalVisible ? "open" : undefined}>
          <div className={componentStyles.modal.container} data-state={editGuestModalVisible ? "open" : undefined}>
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