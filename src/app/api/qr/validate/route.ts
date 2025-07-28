import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { qrCode } = body

    if (!qrCode) {
      return NextResponse.json(
        { error: 'QR code is required' },
        { status: 400 }
      )
    }

    // Find the QR code
    const qrCodeRecord = await prisma.qRCode.findFirst({
      where: { code: qrCode },
      include: {
        guest: true,
        event: true
      }
    })

    if (!qrCodeRecord) {
      return NextResponse.json(
        { error: 'Invalid QR code' },
        { status: 404 }
      )
    }

    // Check if QR code is already used
    if (qrCodeRecord.isUsed) {
      return NextResponse.json(
        { 
          error: 'QR code already used',
          usedAt: qrCodeRecord.usedAt,
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
      message: 'QR code validated successfully',
      guest: {
        id: qrCodeRecord.guest.id,
        firstName: qrCodeRecord.guest.firstName,
        lastName: qrCodeRecord.guest.lastName,
        email: qrCodeRecord.guest.email,
        isVip: qrCodeRecord.guest.isVip
      },
      event: {
        id: qrCodeRecord.event.id,
        name: qrCodeRecord.event.name,
        date: qrCodeRecord.event.date,
        location: qrCodeRecord.event.location
      },
      usedAt: new Date()
    })

  } catch (error) {
    console.error('Failed to validate QR code:', error)
    return NextResponse.json(
      { error: 'Failed to validate QR code' },
      { status: 500 }
    )
  }
} 