import { NextRequest, NextResponse } from 'next/server'
import { generateQRCode } from '@/lib/qr'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { guestIds, eventId, type = 'REGULAR' } = body

    if (!guestIds || !Array.isArray(guestIds) || !eventId) {
      return NextResponse.json(
        { error: 'Guest IDs array and event ID are required' },
        { status: 400 }
      )
    }

    const results = []

    for (const guestId of guestIds) {
      try {
        const qrCode = await generateQRCode(guestId, eventId, type)
        results.push({ guestId, success: true, qrCode })
      } catch (error) {
        console.error(`Failed to generate QR code for guest ${guestId}:`, error)
        results.push({ guestId, success: false, error: error instanceof Error ? error.message : 'Unknown error' })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failureCount = results.length - successCount

    return NextResponse.json({
      message: `Generated QR codes for ${successCount} guests, ${failureCount} failed`,
      results
    })
  } catch (error) {
    console.error('Failed to generate QR codes:', error)
    return NextResponse.json(
      { error: 'Failed to generate QR codes' },
      { status: 500 }
    )
  }
} 