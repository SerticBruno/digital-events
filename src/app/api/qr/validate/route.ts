import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Helper function to format time ago
function formatTimeAgo(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''} ago`
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
  } else if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600)
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`
  } else {
    const days = Math.floor(seconds / 86400)
    return `${days} day${days !== 1 ? 's' : ''} ago`
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, eventId } = body

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
    if (qrCode.status === 'USED') {
      const usedAt = qrCode.usedAt ? new Date(qrCode.usedAt) : null
      const now = new Date()
      const timeDiff = usedAt ? (now.getTime() - usedAt.getTime()) / 1000 : 0 // seconds
      
      // Get guest information for the error message
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

      const guest = guestRecord.length > 0 ? guestRecord[0] : null
      
      // If used more than 5 seconds ago, show detailed error
      if (timeDiff > 5) {
        const formattedTime = usedAt ? usedAt.toLocaleString() : 'Unknown time'
        const timeAgo = formatTimeAgo(timeDiff)
        
        return NextResponse.json(
          { 
            error: 'QR code already used',
            details: {
              usedAt: qrCode.usedAt,
              formattedTime,
              timeAgo,
              guest: guest ? {
                firstName: guest.firstName,
                lastName: guest.lastName,
                email: guest.email,
                company: guest.company,
                isVip: guest.isVip
              } : null,
              message: `This QR code was already scanned ${timeAgo} ago at ${formattedTime}. Guest: ${guest ? `${guest.firstName} ${guest.lastName}` : 'Unknown'}`
            }
          },
          { status: 409 }
        )
      }
      // If used within 5 seconds, treat it as a successful re-scan
      console.log(`QR code used ${timeDiff.toFixed(1)} seconds ago, allowing re-scan`)
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

    // Determine if this was a recent re-scan
    const usedAt = qrCode.usedAt ? new Date(qrCode.usedAt) : null
    const now = new Date()
    const timeDiff = usedAt ? (now.getTime() - usedAt.getTime()) / 1000 : 0
    const wasRecentlyUsed = qrCode.status === 'USED' && timeDiff <= 5

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
        wasAlreadyUsed: qrCode.status === 'USED',
        wasRecentlyUsed: wasRecentlyUsed
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