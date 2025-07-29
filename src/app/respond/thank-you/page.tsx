'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { CheckCircle, XCircle, UserPlus, Calendar, MapPin, Gift } from 'lucide-react'
import { componentStyles } from '@/lib/design-system'

interface Event {
  id: string
  name: string
  description?: string
  date: string
  location?: string
}

export default function ThankYouPage() {
  const searchParams = useSearchParams()
  const response = searchParams.get('response')
  const eventName = searchParams.get('eventName')
  const eventDate = searchParams.get('eventDate')
  const eventLocation = searchParams.get('eventLocation')
  const guestName = searchParams.get('guestName')
  const plusOneEmail = searchParams.get('plusOneEmail')
  const guestId = searchParams.get('guestId')
  const eventId = searchParams.get('eventId')

  // Record the response if we have guestId and eventId
  useEffect(() => {
    if (guestId && eventId && response && (response === 'coming' || response === 'not_coming')) {
      const recordResponse = async () => {
        try {
          await fetch('/api/guests/direct-respond', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              guestId,
              eventId,
              response: response.toUpperCase()
            })
          })
        } catch (error) {
          console.error('Failed to record response:', error)
        }
      }
      
      recordResponse()
    }
  }, [guestId, eventId, response])

  const getResponseContent = () => {
    switch (response) {
      case 'coming':
        return {
          icon: CheckCircle,
          title: 'Thank you for confirming!',
          message: 'We look forward to seeing you at the event!',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          iconColor: 'text-green-500'
        }
      case 'coming_with_plus_one':
        return {
          icon: UserPlus,
          title: 'Thank you for confirming with a guest!',
          message: `We've sent an invitation to ${plusOneEmail}. We look forward to seeing both of you!`,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          iconColor: 'text-blue-500'
        }
      case 'not_coming':
        return {
          icon: XCircle,
          title: 'Thank you for letting us know',
          message: 'We\'re sorry you can\'t make it, but we appreciate you taking the time to respond.',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          iconColor: 'text-gray-500'
        }
      default:
        return {
          icon: CheckCircle,
          title: 'Thank you for your response!',
          message: 'We appreciate you taking the time to respond to our invitation.',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          iconColor: 'text-blue-500'
        }
    }
  }

  const content = getResponseContent()
  const IconComponent = content.icon

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className={`w-20 h-20 ${content.bgColor} rounded-full flex items-center justify-center mx-auto mb-4`}>
            <IconComponent className={`w-10 h-10 ${content.iconColor}`} />
          </div>
          <h1 className={`text-4xl font-bold ${content.color} mb-2`}>
            {content.title}
          </h1>
          <p className="text-gray-600 text-lg">
            {content.message}
          </p>
        </div>

        {/* Event Details Card */}
        {eventName && (
          <div className={`${componentStyles.card.base} shadow-xl mb-8`}>
            <div className="p-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">
                {eventName}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                {eventDate && (
                  <div className="flex items-center justify-center p-4 bg-blue-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-blue-600 mr-3" />
                    <div className="text-left">
                      <p className="text-sm text-gray-500">Date</p>
                      <p className="font-semibold text-gray-900">
                        {new Date(eventDate).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                )}
                
                {eventLocation && (
                  <div className="flex items-center justify-center p-4 bg-blue-50 rounded-lg">
                    <MapPin className="w-5 h-5 text-blue-600 mr-3" />
                    <div className="text-left">
                      <p className="text-sm text-gray-500">Location</p>
                      <p className="font-semibold text-gray-900">{eventLocation}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Guest Info */}
              {guestName && (
                <div className="text-center mt-6 p-6 bg-gray-50 rounded-lg">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Gift className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-xl mb-2">
                    {guestName}
                  </h3>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Additional Information */}
        <div className={`${componentStyles.card.base} shadow-lg`}>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
              What's Next?
            </h3>
            
            {response === 'coming' && (
              <div className="space-y-3 text-gray-600">
                <p>• You'll receive a QR code entry pass closer to the event date</p>
                <p>• Please arrive 15 minutes before the event starts</p>
                <p>• Don't forget to bring your QR code with you</p>
              </div>
            )}
            
            {response === 'coming_with_plus_one' && (
              <div className="space-y-3 text-gray-600">
                <p>• We've sent an invitation to your guest at {plusOneEmail}</p>
                <p>• Both you and your guest will receive QR codes closer to the event</p>
                <p>• Please arrive 15 minutes before the event starts</p>
              </div>
            )}
            
            {response === 'not_coming' && (
              <div className="space-y-3 text-gray-600">
                <p>• We've noted your response in our records</p>
                <p>• We hope to see you at future events</p>
                <p>• Feel free to reach out if your plans change</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            Best regards,<br />
            <strong className="text-gray-700">Event Team</strong>
          </p>
        </div>
      </div>
    </div>
  )
} 