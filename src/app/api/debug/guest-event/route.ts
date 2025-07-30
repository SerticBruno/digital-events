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

    // Check if guest is associated with event
    const eventGuest = await prisma.eventGuest.findUnique({
      where: {
        eventId_guestId: {
          eventId: eventId,
          guestId: guestId
        }
      }
    })

    result.eventGuest = eventGuest

    // Check existing invitations
    const invitations = await prisma.invitation.findMany({
      where: {
        guestId: guestId,
        eventId: eventId
      },
      select: {
        id: true,
        type: true,
        status: true,
        sentAt: true,
        response: true
      }
    })

    result.invitations = invitations

    // Check environment variables (without exposing sensitive data)
    result.environment = {
      RESEND_API_KEY: !!process.env.RESEND_API_KEY,
      FROM_EMAIL: !!process.env.FROM_EMAIL,
      NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
      TEST_URL: !!process.env.TEST_URL
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Debug guest-event error:', error)
    return NextResponse.json({
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 