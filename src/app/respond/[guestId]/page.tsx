'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { CheckCircle, XCircle, UserPlus, Calendar, MapPin, RefreshCw } from 'lucide-react'
import { InvitationData } from '@/lib/types'

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
  const [invitation, setInvitation] = useState<InvitationData | null>(null)

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
      setInvitation(data.invitation)
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

      console.log('Submitting response:', responseData)

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

      const result = await response.json()
      console.log('Response submitted successfully:', result)

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
        setError('Please enter your guest&apos;s email')
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
          <div className="bg-white rounded-lg p-6 shadow-sm max-w-md mx-auto">
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
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-8 text-center">
            <h1 className="text-3xl font-bold text-white mb-2">You&apos;re Invited!</h1>
            <p className="text-blue-100">Please respond to your invitation</p>
          </div>

          {/* Event Details */}
          <div className="p-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{event.name}</h2>
              {event.description && (
                <p className="text-gray-600 mb-6">{event.description}</p>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg">
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
                  <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg">
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
            <div className="bg-blue-50 rounded-lg p-4 mb-8">
              <p className="text-sm text-blue-600 mb-1">Invited Guest</p>
              <p className="font-semibold text-gray-900">
                {guest.firstName} {guest.lastName}
              </p>
              {guest.company && (
                <p className="text-sm text-gray-600">{guest.company}</p>
              )}
            </div>

            {/* Debug Info */}
            {invitation && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-semibold text-yellow-800 mb-2">Debug Info:</h4>
                    <div className="text-xs text-yellow-700 space-y-1">
                      <div>Status: {invitation.status}</div>
                      <div>Response: {invitation.response || 'None'}</div>
                      <div>Responded At: {invitation.respondedAt ? new Date(invitation.respondedAt).toLocaleString() : 'Not responded'}</div>
                    </div>
                  </div>
                  <button
                    onClick={fetchGuestData}
                    className="text-yellow-700 hover:text-yellow-900"
                    title="Refresh data"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Response Options */}
            {!showPlusOneForm ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 text-center mb-6">
                  Will you be attending?
                </h3>
                
                <button
                  onClick={() => handleResponse('coming')}
                  disabled={submitting}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-4 px-6 rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  <CheckCircle className="w-5 h-5 inline mr-2" />
                  Yes, I&apos;m Coming
                </button>

                <button
                  onClick={() => setShowPlusOneForm(true)}
                  disabled={submitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 px-6 rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  <UserPlus className="w-5 h-5 inline mr-2" />
                  Yes, I&apos;m Coming with a Guest
                </button>

                <button
                  onClick={() => handleResponse('not_coming')}
                  disabled={submitting}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-4 px-6 rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  <XCircle className="w-5 h-5 inline mr-2" />
                  No, I Can&apos;t Come
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 text-center mb-6">
                  Please provide your guest&apos;s email
                </h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Guest&apos;s Email
                  </label>
                  <input
                    type="email"
                    value={plusOneEmail}
                    onChange={(e) => setPlusOneEmail(e.target.value)}
                    placeholder="Enter your guest&apos;s email address"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowPlusOneForm(false)}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-3 px-4 rounded-lg font-semibold transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handlePlusOneResponse}
                    disabled={submitting || !plusOneEmail.trim()}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-semibold transition-colors disabled:opacity-50"
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
  )
} 