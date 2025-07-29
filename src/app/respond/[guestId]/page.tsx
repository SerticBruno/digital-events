'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { CheckCircle, XCircle, UserPlus, Calendar, MapPin, Mail, Users, ArrowLeft, Gift } from 'lucide-react'
import { getButtonClasses, componentStyles } from '@/lib/design-system'

interface Guest {
  id: string
  firstName: string
  lastName: string
  email: string
  company?: string
  isVip: boolean
}

interface Event {
  id: string
  name: string
  description?: string
  date: string
  location?: string
}

export default function RespondPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const guestId = params.guestId as string
  const eventId = searchParams.get('eventId')

  const response = searchParams.get('response')

  const [guest, setGuest] = useState<Guest | null>(null)
  const [event, setEvent] = useState<Event | null>(null)

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [plusOneEmail, setPlusOneEmail] = useState('')
  const [plusOneName, setPlusOneName] = useState('')
  const [showPlusOneForm, setShowPlusOneForm] = useState(false)
  const [selectedResponse, setSelectedResponse] = useState<string | null>(null)

  useEffect(() => {
    if (guestId) {
      fetchGuestData()
    }
  }, [guestId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (response && guest && event && !submitted) {
      if (response === 'coming_with_plus_one') {
        setSelectedResponse('coming_with_plus_one')
        setShowPlusOneForm(true)
      } else {
        handleResponse(response)
      }
    }
  }, [response, guest, event, submitted]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchGuestData = useCallback(async () => {
    try {
      // If we have eventId from URL, use it to get event-specific data
      const url = eventId 
        ? `/api/guests/${guestId}?eventId=${eventId}`
        : `/api/guests/${guestId}`
      
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Guest not found')
      }
      const data = await response.json()
      setGuest(data.guest)
      setEvent(data.event)
    } catch (error) {
      console.error('Failed to fetch guest data:', error)
      setError('Guest not found or invitation has expired')
    } finally {
      setLoading(false)
    }
  }, [guestId, eventId])

  const handleResponse = useCallback(async (responseType: string) => {
    if (!guest || !event) return

    setSubmitting(true)
    try {
      const responseData = {
        guestId,
        eventId: event.id,
        response: responseType.toUpperCase(),
        plusOneEmail: responseType === 'coming_with_plus_one' ? plusOneEmail : undefined
      }

      const response = await fetch('/api/guests/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(responseData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Response API error:', errorData)
        throw new Error('Failed to submit response')
      }

      await response.json()
      setSubmitted(true)
    } catch (error) {
      console.error('Failed to submit response:', error)
      setError('Failed to submit your response. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }, [guest, event, guestId, plusOneEmail])

  const handlePlusOneResponse = () => {
    if (!plusOneEmail.trim()) {
      setError('Please enter your guest\'s email')
      return
    }
    if (!plusOneName.trim()) {
      setError('Please enter your guest\'s name')
      return
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(plusOneEmail)) {
      setError('Please enter a valid email address')
      return
    }
    handleResponse('coming_with_plus_one')
  }

  const handleResponseSelection = (responseType: string) => {
    setSelectedResponse(responseType)
    setError(null)
    
    if (responseType === 'coming_with_plus_one') {
      setShowPlusOneForm(true)
    } else {
      setShowPlusOneForm(false)
      handleResponse(responseType)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invitation...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Response Submitted!</h1>
          <p className="text-gray-600 mb-4">
            Thank you for your response. We look forward to seeing you at the event!
          </p>
          <div className={`${componentStyles.card.base} p-6 max-w-md mx-auto`}>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">{event?.name}</h2>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                {event?.date && new Date(event.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
              {event?.location && (
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  {event.location}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!guest || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invitation Not Found</h1>
          <p className="text-gray-600">This invitation may have expired or is invalid.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Gift className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">You're Invited!</h1>
          <p className="text-gray-600 text-lg">Please respond to your invitation</p>
        </div>

        {/* Main Card */}
        <div className={`${componentStyles.card.base} shadow-xl`}>
          <div className="p-8">
            {/* Event Details */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">{event.name}</h2>
              {event.description && (
                <p className="text-gray-600 mb-6">{event.description}</p>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="flex items-center justify-center p-4 bg-blue-50 rounded-lg">
                  <Calendar className="w-5 h-5 text-blue-600 mr-3" />
                  <div className="text-left">
                    <p className="text-sm text-gray-500">Date</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(event.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
                
                {event.location && (
                  <div className="flex items-center justify-center p-4 bg-blue-50 rounded-lg">
                    <MapPin className="w-5 h-5 text-blue-600 mr-3" />
                    <div className="text-left">
                      <p className="text-sm text-gray-500">Location</p>
                      <p className="font-semibold text-gray-900">{event.location}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Guest Info */}
            <div className="text-center mb-8 p-6 bg-gray-50 rounded-lg">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 text-xl mb-2">
                {guest.firstName} {guest.lastName}
              </h3>
              {guest.company && (
                <p className="text-gray-600 mb-2">{guest.company}</p>
              )}
              {guest.isVip && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                  <Gift className="w-4 h-4 mr-1" />
                  VIP Guest
                </span>
              )}
            </div>

            {/* Response Section */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-900 text-center">
                Will you be attending?
              </h3>

              {!showPlusOneForm ? (
                <div className="space-y-4">
                  <button
                    onClick={() => handleResponseSelection('coming')}
                    disabled={submitting}
                    className={`w-full p-4 rounded-lg border-2 transition-all duration-200 ${
                      selectedResponse === 'coming'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 bg-white hover:border-green-300 hover:bg-green-50'
                    } ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 mr-3" />
                      <span className="text-lg font-medium">Yes, I'm Coming</span>
                    </div>
                  </button>

                  <button
                    onClick={() => handleResponseSelection('coming_with_plus_one')}
                    disabled={submitting}
                    className={`w-full p-4 rounded-lg border-2 transition-all duration-200 ${
                      selectedResponse === 'coming_with_plus_one'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                    } ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center justify-center">
                      <UserPlus className="w-6 h-6 mr-3" />
                      <span className="text-lg font-medium">Yes, I'm Coming with a Guest</span>
                    </div>
                  </button>

                  <button
                    onClick={() => handleResponseSelection('not_coming')}
                    disabled={submitting}
                    className={`w-full p-4 rounded-lg border-2 transition-all duration-200 ${
                      selectedResponse === 'not_coming'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-200 bg-white hover:border-red-300 hover:bg-red-50'
                    } ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center justify-center">
                      <XCircle className="w-6 h-6 mr-3" />
                      <span className="text-lg font-medium">No, I Can't Come</span>
                    </div>
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Guest Information</h4>
                    <p className="text-sm text-blue-700">Please provide your guest's details so we can send them an invitation.</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Guest's Name *
                      </label>
                      <input
                        type="text"
                        value={plusOneName}
                        onChange={(e) => setPlusOneName(e.target.value)}
                        placeholder="Enter your guest's full name"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Guest's Email *
                      </label>
                      <input
                        type="email"
                        value={plusOneEmail}
                        onChange={(e) => setPlusOneEmail(e.target.value)}
                        placeholder="Enter your guest's email address"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                      />
                    </div>
                  </div>

                  <div className="flex space-x-4">
                    <button
                      onClick={() => {
                        setShowPlusOneForm(false)
                        setSelectedResponse(null)
                        setPlusOneEmail('')
                        setPlusOneName('')
                        setError(null)
                      }}
                      className={`${getButtonClasses('outline')} flex-1 py-3`}
                    >
                      <ArrowLeft className="w-5 h-5 mr-2" />
                      Back
                    </button>
                    <button
                      onClick={handlePlusOneResponse}
                      disabled={submitting || !plusOneEmail.trim() || !plusOneName.trim()}
                      className={`${getButtonClasses('primary')} flex-1 py-3`}
                    >
                      {submitting ? 'Submitting...' : 'Confirm with Guest'}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {submitting && (
                <div className="text-center py-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-600">Submitting your response...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 