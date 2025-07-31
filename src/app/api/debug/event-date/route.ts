import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const guestId = searchParams.get('guestId')
    const eventId = searchParams.get('eventId')

    if (!guestId) {
      return NextResponse.json({
        error: 'Guest ID is required'
      }, { status: 400 })
    }

    console.log('Debugging event date for:', { guestId, eventId })

    interface DebugResult {
      guestId: string | null;
      eventId: string | null;
      timestamp: string;
      guest?: { id: string; firstName: string; lastName: string; email: string } | null;
      guestError?: string;
      event?: { id: string; name: string; date: Date; location: string | null } | null;
      eventError?: string;
      eventGuest?: {
        id: string;
        createdAt: Date;
        eventId: string;
        guestId: string;
        event: {
          id: string;
          name: string;
          date: Date;
          location: string | null;
        };
      } | null;
      eventGuestError?: string;
      rawEventData?: Array<{ eventId: string; eventName: string; eventDate: unknown; eventLocation: string | null }>;
      rawQueryError?: string;
      dateTests?: {
        rawDate: unknown;
        rawDateType: string;
        rawDateString: string;
        newDateResult: Date;
        newDateValid: boolean;
        toISOString: string;
      };
      allEvents?: Array<{ eventId: string; eventName: string; eventDate: unknown }>;
      allEventsError?: string;
    }

    const result: DebugResult = {
      guestId,
      eventId,
      timestamp: new Date().toISOString()
    }

    // Test 1: Check if guest exists
    try {
      const guest = await prisma.guest.findUnique({
        where: { id: guestId },
        select: { id: true, firstName: true, lastName: true, email: true }
      })
      result.guest = guest
    } catch (error) {
      result.guestError = error instanceof Error ? error.message : 'Unknown error'
    }

    // Test 2: Check if event exists (if eventId provided)
    if (eventId) {
      try {
        const event = await prisma.event.findUnique({
          where: { id: eventId },
          select: { id: true, name: true, date: true, location: true }
        })
        result.event = event
      } catch (error) {
        result.eventError = error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // Test 3: Check event-guest relationship
    try {
      const eventGuest = await prisma.eventGuest.findFirst({
        where: {
          guestId: guestId,
          ...(eventId && { eventId: eventId })
        },
        include: {
          event: {
            select: { id: true, name: true, date: true, location: true }
          }
        }
      })
      result.eventGuest = eventGuest
    } catch (error) {
      result.eventGuestError = error instanceof Error ? error.message : 'Unknown error'
    }

    // Test 4: Raw SQL query to see exact data
    try {
      const rawEventData = await prisma.$queryRaw<Array<{
        eventId: string;
        eventName: string;
        eventDate: unknown;
        eventLocation: string | null;
      }>>`
        SELECT 
          e.id as "eventId",
          e.name as "eventName",
          e.date as "eventDate",
          e.location as "eventLocation"
        FROM event_guests eg
        JOIN events e ON eg."eventId" = e.id
        WHERE eg."guestId" = ${guestId}
        ${eventId ? `AND e.id = ${eventId}` : ''}
        ORDER BY e.date ASC
        LIMIT 1
      `

      result.rawEventData = rawEventData

      // Test date parsing if we have data
      if (rawEventData.length > 0) {
        const rawDate = rawEventData[0].eventDate
        result.dateTests = {
          rawDate,
          rawDateType: typeof rawDate,
          rawDateString: String(rawDate),
          newDateResult: new Date(rawDate),
          newDateValid: !isNaN(new Date(rawDate).getTime()),
          toISOString: new Date(rawDate).toISOString()
        }
      }
    } catch (error) {
      result.rawQueryError = error instanceof Error ? error.message : 'Unknown error'
    }

    // Test 5: Check all events for this guest
    try {
      const allEvents = await prisma.$queryRaw<Array<{
        eventId: string;
        eventName: string;
        eventDate: unknown;
      }>>`
        SELECT 
          e.id as "eventId",
          e.name as "eventName",
          e.date as "eventDate"
        FROM event_guests eg
        JOIN events e ON eg."eventId" = e.id
        WHERE eg."guestId" = ${guestId}
        ORDER BY e.date ASC
      `
      result.allEvents = allEvents
    } catch (error) {
      result.allEventsError = error instanceof Error ? error.message : 'Unknown error'
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Debug event date error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
} 