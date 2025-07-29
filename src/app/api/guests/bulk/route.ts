import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { randomUUID } from 'crypto'

interface GuestData {
  firstName: string
  lastName: string
  email: string
  company?: string
  position?: string
  phone?: string
  isVip?: boolean
}



export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { eventId, guests } = body

    if (!eventId || !guests || !Array.isArray(guests)) {
      return NextResponse.json(
        { error: 'Event ID and guests array are required' },
        { status: 400 }
      )
    }

    // Validate event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    })

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    const results = []
    const errors = []

    for (const guestData of guests as GuestData[]) {
      try {
        // Check if guest already exists globally
        let guest = await prisma.guest.findUnique({
          where: { email: guestData.email }
        })

        if (!guest) {
          // Create new guest using raw SQL
          const guestId = randomUUID()
          await prisma.$executeRaw`
            INSERT INTO guests (id, email, firstName, lastName, company, position, phone, isVip, isPlusOne, createdAt, updatedAt)
            VALUES (${guestId}, ${guestData.email}, ${guestData.firstName}, ${guestData.lastName}, ${guestData.company || null}, ${guestData.position || null}, ${guestData.phone || null}, ${guestData.isVip || false}, false, datetime('now'), datetime('now'))
          `
          guest = {
            id: guestId,
            email: guestData.email,
            firstName: guestData.firstName,
            lastName: guestData.lastName,
            company: guestData.company || null,
            position: guestData.position || null,
            phone: guestData.phone || null,
            isVip: guestData.isVip || false,
            isPlusOne: false,
            createdAt: new Date(),
            updatedAt: new Date()
          } as unknown as { id: string; email: string; firstName: string; lastName: string; company: string | null; position: string | null; phone: string | null; isVip: boolean; isPlusOne: boolean; createdAt: Date; updatedAt: Date; eventId: string }
        }

        // Check if guest is already in this event using raw SQL
        const existingEventGuest = await prisma.$queryRaw<Array<{ guestId: string }>>`
          SELECT guestId FROM event_guests 
          WHERE eventId = ${eventId} AND guestId = ${guest!.id}
        `

        if (existingEventGuest.length > 0) {
          errors.push({
            email: guestData.email,
            error: 'Guest already exists for this event'
          })
          continue
        }

        // Add guest to event using raw SQL
        await prisma.$executeRaw`
          INSERT INTO event_guests (id, eventId, guestId, createdAt) 
          VALUES (${randomUUID()}, ${eventId}, ${guest!.id}, datetime('now'))
        `

        // Generate QR code for the new guest
        try {
          const { generateQRCode } = await import('@/lib/qr')
          await generateQRCode(guest!.id, eventId, guestData.isVip ? 'VIP' : 'REGULAR')
        } catch (error) {
          console.error('Failed to generate QR code for new guest:', error)
          // Don't fail the guest creation if QR code generation fails
        }

        results.push({
          id: guest!.id,
          email: guest!.email,
          success: true
        })
      } catch {
        errors.push({
          email: guestData.email,
          error: 'Failed to create guest'
        })
      }
    }

    const successCount = results.length
    const errorCount = errors.length

    return NextResponse.json({
      message: `Successfully imported ${successCount} guests, ${errorCount} failed`,
      results,
      errors
    })
  } catch (error) {
    console.error('Failed to bulk import guests:', error)
    return NextResponse.json(
      { error: 'Failed to bulk import guests' },
      { status: 500 }
    )
  }
} 