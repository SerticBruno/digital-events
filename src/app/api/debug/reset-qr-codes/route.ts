import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { eventId, guestId, qrCodeId } = body

    let whereClause: Record<string, string> = {}

    if (qrCodeId) {
      whereClause.id = qrCodeId
    } else if (guestId && eventId) {
      whereClause.guestId = guestId
      whereClause.eventId = eventId
    } else if (eventId) {
      whereClause.eventId = eventId
    } else {
      return NextResponse.json(
        { error: 'Please provide either qrCodeId or eventId (and optionally guestId)' },
        { status: 400 }
      )
    }

    // Reset QR codes to GENERATED status
    const result = await prisma.qRCode.updateMany({
      where: {
        ...whereClause,
        status: 'USED'
      },
      data: {
        status: 'GENERATED',
        usedAt: null
      }
    })

    return NextResponse.json({
      success: true,
      message: `Reset ${result.count} QR code(s) to GENERATED status`,
      resetCount: result.count
    })
  } catch (error) {
    console.error('Error resetting QR codes:', error)
    return NextResponse.json(
      { error: 'Failed to reset QR codes' },
      { status: 500 }
    )
  }
} 