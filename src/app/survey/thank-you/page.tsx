'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function SurveyThankYouContent() {
  const searchParams = useSearchParams()
  const [isCompleted, setIsCompleted] = useState(false)

  useEffect(() => {
    const completed = searchParams.get('completed')
    setIsCompleted(completed === 'true')
  }, [searchParams])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {isCompleted ? 'Thank You!' : 'Survey Link'}
          </h1>
          <p className="text-gray-600">
            {isCompleted 
              ? 'Your feedback has been recorded. We appreciate your input!'
              : 'You have already completed this survey. Thank you for your feedback!'
            }
          </p>
        </div>
        
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            Your feedback helps us improve future events and create better experiences for all our guests.
          </p>
        </div>

        <div className="text-sm text-gray-500">
          <p>You can now close this window.</p>
        </div>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Loading...</h1>
          <p className="text-gray-600">Please wait while we load your survey information.</p>
        </div>
      </div>
    </div>
  )
}

export default function SurveyThankYou() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SurveyThankYouContent />
    </Suspense>
  )
} 