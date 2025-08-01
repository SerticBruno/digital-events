import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    console.log('Survey debug API called')
    
    const body = await request.json()
    const { eventId, guestId } = body

    console.log('Debug request for:', { eventId, guestId })

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      )
    }

    // Test 1: Check if event exists
    console.log('Test 1: Checking if event exists...')
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    })
    
    console.log('Event found:', event ? { id: event.id, name: event.name } : 'NOT FOUND')

    // Test 2: Get all guests for this event
    console.log('Test 2: Getting all guests for this event...')
    const eventGuests = await prisma.eventGuest.findMany({
      where: { eventId },
      include: {
        guest: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })
    
    console.log(`Found ${eventGuests.length} guests for event`)

    // Test 3: Get guests with used QR codes
    console.log('Test 3: Getting guests with used QR codes...')
    const guestsWithUsedQRCodes = await prisma.$queryRaw<Array<{
      id: string
      firstName: string
      lastName: string
      email: string
      qrCodeId: string
      qrCodeUsedAt: string
    }>>`
      SELECT 
        g.id,
        g."firstName",
        g."lastName",
        g.email,
        q.id as "qrCodeId",
        q."usedAt" as "qrCodeUsedAt"
      FROM guests g
      JOIN event_guests eg ON g.id = eg."guestId"
      JOIN qr_codes q ON g.id = q."guestId" AND eg."eventId" = q."eventId"
      WHERE eg."eventId" = ${eventId}
      AND q.status = 'USED'
      AND q."usedAt" IS NOT NULL
      ORDER BY g."lastName", g."firstName"
    `

    console.log(`Found ${guestsWithUsedQRCodes.length} guests with used QR codes`)

    // Test 4: If guestId provided, test specific guest
    let specificGuestData = null
    if (guestId) {
      console.log('Test 4: Testing specific guest...')
      
      // Get guest data
      const guest = await prisma.guest.findUnique({
        where: { id: guestId }
      })
      
      if (guest) {
        // Get event data for this guest
        const guestEvent = await prisma.eventGuest.findFirst({
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
                location: true
              }
            }
          }
        })
        
        specificGuestData = {
          guest: {
            id: guest.id,
            firstName: guest.firstName,
            lastName: guest.lastName,
            email: guest.email
          },
          event: guestEvent?.event || null,
          isAssociatedWithEvent: !!guestEvent
        }
      }
    }

    // Test 5: Check existing survey invitations
    console.log('Test 5: Checking existing survey invitations...')
    const existingInvitations = await prisma.invitation.findMany({
      where: {
        eventId,
        type: 'SURVEY'
      },
      include: {
        guest: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    console.log(`Found ${existingInvitations.length} existing survey invitations`)

    return NextResponse.json({
      success: true,
      debug: {
        event: event ? { id: event.id, name: event.name, date: event.date } : null,
        totalGuestsForEvent: eventGuests.length,
        guestsWithUsedQRCodes: guestsWithUsedQRCodes.length,
        specificGuest: specificGuestData,
        existingSurveyInvitations: existingInvitations.length,
        sampleGuests: guestsWithUsedQRCodes.slice(0, 3).map(g => ({
          id: g.id,
          name: `${g.firstName} ${g.lastName}`,
          email: g.email,
          qrUsedAt: g.qrCodeUsedAt
        })),
        sampleInvitations: existingInvitations.slice(0, 3).map(i => ({
          id: i.id,
          guestName: `${i.guest.firstName} ${i.guest.lastName}`,
          status: i.status,
          sentAt: i.sentAt
        }))
      }
    })
  } catch (error) {
    console.error('Survey debug error:', error)
    return NextResponse.json(
      { error: `Debug failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
} 