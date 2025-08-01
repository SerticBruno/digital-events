import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    console.log('Guest debug API called')
    
    const body = await request.json()
    const { guestIds, eventId } = body

    console.log('Debug request for:', { guestIds, eventId })

    if (!guestIds || !Array.isArray(guestIds)) {
      return NextResponse.json(
        { error: 'Guest IDs array is required' },
        { status: 400 }
      )
    }

    const results = []

    for (const guestId of guestIds) {
      console.log(`Checking guest: ${guestId}`)
      
      // Check if guest exists
      const guest = await prisma.guest.findUnique({
        where: { id: guestId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          isVip: true,
          isPlusOne: true
        }
      })

      if (!guest) {
        results.push({
          guestId,
          exists: false,
          error: 'Guest not found in database'
        })
        continue
      }

      // Check if guest is associated with the event (if eventId provided)
      let eventAssociation = null
      if (eventId) {
        eventAssociation = await prisma.eventGuest.findUnique({
          where: {
            eventId_guestId: {
              eventId: eventId,
              guestId: guestId
            }
          }
        })
      }

      // Get all events this guest is associated with
      const allEventAssociations = await prisma.eventGuest.findMany({
        where: { guestId: guestId },
        include: {
          event: {
            select: {
              id: true,
              name: true,
              date: true
            }
          }
        }
      })

      // Get existing invitations for this guest
      const invitations = await prisma.invitation.findMany({
        where: { guestId: guestId },
        select: {
          id: true,
          type: true,
          status: true,
          eventId: true,
          sentAt: true
        }
      })

      results.push({
        guestId,
        exists: true,
        guest: {
          id: guest.id,
          firstName: guest.firstName,
          lastName: guest.lastName,
          email: guest.email,
          isVip: guest.isVip,
          isPlusOne: guest.isPlusOne
        },
        eventAssociation: eventAssociation ? {
          eventId: eventAssociation.eventId,
          guestId: eventAssociation.guestId
        } : null,
        allEventAssociations: allEventAssociations.map(ea => ({
          eventId: ea.eventId,
          eventName: ea.event.name,
          eventDate: ea.event.date
        })),
        invitations: invitations.map(inv => ({
          id: inv.id,
          type: inv.type,
          status: inv.status,
          eventId: inv.eventId,
          sentAt: inv.sentAt
        }))
      })
    }

    return NextResponse.json({
      success: true,
      totalGuests: guestIds.length,
      results
    })
  } catch (error) {
    console.error('Guest debug error:', error)
    return NextResponse.json(
      { error: `Debug failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
} 