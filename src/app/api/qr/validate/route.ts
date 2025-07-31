import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, eventId, allowReuse = false } = body

    if (!code || !eventId) {
      return NextResponse.json(
        { error: 'QR code and event ID are required' },
        { status: 400 }
      )
    }

    // Find QR code - check for valid statuses
    const qrCodeRecord = await prisma.$queryRaw<Array<{
      id: string
      code: string
      type: string
      status: string
      guestId: string
      eventId: string
      usedAt: string | null
    }>>`
      SELECT id, code, type, status, "guestId", "eventId", "usedAt"
      FROM qr_codes 
      WHERE code = ${code} 
      AND "eventId" = ${eventId}
      AND status IN ('SENT', 'GENERATED', 'USED')
    `

    if (qrCodeRecord.length === 0) {
      return NextResponse.json(
        { error: 'Invalid QR code or wrong event' },
        { status: 404 }
      )
    }

    const qrCode = qrCodeRecord[0]

    // Check if QR code is already used
    if (qrCode.status === 'USED' && !allowReuse) {
      return NextResponse.json(
        { 
          error: 'QR code already used',
          details: {
            usedAt: qrCode.usedAt,
            message: 'This QR code has already been scanned. For testing, you can set allowReuse=true'
          }
        },
        { status: 409 }
      )
    }

    // Only update status if not already used
    if (qrCode.status !== 'USED') {
      await prisma.qRCode.update({
        where: { id: qrCode.id },
        data: {
          status: 'USED',
          usedAt: new Date()
        }
      })
    }

    // Get guest information
    const guestRecord = await prisma.$queryRaw<Array<{
      id: string
      firstName: string
      lastName: string
      email: string
      company: string | null
      isVip: boolean
    }>>`
      SELECT id, "firstName", "lastName", email, company, "isVip"
      FROM guests 
      WHERE id = ${qrCode.guestId}
    `

    if (guestRecord.length === 0) {
      return NextResponse.json(
        { error: 'Guest not found' },
        { status: 404 }
      )
    }

    const guest = guestRecord[0]

    return NextResponse.json({
      success: true,
      guest: {
        id: guest.id,
        firstName: guest.firstName,
        lastName: guest.lastName,
        email: guest.email,
        company: guest.company,
        isVip: guest.isVip
      },
      qrCode: {
        id: qrCode.id,
        code: qrCode.code,
        type: qrCode.type,
        status: 'USED',
        usedAt: qrCode.usedAt || new Date().toISOString(),
        wasAlreadyUsed: qrCode.status === 'USED'
      }
    })
  } catch (error) {
    console.error('Error validating QR code:', error)
    return NextResponse.json(
      { error: 'Error validating QR code' },
      { status: 500 }
    )
  }
} 