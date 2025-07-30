import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guestId: string }> }
) {
  try {
    console.log('Survey completion API called')
    console.log('Request URL:', request.url)
    console.log('Request headers:', Object.fromEntries(request.headers.entries()))
    
    const { guestId } = await params
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')

    console.log('Survey completion request for:', { guestId, eventId })

    if (!guestId || !eventId) {
      console.error('Missing required parameters:', { guestId, eventId })
      return NextResponse.json(
        { error: 'Guest ID and Event ID are required' },
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      )
    }

    // Verify the guest exists and is associated with the event
    console.log('Checking guest existence...')
    let guest
    try {
      guest = await prisma.guest.findFirst({
        where: {
          id: guestId,
          eventGuests: {
            some: {
              eventId: eventId
            }
          }
        }
      })
    } catch (dbError) {
      console.error('Database error when checking guest:', dbError)
      return NextResponse.json(
        { error: 'Database error when checking guest' },
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      )
    }

    console.log('Guest found:', guest ? 'Yes' : 'No')

    if (!guest) {
      console.error('Guest not found or not associated with event:', { guestId, eventId })
      return NextResponse.json(
        { error: 'Guest not found or not associated with this event' },
        { 
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      )
    }

    // Check if survey invitation exists
    console.log('Checking survey invitation...')
    let surveyInvitation
    try {
      surveyInvitation = await prisma.invitation.findFirst({
        where: {
          guestId: guestId,
          eventId: eventId,
          type: 'SURVEY'
        }
      })
    } catch (dbError) {
      console.error('Database error when checking survey invitation:', dbError)
      return NextResponse.json(
        { error: 'Database error when checking survey invitation' },
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      )
    }

    console.log('Survey invitation found:', surveyInvitation ? 'Yes' : 'No')

    if (!surveyInvitation) {
      console.error('Survey invitation not found for:', { guestId, eventId })
      return NextResponse.json(
        { error: 'Survey invitation not found' },
        { 
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      )
    }

    // Check if survey is already completed
    console.log('Checking existing survey...')
    const existingSurvey = await prisma.survey.findFirst({
      where: {
        guestId: guestId,
        eventId: eventId
      }
    })

    console.log('Existing survey found:', existingSurvey ? 'Yes' : 'No')

    if (existingSurvey) {
      console.log('Survey already completed, redirecting to thank you page')
      // Survey already completed, redirect to thank you page
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/survey/thank-you?completed=true`
      )
    }

    // Create a survey record to mark as completed
    console.log('Creating survey record...')
    let newSurvey
    try {
      newSurvey = await prisma.survey.create({
        data: {
          guestId: guestId,
          eventId: eventId,
          rating: 0, // Default rating, will be updated when they actually complete the form
          feedback: 'Survey link clicked - completion tracked'
        }
      })
    } catch (dbError) {
      console.error('Database error when creating survey record:', dbError)
      return NextResponse.json(
        { error: 'Database error when creating survey record' },
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      )
    }

    console.log('Survey record created:', newSurvey.id)

    // Update the invitation status to opened
    console.log('Updating invitation status...')
    let updatedInvitation
    try {
      updatedInvitation = await prisma.invitation.update({
        where: {
          id: surveyInvitation.id
        },
        data: {
          status: 'OPENED',
          openedAt: new Date()
        }
      })
    } catch (dbError) {
      console.error('Database error when updating invitation status:', dbError)
      return NextResponse.json(
        { error: 'Database error when updating invitation status' },
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      )
    }

    console.log('Invitation status updated:', updatedInvitation.status)

    // Redirect to the actual survey form
    const surveyUrl = process.env.GOOGLE_FORM_URL || 'https://forms.google.com/your-form-id'
    console.log('Redirecting to survey URL:', surveyUrl)
    
    return NextResponse.redirect(surveyUrl)
  } catch (error) {
    console.error('Error processing survey completion:', error)
    
    // Provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('Detailed error:', errorMessage)
    
    return NextResponse.json(
      { error: `Failed to process survey completion: ${errorMessage}` },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    )
  }
} 