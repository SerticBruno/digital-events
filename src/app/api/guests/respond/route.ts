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

    let deletedPlusOneEmail = null

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
      // Check if the guest previously had a plus-one and is now changing their response
      const hadPlusOne = invitation.hasPlusOne
      const previousPlusOneEmail = invitation.plusOneEmail
      
      // If guest previously had a plus-one but is now changing to not have one, delete the plus-one guest
      // This handles scenarios like: "coming with plus-one" → "coming alone" or "not coming"
      if (hadPlusOne && response !== 'COMING_WITH_PLUS_ONE' && previousPlusOneEmail) {
        try {
          // Find the plus-one guest
          const plusOneGuest = await prisma.guest.findUnique({
            where: { email: previousPlusOneEmail }
          })
          
          if (plusOneGuest) {
            // Delete the plus-one guest (this will cascade delete all related records)
            await prisma.guest.delete({
              where: { id: plusOneGuest.id }
            })
            deletedPlusOneEmail = previousPlusOneEmail
            console.log(`Deleted plus-one guest: ${previousPlusOneEmail} because main guest changed response`)
          }
        } catch (error) {
          console.error('Failed to delete plus-one guest:', error)
          // Continue with the response update even if plus-one deletion fails
        }
      }
      
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
        // Get the original guest to check if they are VIP
        const originalGuest = await prisma.guest.findUnique({ where: { id: guestId } })
        
        // Create new guest for plus-one
        const plusOneGuest = await prisma.guest.upsert({
          where: { email: plusOneEmail },
          update: {
            isPlusOne: true,
            isVip: originalGuest?.isVip || false
          },
          create: {
            email: plusOneEmail,
            firstName: 'Guest',
            lastName: 'of ' + originalGuest?.firstName || 'Guest',
            isVip: originalGuest?.isVip || false,
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

        // Create invitation for plus-one (status will be updated to 'SENT' when email is actually sent)
        await prisma.invitation.create({
          data: {
            guestId: plusOneGuest.id,
            eventId,
            type: 'INVITATION',
            status: 'GUEST',
            hasPlusOne: true
          }
        })

        // Note: QR codes will be generated separately when the "Generate QR Codes" button is clicked
        // No automatic QR code generation here

        // Send invitation email to plus-one using the email API to ensure proper status tracking
        try {
          const emailResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/email/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'invitation',
              guestIds: [plusOneGuest.id],
              eventId: eventId
            })
          })
          
          if (!emailResponse.ok) {
            console.error('Failed to send invitation to plus-one guest')
          }
        } catch (emailError) {
          console.error('Failed to send invitation to plus-one guest:', emailError)
        }

      } catch (error) {
        console.error('Failed to create plus-one guest:', error)
        // Continue with the original guest's response even if plus-one creation fails
      }
    }

    console.log('Response saved successfully:', invitation)
    
    // Prepare response message
    let message = 'Response recorded successfully'
    
    // If we deleted a plus-one, include that information
    if (deletedPlusOneEmail) {
      message += '. Plus-one guest has been removed.'
    }
    
    return NextResponse.json({
      message,
      invitation,
      deletedPlusOne: deletedPlusOneEmail
    })
  } catch (error) {
    console.error('Failed to record response:', error)
    return NextResponse.json(
      { error: 'Failed to record response' },
      { status: 500 }
    )
  }
} 