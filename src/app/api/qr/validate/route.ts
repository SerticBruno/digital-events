import { NextRequest, NextResponse } from 'next/server'
import { validateQRCode, useQRCode } from '@/lib/qr'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code } = body

    if (!code) {
      return NextResponse.json(
        { error: 'QR code is required' },
        { status: 400 }
      )
    }

    // Validate QR code
    const validation = await validateQRCode(code)

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    // Use QR code (mark as used)
    const usage = await useQRCode(code)

    if (!usage.success) {
      return NextResponse.json(
        { error: 'Failed to process QR code' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      guest: validation.guest,
      event: validation.event,
      qrCode: usage.qrCode
    })
  } catch (error) {
    console.error('QR code validation failed:', error)
    return NextResponse.json(
      { error: 'QR code validation failed' },
      { status: 500 }
    )
  }
} 