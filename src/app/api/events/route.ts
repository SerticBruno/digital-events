import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    // Test database connection first
    await prisma.$connect()
    
    const events = await prisma.event.findMany({
      orderBy: { date: 'desc' }
    })

    // For now, just return the events with basic counts
    const transformedEvents = events.map(event => ({
      ...event,
      _count: {
        eventGuests: 0,
        invitations: 0,
        qrCodes: 0,
        surveys: 0,
        guests: 0
      }
    }))

    return NextResponse.json(transformedEvents)
  } catch (error) {
    console.error('Failed to fetch events:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch events',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, date, location, maxGuests } = body

    console.log('Creating event with data:', { name, description, date, location, maxGuests })

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

    console.log('Event created successfully:', event)
    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error('Failed to create event:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create event',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      )
    }

    // Delete the event and all related data
    await prisma.event.delete({
      where: { id: eventId }
    })

    return NextResponse.json({ message: 'Event deleted successfully' })
  } catch (error) {
    console.error('Failed to delete event:', error)
    return NextResponse.json(
      { error: 'Failed to delete event' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, description, date, location, maxGuests } = body

    if (!id || !name || !date) {
      return NextResponse.json(
        { error: 'Event ID, name, and date are required' },
        { status: 400 }
      )
    }

    const event = await prisma.event.update({
      where: { id },
      data: {
        name,
        description,
        date: new Date(date),
        location,
        maxGuests: maxGuests ? parseInt(maxGuests) : null
      }
    })

    return NextResponse.json(event)
  } catch (error) {
    console.error('Failed to update event:', error)
    return NextResponse.json(
      { error: 'Failed to update event' },
      { status: 500 }
    )
  }
} 