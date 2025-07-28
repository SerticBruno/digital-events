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

    const eventGuests = await prisma.$queryRaw<Array<{
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      company?: string;
      position?: string;
      phone?: string;
      isVip: boolean;
    }>>`
      SELECT 
        g.id,
        g.email,
        g."firstName",
        g."lastName",
        g.company,
        g.position,
        g.phone,
        g."isVip"
      FROM event_guests eg
      JOIN guests g ON eg.guestId = g.id
      WHERE eg.eventId = ${eventId}
      ORDER BY eg."createdAt" DESC
    `

    // Transform the raw query result to match expected format
    const guests = eventGuests.map(guest => ({
      ...guest,
      invitations: [],
      qrCodes: [],
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

    return NextResponse.json(guest, { status: 201 })
  } catch (error) {
    console.error('Failed to create guest:', error)
    return NextResponse.json(
      { error: 'Failed to create guest' },
      { status: 500 }
    )
  }
} 