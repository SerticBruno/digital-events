import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
      const body = await request.json()
  const { guestId, eventId, response, plusOneEmail } = body

    console.log('Respond API called with:', { guestId, eventId, response, plusOneEmail })
    
    if (!guestId || !eventId || !response) {
      return NextResponse.json(
        { error: 'Guest ID, event ID, and response are required' },
        { status: 400 }
      )
    }

    // Validate response values
    const validResponses = ['COMING', 'NOT_COMING', 'COMING_WITH_PLUS_ONE']
    if (!validResponses.includes(response)) {
      return NextResponse.json(
        { error: 'Invalid response value' },
        { status: 400 }
      )
    }

    // Check if guest exists and is part of the event
    const eventGuest = await prisma.eventGuest.findFirst({
      where: {
        guestId,
        eventId
      }
    })

    console.log('EventGuest found:', eventGuest)

    if (!eventGuest) {
      return NextResponse.json(
        { error: 'Guest not found in this event' },
        { status: 404 }
      )
    }

    // Find the most recent invitation or create new one
    let invitation = await prisma.invitation.findFirst({
      where: {
        guestId,
        eventId
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (invitation) {
      // Update existing invitation - preserve the sentAt timestamp if it exists
      invitation = await prisma.invitation.update({
        where: { id: invitation.id },
        data: {
          response,
          respondedAt: new Date(),
          plusOneName: response === 'COMING_WITH_PLUS_ONE' ? plusOneEmail : null,
          plusOneEmail: response === 'COMING_WITH_PLUS_ONE' ? plusOneEmail : null,
          status: 'RESPONDED',
          hasPlusOne: response === 'COMING_WITH_PLUS_ONE'
        }
      })
    } else {
      // Create new invitation if none exists (this shouldn't happen normally)
      invitation = await prisma.invitation.create({
        data: {
          guestId,
          eventId,
          type: 'INVITATION',
          status: 'RESPONDED',
          response,
          respondedAt: new Date(),
          plusOneName: response === 'COMING_WITH_PLUS_ONE' ? plusOneEmail : null,
          plusOneEmail: response === 'COMING_WITH_PLUS_ONE' ? plusOneEmail : null,
          hasPlusOne: response === 'COMING_WITH_PLUS_ONE'
        }
      })
    }

    // If guest is coming with a plus-one, create a new guest and send invitation
    if (response === 'COMING_WITH_PLUS_ONE' && plusOneEmail) {
      try {
        // Create new guest for plus-one
        const plusOneGuest = await prisma.guest.upsert({
          where: { email: plusOneEmail },
          update: {
            isPlusOne: true
          },
          create: {
            email: plusOneEmail,
            firstName: 'Guest',
            lastName: 'of ' + (await prisma.guest.findUnique({ where: { id: guestId } }))?.firstName || 'Guest',
            isVip: false,
            isPlusOne: true
          }
        })

        // Add plus-one to the event
        await prisma.eventGuest.upsert({
          where: {
            eventId_guestId: {
              eventId,
              guestId: plusOneGuest.id
            }
          },
          update: {},
          create: {
            eventId,
            guestId: plusOneGuest.id
          }
        })

        // Create invitation for plus-one
        await prisma.invitation.create({
          data: {
            guestId: plusOneGuest.id,
            eventId,
            type: 'INVITATION',
            status: 'SENT',
            sentAt: new Date(),
            hasPlusOne: false
          }
        })

        // Generate QR codes for both guests using the new function that ensures only one active QR code per user
        const { generateQRCode } = await import('@/lib/qr')
        
        // Generate QR code for the original guest (this will deactivate any existing active QR codes)
        await generateQRCode(guestId, eventId, 'REGULAR')
        
        // Generate QR code for the plus-one guest
        await generateQRCode(plusOneGuest.id, eventId, 'REGULAR')

        // Send invitation email to plus-one
        const { sendInvitation } = await import('@/lib/email')
        await sendInvitation(plusOneGuest.id, eventId)

      } catch (error) {
        console.error('Failed to create plus-one guest:', error)
        // Continue with the original guest's response even if plus-one creation fails
      }
    }

    console.log('Response saved successfully:', invitation)
    
    return NextResponse.json({
      message: 'Response recorded successfully',
      invitation
    })
  } catch (error) {
    console.error('Failed to record response:', error)
    return NextResponse.json(
      { error: 'Failed to record response' },
      { status: 500 }
    )
  }
} 