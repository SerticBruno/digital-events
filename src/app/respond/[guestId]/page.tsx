'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { CheckCircle, XCircle, UserPlus, Calendar, MapPin, Mail, Users } from 'lucide-react'
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
  const [showPlusOneForm, setShowPlusOneForm] = useState(false)

  useEffect(() => {
    if (guestId) {
      fetchGuestData()
    }
  }, [guestId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (response && guest && event && !submitted) {
      if (response === 'coming_with_plus_one') {
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
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(plusOneEmail)) {
      setError('Please enter a valid email address')
      return
    }
    handleResponse('coming_with_plus_one')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invitation...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invitation Not Found</h1>
          <p className="text-gray-600">This invitation may have expired or is invalid.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">You're Invited!</h1>
          <p className="text-gray-600">Please respond to your invitation</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Event Details Card */}
          <div className={`${componentStyles.card.base} lg:col-span-2`}>
            <div className={componentStyles.card.header}>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Event Details
              </h2>
            </div>
            <div className={componentStyles.card.content}>
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{event.name}</h3>
                {event.description && (
                  <p className="text-gray-600 mb-6">{event.description}</p>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                  <Calendar className="w-5 h-5 text-blue-600 mr-3" />
                  <div>
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
                  <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                    <MapPin className="w-5 h-5 text-blue-600 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500">Location</p>
                      <p className="font-semibold text-gray-900">{event.location}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Guest Info & Response Card */}
          <div className="space-y-6">
            {/* Guest Info Card */}
            <div className={`${componentStyles.card.base}`}>
              <div className={componentStyles.card.header}>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Invited Guest
                </h3>
              </div>
              <div className={componentStyles.card.content}>
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-8 h-8 text-blue-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 text-lg">
                    {guest.firstName} {guest.lastName}
                  </h4>
                  {guest.company && (
                    <p className="text-sm text-gray-600 mt-1">{guest.company}</p>
                  )}
                  {guest.isVip && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 mt-2">
                      VIP Guest
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Response Options Card */}
            <div className={`${componentStyles.card.base}`}>
              <div className={componentStyles.card.header}>
                <h3 className="text-lg font-semibold text-gray-900">
                  Will you be attending?
                </h3>
              </div>
              <div className={componentStyles.card.content}>
                {!showPlusOneForm ? (
                  <div className="space-y-3">
                    <button
                      onClick={() => handleResponse('coming')}
                      disabled={submitting}
                      className={`${getButtonClasses('success')} w-full py-3`}
                    >
                      <CheckCircle className="w-5 h-5" />
                      Yes, I'm Coming
                    </button>

                    <button
                      onClick={() => setShowPlusOneForm(true)}
                      disabled={submitting}
                      className={`${getButtonClasses('primary')} w-full py-3`}
                    >
                      <UserPlus className="w-5 h-5" />
                      Yes, I'm Coming with a Guest
                    </button>

                    <button
                      onClick={() => handleResponse('not_coming')}
                      disabled={submitting}
                      className={`${getButtonClasses('danger')} w-full py-3`}
                    >
                      <XCircle className="w-5 h-5" />
                      No, I Can't Come
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Guest's Email
                      </label>
                      <input
                        type="email"
                        value={plusOneEmail}
                        onChange={(e) => setPlusOneEmail(e.target.value)}
                        placeholder="Enter your guest's email address"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div className="flex space-x-3">
                      <button
                        onClick={() => setShowPlusOneForm(false)}
                        className={`${getButtonClasses('outline')} flex-1`}
                      >
                        Back
                      </button>
                      <button
                        onClick={handlePlusOneResponse}
                        disabled={submitting || !plusOneEmail.trim()}
                        className={`${getButtonClasses('primary')} flex-1`}
                      >
                        {submitting ? 'Submitting...' : 'Confirm with Guest'}
                      </button>
                    </div>
                  </div>
                )}

                {submitting && (
                  <div className="text-center mt-6">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-600">Submitting your response...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 