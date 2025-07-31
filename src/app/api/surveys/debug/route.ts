import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const guestId = searchParams.get('guestId')
    const eventId = searchParams.get('eventId')

    console.log('Survey debug request for:', { guestId, eventId })

    if (!guestId || !eventId) {
      return NextResponse.json(
        { error: 'Guest ID and Event ID are required as query parameters' },
        { status: 400 }
      )
    }

    // Test 1: Check if guest exists
    const guest = await prisma.guest.findUnique({
      where: { id: guestId },
      select: { id: true, firstName: true, lastName: true, email: true }
    })

    // Test 2: Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, name: true }
    })

    // Test 3: Check if guest is associated with event
    const eventGuest = await prisma.eventGuest.findFirst({
      where: {
        guestId: guestId,
        eventId: eventId
      }
    })

    // Test 4: Check if survey invitation exists
    const surveyInvitation = await prisma.invitation.findFirst({
      where: {
        guestId: guestId,
        eventId: eventId,
        type: 'SURVEY'
      }
    })

    // Test 5: Use raw SQL query (same as survey completion endpoint)
    const rawQueryResult = await prisma.$queryRaw<Array<{
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    }>>`
      SELECT g.id, g."firstName", g."lastName", g.email
      FROM guests g
      JOIN event_guests eg ON g.id = eg."guestId"
      WHERE g.id = ${guestId}
      AND eg."eventId" = ${eventId}
      LIMIT 1
    `

    const result = {
      guestId,
      eventId,
      tests: {
        guestExists: !!guest,
        eventExists: !!event,
        guestEventAssociation: !!eventGuest,
        surveyInvitationExists: !!surveyInvitation,
        rawQueryWorks: rawQueryResult.length > 0
      },
      details: {
        guest,
        event,
        eventGuest,
        surveyInvitation,
        rawQueryResult
      },
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
        NEXTAUTH_URL: process.env.NEXTAUTH_URL,
        TEST_URL: process.env.TEST_URL
      }
    }

    console.log('Survey debug result:', result)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Survey debug error:', error)
    return NextResponse.json(
      { error: `Debug failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
} 