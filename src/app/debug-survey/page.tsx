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

  const testProductionSurvey = async () => {
    if (!eventId) {
      setResult('Please enter an Event ID')
      return
    }

    setLoading(true)
    setResult('Testing production survey functionality...')

    try {
      const response = await fetch('/api/debug/production-survey-test', {
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

  const runProductionChecklist = async () => {
    setLoading(true)
    setResult('Running production checklist...')

    try {
      const response = await fetch('/api/debug/production-checklist')
      
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

  const testSurveyFunction = async () => {
    if (!eventId) {
      setResult('Please enter an Event ID')
      return
    }

    setLoading(true)
    setResult('Testing sendSurvey function...')

    try {
      // First get a guest ID from the event
      const guestResponse = await fetch('/api/debug/test-survey-send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ eventId })
      })
      
      const guestData = await guestResponse.json()
      
      if (!guestResponse.ok) {
        setResult(`Error getting guest: ${guestData.error}`)
        return
      }

      if (!guestData.debug?.testGuest?.id) {
        setResult('No test guest found for this event')
        return
      }

      const guestId = guestData.debug.testGuest.id

      // Now test the sendSurvey function directly
      const response = await fetch('/api/debug/test-survey-function', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ guestId, eventId })
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              onClick={testSurveySend}
              disabled={loading}
              className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test Single Survey'}
            </button>
            
            <button
              onClick={testFullSurveySend}
              disabled={loading}
              className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test Full Survey Send'}
            </button>

            <button
              onClick={testProductionSurvey}
              disabled={loading}
              className="bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Production Test'}
            </button>

            <button
              onClick={runProductionChecklist}
              disabled={loading}
              className="bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
            >
              {loading ? 'Checking...' : 'Production Checklist'}
            </button>

            <button
              onClick={testSurveyFunction}
              disabled={loading}
              className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test Survey Function'}
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
          <p><strong>Test Single Survey:</strong> Tests sending a survey to the first guest with a used QR code</p>
          <p><strong>Test Full Survey Send:</strong> Tests the complete survey sending process for all guests with used QR codes</p>
          <p><strong>Production Test:</strong> Comprehensive test of production environment including environment variables, database, and email configuration</p>
          <p><strong>Production Checklist:</strong> Verifies all required environment variables and configurations for production</p>
          <p><strong>Test Survey Function:</strong> Tests the sendSurvey function directly to isolate any issues with the function itself</p>
          <p className="mt-2">This will help identify issues with:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Environment variables</li>
            <li>Database connection</li>
            <li>SQL query syntax</li>
            <li>Email configuration</li>
            <li>URL/base URL issues</li>
            <li>Survey invitation creation</li>
            <li>sendSurvey function logic</li>
          </ul>
        </div>
      </div>
    </div>
  )
} 