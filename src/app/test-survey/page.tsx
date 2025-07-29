'use client'

import { useState } from 'react'

export default function TestSurvey() {
  const [guestId, setGuestId] = useState('')
  const [eventId, setEventId] = useState('')
  const [result, setResult] = useState('')

  const testSurveyLink = async () => {
    if (!guestId || !eventId) {
      setResult('Please enter both Guest ID and Event ID')
      return
    }

    try {
      const response = await fetch(`/api/surveys/complete/${guestId}?eventId=${eventId}`)
      const data = await response.json()
      
      if (response.ok) {
        setResult('Survey link clicked successfully! Check the database for updates.')
      } else {
        setResult(`Error: ${data.error}`)
      }
    } catch (error) {
      setResult(`Error: ${error}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Test Survey Link
        </h1>
        
        <div className="space-y-4">
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
          
          <button
            onClick={testSurveyLink}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Test Survey Link
          </button>
          
          {result && (
            <div className="mt-4 p-4 bg-gray-100 rounded-md">
              <p className="text-sm text-gray-700">{result}</p>
            </div>
          )}
        </div>
        
        <div className="mt-6 text-sm text-gray-500">
          <p>This page simulates clicking a survey link in an email.</p>
          <p>It will:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Mark the survey as opened</li>
            <li>Create a survey record</li>
            <li>Redirect to the actual survey form</li>
          </ul>
        </div>
      </div>
    </div>
  )
} 