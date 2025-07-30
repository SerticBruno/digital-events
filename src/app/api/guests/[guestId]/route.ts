import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guestId: string }> }
) {
  try {
    console.log('Guest API called')
    
    const { guestId } = await params
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')

    console.log('Fetching guest data for:', { guestId, eventId })

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

    console.log('Guest found:', guest)

    if (!guest) {
      console.error('Guest not found for ID:', guestId)
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
      console.error('EventGuest not found for:', { guestId, eventId })
      return NextResponse.json(
        { error: 'Guest not found in this event' },
        { status: 404 }
      )
    }

    console.log('EventGuest found:', eventGuest)

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

    console.log('Invitation found:', invitation)

    const responseData = {
      guest,
      event: eventGuest.event,
      invitation
    }
    
    console.log('Returning response:', responseData)

    return NextResponse.json(responseData, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      }
    })
  } catch (error) {
    console.error('Failed to fetch guest data:', error)
    
    // Ensure we return a proper JSON response even on error
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch guest data'
    
    return NextResponse.json(
      { error: errorMessage },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    )
  }
} 