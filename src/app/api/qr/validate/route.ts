import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { qrCode, eventId } = await request.json()

    if (!qrCode || !eventId) {
      return NextResponse.json(
        { success: false, message: 'QR code and event ID are required' },
        { status: 400 }
      )
    }

    // Find the QR code in database
    const qrCodeRecord = await prisma.qRCode.findFirst({
      where: {
        code: qrCode,
        eventId: eventId,
        type: 'ENTRY'
      },
      include: {
        guest: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            company: true,
            isVip: true
          }
        }
      }
    })

    if (!qrCodeRecord) {
      return NextResponse.json(
        { success: false, message: 'QR code not found for this event' },
        { status: 404 }
      )
    }

    if (qrCodeRecord.isUsed) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'QR code already used',
          guest: qrCodeRecord.guest
        },
        { status: 409 }
      )
    }

    // Mark QR code as used
    await prisma.qRCode.update({
      where: { id: qrCodeRecord.id },
      data: {
        isUsed: true,
        usedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: 'QR code validated successfully',
      guest: qrCodeRecord.guest
    })

  } catch (error) {
    console.error('QR validation error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
} 