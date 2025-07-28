import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { randomUUID } from 'crypto'

interface GuestData {
  eventId: string
  email: string
  firstName: string
  lastName: string
  company?: string
  position?: string
  phone?: string
  isVip?: boolean
}



export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      )
    }

    // Use Prisma ORM instead of raw SQL for better reliability
    const eventGuests = await prisma.eventGuest.findMany({
      where: { eventId },
      include: {
        guest: {
          include: {
            invitations: {
              where: { eventId },
              orderBy: { createdAt: 'desc' },
              take: 1
            },
            qrCodes: {
              where: { 
                eventId,
                isUsed: false
              },
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Transform the data to match expected format
    const guests = eventGuests.map(eventGuest => ({
      id: eventGuest.guest.id,
      email: eventGuest.guest.email,
      firstName: eventGuest.guest.firstName,
      lastName: eventGuest.guest.lastName,
      company: eventGuest.guest.company,
      position: eventGuest.guest.position,
      phone: eventGuest.guest.phone,
      isVip: eventGuest.guest.isVip,
      invitations: eventGuest.guest.invitations,
      qrCodes: eventGuest.guest.qrCodes,
      survey: undefined
    }))



    return NextResponse.json(guests)
  } catch (error) {
    console.error('Failed to fetch guests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch guests' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as GuestData
    const { 
      eventId, 
      email, 
      firstName, 
      lastName, 
      company, 
      position, 
      phone, 
      isVip 
    } = body

    if (!eventId || !email || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Event ID, email, first name, and last name are required' },
        { status: 400 }
      )
    }

    // Check if guest already exists globally
    let guest = await prisma.guest.findUnique({
      where: { email }
    })

    if (!guest) {
      // Create new guest using raw SQL
      const guestId = randomUUID()
      await prisma.$executeRaw`
        INSERT INTO guests (id, email, firstName, lastName, company, position, phone, isVip, createdAt, updatedAt)
        VALUES (${guestId}, ${email}, ${firstName}, ${lastName}, ${company || null}, ${position || null}, ${phone || null}, ${isVip || false}, datetime('now'), datetime('now'))
      `
      guest = {
        id: guestId,
        email,
        firstName,
        lastName,
        company: company || null,
        position: position || null,
        phone: phone || null,
        isVip: isVip || false,
        createdAt: new Date(),
        updatedAt: new Date()
      } as unknown as { id: string; email: string; firstName: string; lastName: string; company: string | null; position: string | null; phone: string | null; isVip: boolean; createdAt: Date; updatedAt: Date; eventId: string }
    }

    // Check if guest is already in this event using raw SQL
    const existingEventGuest = await prisma.$queryRaw<Array<{ guestId: string }>>`
      SELECT guestId FROM event_guests 
      WHERE eventId = ${eventId} AND guestId = ${guest!.id}
    `

    if (existingEventGuest.length > 0) {
      return NextResponse.json(
        { error: 'Guest already exists for this event' },
        { status: 409 }
      )
    }

    // Add guest to event using raw SQL
    await prisma.$executeRaw`
      INSERT INTO event_guests (id, eventId, guestId, createdAt) 
      VALUES (${randomUUID()}, ${eventId}, ${guest!.id}, datetime('now'))
    `

    // Generate QR code for the new guest
    try {
      const { generateQRCode } = await import('@/lib/qr')
      await generateQRCode(guest!.id, eventId, isVip ? 'VIP' : 'REGULAR')
    } catch (error) {
      console.error('Failed to generate QR code for new guest:', error)
      // Don't fail the guest creation if QR code generation fails
    }

    return NextResponse.json(guest, { status: 201 })
  } catch (error) {
    console.error('Failed to create guest:', error)
    return NextResponse.json(
      { error: 'Failed to create guest' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const guestId = searchParams.get('guestId')
    const eventId = searchParams.get('eventId')

    if (!guestId || !eventId) {
      return NextResponse.json(
        { error: 'Guest ID and Event ID are required' },
        { status: 400 }
      )
    }

    // Remove guest from the specific event
    await prisma.eventGuest.deleteMany({
      where: {
        guestId,
        eventId
      }
    })

    return NextResponse.json({ message: 'Guest removed from event successfully' })
  } catch (error) {
    console.error('Failed to remove guest from event:', error)
    return NextResponse.json(
      { error: 'Failed to remove guest from event' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, firstName, lastName, email, company, position, phone, isVip } = body

    if (!id || !firstName || !lastName || !email) {
      return NextResponse.json(
        { error: 'Guest ID, first name, last name, and email are required' },
        { status: 400 }
      )
    }

    const guest = await prisma.guest.update({
      where: { id },
      data: {
        firstName,
        lastName,
        email,
        company,
        position,
        phone,
        isVip
      }
    })

    return NextResponse.json(guest)
  } catch (error) {
    console.error('Failed to update guest:', error)
    return NextResponse.json(
      { error: 'Failed to update guest' },
      { status: 500 }
    )
  }
} 