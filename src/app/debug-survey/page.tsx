'use client'

import { useState } from 'react'

export default function DebugSurvey() {
  const [eventId, setEventId] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  const testSurveySend = async () => {
    if (!eventId) {
      setResult('Please enter an Event ID')
      return
    }

    setLoading(true)
    setResult('Testing survey send...')

    try {
      const response = await fetch('/api/debug/test-survey-send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ eventId })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setResult(JSON.stringify(data, null, 2))
      } else {
        setResult(`Error: ${data.error}`)
      }
    } catch (error) {
      setResult(`Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const testFullSurveySend = async () => {
    if (!eventId) {
      setResult('Please enter an Event ID')
      return
    }

    setLoading(true)
    setResult('Testing full survey send...')

    try {
      const response = await fetch('/api/surveys/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ eventId })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setResult(JSON.stringify(data, null, 2))
      } else {
        setResult(`Error: ${data.error}`)
      }
    } catch (error) {
      setResult(`Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Debug Survey Sending
        </h1>
        
        <div className="space-y-4">
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
          
          <div className="flex space-x-4">
            <button
              onClick={testSurveySend}
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test Single Survey Send'}
            </button>
            
            <button
              onClick={testFullSurveySend}
              disabled={loading}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test Full Survey Send'}
            </button>
          </div>
          
          {result && (
            <div className="mt-4 p-4 bg-gray-100 rounded-md">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap overflow-auto max-h-96">
                {result}
              </pre>
            </div>
          )}
        </div>
        
        <div className="mt-6 text-sm text-gray-500">
          <p><strong>Test Single Survey Send:</strong> Tests sending a survey to the first guest with a used QR code</p>
          <p><strong>Test Full Survey Send:</strong> Tests the complete survey sending process for all guests with used QR codes</p>
          <p className="mt-2">This will help identify issues with:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>SQL query syntax</li>
            <li>Email configuration</li>
            <li>Database relationships</li>
            <li>Survey invitation creation</li>
          </ul>
        </div>
      </div>
    </div>
  )
} 