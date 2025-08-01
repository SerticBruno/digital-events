'use client'

import { useState } from 'react'

export default function TestSurvey() {
  const [guestId, setGuestId] = useState('')
  const [eventId, setEventId] = useState('')
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)

  const testSurveyCompletion = async () => {
    if (!guestId || !eventId) {
      alert('Please enter both Guest ID and Event ID')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch(`/api/surveys/complete/${guestId}?eventId=${eventId}`)
      const data = await response.json()
      
      setResult({
        status: response.status,
        statusText: response.statusText,
        data: data
      })
    } catch (error) {
      setResult({
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  const testSurveyDebug = async () => {
    if (!eventId) {
      alert('Please enter Event ID')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/surveys/debug', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          eventId,
          guestId: guestId || undefined
        })
      })
      const data = await response.json()
      
      setResult({
        status: response.status,
        statusText: response.statusText,
        data: data
      })
    } catch (error) {
      setResult({
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  const testSurveySend = async () => {
    if (!guestId || !eventId) {
      alert('Please enter both Guest ID and Event ID')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/surveys/test-send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          guestId,
          eventId
        })
      })
      const data = await response.json()
      
      setResult({
        status: response.status,
        statusText: response.statusText,
        data: data
      })
    } catch (error) {
      setResult({
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  const testEventLookup = async () => {
    if (!guestId || !eventId) {
      alert('Please enter both Guest ID and Event ID')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/debug/test-event-lookup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          guestId,
          eventId
        })
      })
      const data = await response.json()
      
      setResult({
        status: response.status,
        statusText: response.statusText,
        data: data
      })
    } catch (error) {
      setResult({
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Survey Test Page</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Survey Completion</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Guest ID
              </label>
              <input
                type="text"
                value={guestId}
                onChange={(e) => setGuestId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter guest ID"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event ID
              </label>
              <input
                type="text"
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter event ID"
              />
            </div>
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={testSurveyCompletion}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test Survey Completion'}
            </button>
            
            <button
              onClick={testSurveyDebug}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test Survey Debug'}
            </button>
            
            <button
              onClick={testSurveySend}
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test Survey Send'}
            </button>
            
            <button
              onClick={testEventLookup}
              disabled={loading}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test Event Lookup'}
            </button>
          </div>
        </div>
        
        {result && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Test Results</h2>
            <pre className="bg-gray-100 p-4 rounded-md overflow-auto text-sm">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
} 