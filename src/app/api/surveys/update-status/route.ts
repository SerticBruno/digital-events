import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    console.log('Survey update status API called')
    
    const bodyText = await request.text()
    console.log('Request body text:', bodyText)
    
    if (!bodyText.trim()) {
      console.error('Empty request body')
      return NextResponse.json(
        { error: 'Request body is required' },
        { status: 400 }
      )
    }
    
    let body
    try {
      body = JSON.parse(bodyText)
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError)
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }
    
    const { guestId, eventId, rating, feedback } = body

    console.log('Survey update request for:', { guestId, eventId, rating, feedback })

    if (!guestId || !eventId) {
      console.error('Missing required fields:', { guestId, eventId })
      return NextResponse.json(
        { error: 'Guest ID and Event ID are required' },
        { status: 400 }
      )
    }

    // Verify the guest exists and is associated with the event
    console.log('Checking guest existence...')
    const guest = await prisma.guest.findFirst({
      where: {
        id: guestId,
        eventGuests: {
          some: {
            eventId: eventId
          }
        }
      }
    })

    console.log('Guest found:', guest ? 'Yes' : 'No')

    if (!guest) {
      console.error('Guest not found or not associated with event:', { guestId, eventId })
      return NextResponse.json(
        { error: 'Guest not found or not associated with this event' },
        { status: 404 }
      )
    }

    // Update or create survey record
    console.log('Updating survey record...')
    const survey = await prisma.survey.upsert({
      where: {
        guestId: guestId
      },
      update: {
        rating: rating || 0,
        feedback: feedback || null,
        submittedAt: new Date()
      },
      create: {
        guestId: guestId,
        eventId: eventId,
        rating: rating || 0,
        feedback: feedback || null
      }
    })

    console.log('Survey record updated/created:', survey.id)

    // Update invitation status to responded
    console.log('Updating invitation status...')
    const updatedInvitations = await prisma.invitation.updateMany({
      where: {
        guestId: guestId,
        eventId: eventId,
        type: 'SURVEY'
      },
      data: {
        status: 'RESPONDED',
        respondedAt: new Date()
      }
    })

    console.log('Invitations updated:', updatedInvitations.count)

    const responseData = {
      success: true,
      message: 'Survey updated successfully',
      survey
    }
    
    console.log('Returning response:', responseData)

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('Error updating survey:', error)
    
    // Provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('Detailed error:', errorMessage)
    
    return NextResponse.json(
      { error: `Failed to update survey: ${errorMessage}` },
      { status: 500 }
    )
  }
} 