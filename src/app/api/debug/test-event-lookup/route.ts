import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { guestId, eventId } = body

    console.log('Testing event lookup for:', { guestId, eventId })

    const results: any = {}

    // Test 1: Direct event query (like in sendSurvey)
    try {
      const directEventQuery = await prisma.$queryRaw<Array<{
        eventId: string;
        eventName: string;
        eventDescription: string | null;
        eventDate: string;
        eventLocation: string | null;
        eventMaxGuests: number | null;
      }>>`
        SELECT 
          e.id as eventId,
          e.name as eventName,
          e.description as eventDescription,
          e.date as eventDate,
          e.location as eventLocation,
          e."maxGuests" as eventMaxGuests
        FROM events e
        WHERE e.id = ${eventId}
        LIMIT 1
      `
      results.directEventQuery = {
        success: true,
        count: directEventQuery.length,
        data: directEventQuery
      }
    } catch (error) {
      results.directEventQuery = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // Test 2: Guest-event association query
    try {
      const associationQuery = await prisma.$queryRaw<Array<{
        eventId: string;
        eventName: string;
        eventDescription: string | null;
        eventDate: string;
        eventLocation: string | null;
        eventMaxGuests: number | null;
      }>>`
        SELECT 
          e.id as eventId,
          e.name as eventName,
          e.description as eventDescription,
          e.date as eventDate,
          e.location as eventLocation,
          e."maxGuests" as eventMaxGuests
        FROM event_guests eg
        JOIN events e ON eg."eventId" = e.id
        WHERE eg."guestId" = ${guestId}
        AND e.id = ${eventId}
        ORDER BY e.date ASC
        LIMIT 1
      `
      results.associationQuery = {
        success: true,
        count: associationQuery.length,
        data: associationQuery
      }
    } catch (error) {
      results.associationQuery = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // Test 3: Check if guest exists
    try {
      const guestCheck = await prisma.$queryRaw<Array<{
        id: string;
        firstName: string;
        lastName: string;
        email: string;
      }>>`
        SELECT g.id, g."firstName", g."lastName", g.email
        FROM guests g
        WHERE g.id = ${guestId}
        LIMIT 1
      `
      results.guestCheck = {
        success: true,
        count: guestCheck.length,
        data: guestCheck
      }
    } catch (error) {
      results.guestCheck = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // Test 4: Check if event exists
    try {
      const eventCheck = await prisma.$queryRaw<Array<{
        id: string;
        name: string;
        description: string | null;
        date: string;
        location: string | null;
        maxGuests: number | null;
      }>>`
        SELECT e.id, e.name, e.description, e.date, e.location, e."maxGuests"
        FROM events e
        WHERE e.id = ${eventId}
        LIMIT 1
      `
      results.eventCheck = {
        success: true,
        count: eventCheck.length,
        data: eventCheck
      }
    } catch (error) {
      results.eventCheck = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error('Error in test event lookup:', error)
    return NextResponse.json(
      { error: 'Failed to test event lookup' },
      { status: 500 }
    )
  }
} 