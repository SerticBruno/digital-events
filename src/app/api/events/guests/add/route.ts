import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { eventId, guestIds } = await request.json()
    
    console.log('Add guests to event request:', { eventId, guestIds })

    if (!eventId || !guestIds || !Array.isArray(guestIds) || guestIds.length === 0) {
      console.log('Invalid request data:', { eventId, guestIds })
      return NextResponse.json(
        { error: 'Event ID and guest IDs are required' },
        { status: 400 }
      )
    }

    // Verify event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    })

    console.log('Event lookup result:', event)

    if (!event) {
      console.log('Event not found for ID:', eventId)
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // Verify all guests exist
    const existingGuests = await prisma.guest.findMany({
      where: {
        id: { in: guestIds }
      },
      select: { id: true }
    })

    console.log('Existing guests found:', existingGuests)
    console.log('Requested guest IDs:', guestIds)

    if (existingGuests.length !== guestIds.length) {
      console.log('Guest count mismatch:', { requested: guestIds.length, found: existingGuests.length })
      return NextResponse.json(
        { error: 'Some guests not found' },
        { status: 404 }
      )
    }

    // Check which guests are already in the event
    const existingEventGuests = await (prisma as any).eventGuest.findMany({
      where: {
        guestId: { in: guestIds },
        eventId: eventId
      },
      select: { guestId: true }
    })

    const existingGuestIds = existingEventGuests.map((g: any) => g.guestId)
    const newGuestIds = guestIds.filter(id => !existingGuestIds.includes(id))

    if (newGuestIds.length === 0) {
      return NextResponse.json(
        { message: 'All guests are already in this event' },
        { status: 200 }
      )
    }

    // Add guests to event through junction table
    const eventGuestRecords = newGuestIds.map(guestId => ({
      eventId,
      guestId
    }))

    await (prisma as any).eventGuest.createMany({
      data: eventGuestRecords
    })

    // Get the updated guests for response
    const result = await prisma.guest.findMany({
      where: {
        id: { in: newGuestIds }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true
      }
    })

    return NextResponse.json({
      message: `Successfully added ${newGuestIds.length} guest(s) to event`,
      addedGuests: result,
      alreadyInEvent: existingGuestIds.length
    })

  } catch (error) {
    console.error('Add guests to event error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('Error details:', errorMessage)
    return NextResponse.json(
      { error: 'Failed to add guests to event', details: errorMessage },
      { status: 500 }
    )
  }
} 