import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guestId: string }> }
) {
  try {
    const { guestId } = await params
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')

    // Get guest data
    const guest = await prisma.guest.findUnique({
      where: { id: guestId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        company: true,
        isVip: true,
      }
    })

    if (!guest) {
      return NextResponse.json(
        { error: 'Guest not found' },
        { status: 404 }
      )
    }

    // Get event data for this guest
    let eventGuest
    if (eventId) {
      // If eventId is provided, get data for that specific event
      eventGuest = await prisma.eventGuest.findFirst({
        where: { 
          guestId,
          eventId 
        },
        include: {
          event: {
            select: {
              id: true,
              name: true,
              description: true,
              date: true,
              location: true,
            }
          }
        }
      })
    } else {
      // Fallback to first event (for backward compatibility)
      eventGuest = await prisma.eventGuest.findFirst({
        where: { guestId },
        include: {
          event: {
            select: {
              id: true,
              name: true,
              description: true,
              date: true,
              location: true,
            }
          }
        }
      })
    }

    if (!eventGuest) {
      return NextResponse.json(
        { error: 'Guest not found in this event' },
        { status: 404 }
      )
    }

    // Get invitation data for the specific event
    const invitation = await prisma.invitation.findFirst({
      where: {
        guestId,
        eventId: eventGuest.event.id
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        type: true,
        status: true,
        response: true,
        hasPlusOne: true,
        plusOneName: true,
        respondedAt: true,
      }
    })

    return NextResponse.json({
      guest,
      event: eventGuest.event,
      invitation
    })
  } catch (error) {
    console.error('Failed to fetch guest data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch guest data' },
      { status: 500 }
    )
  }
} 