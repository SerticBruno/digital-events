import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')

    if (!code || !eventId) {
      return NextResponse.json(
        { error: 'QR code and event ID are required' },
        { status: 400 }
      )
    }

    // Find QR code and check if it's valid and unused
    const qrCodeRecord = await prisma.$queryRaw<Array<{
      id: string
      code: string
      type: string
      status: string
      guestId: string
      eventId: string
    }>>`
      SELECT id, code, type, status, "guestId", "eventId"
      FROM qr_codes 
      WHERE code = ${code} 
      AND "eventId" = ${eventId}
      AND status IN ('SENT', 'GENERATED')
    `

    if (qrCodeRecord.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or already used QR code' },
        { status: 404 }
      )
    }

    const qrCode = qrCodeRecord[0]

    // Mark QR code as used using Prisma ORM
    await prisma.qRCode.update({
      where: { id: qrCode.id },
      data: {
        status: 'USED',
        usedAt: new Date()
      }
    })

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
        usedAt: new Date().toISOString()
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