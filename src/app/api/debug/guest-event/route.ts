import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const guestId = searchParams.get('guestId')
    const eventId = searchParams.get('eventId')

    if (!guestId || !eventId) {
      return NextResponse.json({
        error: 'Both guestId and eventId are required'
      }, { status: 400 })
    }

    const result: Record<string, unknown> = {}

    // Check if guest exists
    const guest = await prisma.guest.findUnique({
      where: { id: guestId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        company: true,
        isVip: true
      }
    })

    result.guest = guest

    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        name: true,
        description: true,
        date: true,
        location: true,
        maxGuests: true
      }
    })

    result.event = event

    // Check event_guests relationship
    const eventGuest = await prisma.eventGuest.findUnique({
      where: {
        eventId_guestId: {
          eventId,
          guestId
        }
      }
    })

    result.eventGuest = eventGuest

    // Test raw SQL query to see the exact date format
    try {
      const rawEventData = await prisma.$queryRaw<Array<{
        eventId: string;
        eventName: string;
        eventDate: string;
      }>>`
        SELECT 
          e.id as eventId,
          e.name as eventName,
          e.date as eventDate
        FROM event_guests eg
        JOIN events e ON eg."eventId" = e.id
        WHERE eg."guestId" = ${guestId}
        AND e.id = ${eventId}
      `

      result.rawEventData = rawEventData

      // Test date parsing
      if (rawEventData.length > 0) {
        const rawDate = rawEventData[0].eventDate
        result.dateTests = {
          rawDate,
          rawDateType: typeof rawDate,
          newDateResult: new Date(rawDate),
          newDateValid: !isNaN(new Date(rawDate).getTime()),
          toISOString: new Date(rawDate).toISOString()
        }
      }
    } catch (error) {
      result.rawQueryError = error instanceof Error ? error.message : 'Unknown error'
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Debug guest-event error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 