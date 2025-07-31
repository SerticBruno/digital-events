'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'

interface ValidationResult {
  success: boolean
  guest?: {
    id: string
    firstName: string
    lastName: string
    email: string
    company: string | null
    isVip: boolean
  }
  qrCode?: {
    id: string
    code: string
    type: string
    status: string
    usedAt: string
  }
  error?: string
}

export default function QRValidationPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const [result, setResult] = useState<ValidationResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const validateQRCode = async () => {
      try {
        const code = params.code as string
        const eventId = searchParams.get('eventId')

        if (!code || !eventId) {
          setResult({
            success: false,
            error: 'Invalid QR code or missing event ID'
          })
          setLoading(false)
          return
        }

        const response = await fetch(`/api/qr/validate/${code}?eventId=${eventId}`)
        const data = await response.json()

        setResult(data)
      } catch (error) {
        console.error('Error validating QR code:', error)
        setResult({
          success: false,
          error: 'Failed to validate QR code'
        })
      } finally {
        setLoading(false)
      }
    }

    validateQRCode()
  }, [params.code, searchParams])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Validating QR code...</p>
        </div>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <p className="text-red-600">No validation result available</p>
        </div>
      </div>
    )
  }

  if (!result.success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Invalid QR Code</h1>
          <p className="text-gray-600 mb-4">{result.error || 'This QR code is invalid or has already been used.'}</p>
          <div className="bg-gray-100 p-4 rounded-lg">
            <p className="text-sm text-gray-500">Please contact event staff for assistance.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
        <div className="text-green-500 text-6xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Welcome!</h1>
        
        {result.guest && (
          <div className="mb-6">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg mb-4">
              <h2 className="text-xl font-semibold mb-2">
                {result.guest.firstName} {result.guest.lastName}
              </h2>
              {result.guest.isVip && (
                <div className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-sm font-semibold inline-block mb-2">
                  👑 VIP Guest
                </div>
              )}
              {result.guest.company && (
                <p className="text-blue-100 text-sm">{result.guest.company}</p>
              )}
            </div>
            
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <p className="text-green-800 font-semibold">✓ Successfully checked in</p>
              <p className="text-green-600 text-sm mt-1">
                {new Date().toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {result.qrCode && (
          <div className="bg-gray-100 p-4 rounded-lg text-left">
            <h3 className="font-semibold text-gray-800 mb-2">QR Code Details:</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Code:</strong> {result.qrCode.code}</p>
              <p><strong>Type:</strong> {result.qrCode.type}</p>
              <p><strong>Status:</strong> {result.qrCode.status}</p>
              <p><strong>Used at:</strong> {new Date(result.qrCode.usedAt).toLocaleString()}</p>
            </div>
          </div>
        )}

        <div className="mt-6">
          <p className="text-gray-500 text-sm">
            You can now close this page. Enjoy the event!
          </p>
        </div>
      </div>
    </div>
  )
} 