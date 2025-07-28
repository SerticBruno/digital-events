import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const events = await prisma.event.findMany({
      orderBy: { date: 'desc' }
    })

    // Get counts for each event using raw SQL
    const eventCounts = await prisma.$queryRaw<Array<{
      eventId: string;
      eventGuests: number;
      invitations: number;
      qrCodes: number;
      surveys: number;
    }>>`
      SELECT 
        e.id as eventId,
        COUNT(DISTINCT eg.id) as eventGuests,
        COUNT(DISTINCT i.id) as invitations,
        COUNT(DISTINCT q.id) as qrCodes,
        COUNT(DISTINCT s.id) as surveys
      FROM events e
      LEFT JOIN event_guests eg ON e.id = eg.eventId
      LEFT JOIN invitations i ON e.id = i.eventId
      LEFT JOIN qr_codes q ON e.id = q.eventId
      LEFT JOIN surveys s ON e.id = s.eventId
      GROUP BY e.id
    `

    // Create a map of event ID to counts
    const countMap = new Map<string, { eventGuests: number; invitations: number; qrCodes: number; surveys: number }>()
    eventCounts.forEach(count => {
      countMap.set(count.eventId, {
        eventGuests: Number(count.eventGuests),
        invitations: Number(count.invitations),
        qrCodes: Number(count.qrCodes),
        surveys: Number(count.surveys)
      })
    })

    // Transform the data to match the expected format
    const transformedEvents = events.map(event => ({
      ...event,
      _count: {
        ...countMap.get(event.id),
        guests: countMap.get(event.id)?.eventGuests || 0 // Map eventGuests count to guests count
      }
    }))

    return NextResponse.json(transformedEvents)
  } catch (error) {
    console.error('Failed to fetch events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, date, location, maxGuests } = body

    if (!name || !date) {
      return NextResponse.json(
        { error: 'Name and date are required' },
        { status: 400 }
      )
    }

    const event = await prisma.event.create({
      data: {
        name,
        description,
        date: new Date(date),
        location,
        maxGuests: maxGuests ? parseInt(maxGuests) : null
      }
    })

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error('Failed to create event:', error)
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    )
  }
} 