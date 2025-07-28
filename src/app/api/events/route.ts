import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const events = await (prisma as any).event.findMany({
      include: {
        _count: {
          select: {
            eventGuests: true,
            invitations: true,
            qrCodes: true,
            surveys: true
          }
        }
      },
      orderBy: { date: 'desc' }
    })

    // Transform the data to match the expected format
    const transformedEvents = events.map((event: any) => ({
      ...event,
      _count: {
        ...event._count,
        guests: event._count.eventGuests // Map eventGuests count to guests count
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