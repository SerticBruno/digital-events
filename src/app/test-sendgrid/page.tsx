'use client'

import { useState } from 'react'

interface SendGridResult {
  success: boolean
  data?: {
    messageId?: string
    statusCode?: number
  }
  error?: string
  errorDetails?: string
}

export default function TestSendGridPage() {
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('Test Email')
  const [html, setHtml] = useState('<h1>Test</h1><p>This is a test email.</p>')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SendGridResult | null>(null)

  const testSendGrid = async () => {
    if (!email) {
      alert('Please enter an email address')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/email/sendgrid-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email,
          subject,
          html
        })
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  const checkEnvironment = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/email/sendgrid-test')
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">SendGrid Test</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Environment Check */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h2 className="text-xl font-semibold text-blue-900 mb-4">Environment Check</h2>
              <button
                onClick={checkEnvironment}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Checking...' : 'Check Environment'}
              </button>
            </div>

            {/* Test SendGrid */}
            <div className="bg-green-50 p-4 rounded-lg">
              <h2 className="text-xl font-semibold text-green-900 mb-4">Test SendGrid Email</h2>
              <button
                onClick={testSendGrid}
                disabled={loading}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Test Email'}
              </button>
            </div>
          </div>

          {/* Email Form */}
          <div className="mt-8 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="test@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                HTML Content
              </label>
              <textarea
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Result */}
          {result && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Result</h2>
              <div className={`p-4 rounded-lg ${
                result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <pre className="text-sm overflow-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Setup Instructions */}
          <div className="mt-8 bg-yellow-50 p-4 rounded-lg">
            <h2 className="text-xl font-semibold text-yellow-900 mb-4">Setup Instructions</h2>
            <div className="text-sm text-yellow-800 space-y-2">
              <p>1. Create SendGrid account at <a href="https://sendgrid.com" target="_blank" rel="noopener noreferrer" className="underline">sendgrid.com</a></p>
              <p>2. Add environment variables to <code className="bg-yellow-100 px-1 rounded">.env.local</code>:</p>
              <pre className="bg-yellow-100 p-2 rounded text-xs overflow-auto">
{`SENDGRID_API_KEY=your_api_key_here
SENDGRID_FROM_EMAIL=noreply@yourdomain.hr
SENDGRID_FROM_NAME=Event Team
SENDGRID_REPLY_TO=info@yourdomain.hr`}
              </pre>
              <p>3. Configure DNS records (SPF, DKIM, DMARC)</p>
              <p>4. Test with small volume first</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 