import { NextRequest, NextResponse } from 'next/server'
import { sendQRCode } from '@/lib/email'
import { generateQRCode } from '@/lib/qr'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { guestId, eventId } = body

    if (!guestId || !eventId) {
      return NextResponse.json(
        { error: 'Guest ID and Event ID are required' },
        { status: 400 }
      )
    }

    console.log(`Testing QR code sending for guest ${guestId} in event ${eventId}`)

    // First, try to generate a QR code
    const qrResult = await generateQRCode(guestId, eventId, 'REGULAR')
    
    if (!qrResult.success) {
      return NextResponse.json(
        { error: `Failed to generate QR code: ${qrResult.error}` },
        { status: 500 }
      )
    }

    console.log(`Generated QR code: ${qrResult.code}`)

    // Then try to send the email
    const emailResult = await sendQRCode(guestId, eventId)

    if (emailResult.success) {
      return NextResponse.json({
        success: true,
        message: 'QR code email sent successfully',
        qrCode: qrResult.code,
        emailSent: true
      })
    } else {
      return NextResponse.json({
        success: false,
        error: `Failed to send email: ${emailResult.error}`,
        qrCode: qrResult.code,
        emailSent: false
      })
    }
  } catch (error) {
    console.error('Test QR code sending failed:', error)
    return NextResponse.json(
      { error: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
} 