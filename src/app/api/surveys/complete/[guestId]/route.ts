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

    if (!guestId || !eventId) {
      return NextResponse.json(
        { error: 'Guest ID and Event ID are required' },
        { status: 400 }
      )
    }

    // Verify the guest exists and is associated with the event
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

    if (!guest) {
      return NextResponse.json(
        { error: 'Guest not found or not associated with this event' },
        { status: 404 }
      )
    }

    // Check if survey invitation exists
    const surveyInvitation = await prisma.invitation.findFirst({
      where: {
        guestId: guestId,
        eventId: eventId,
        type: 'SURVEY'
      }
    })

    if (!surveyInvitation) {
      return NextResponse.json(
        { error: 'Survey invitation not found' },
        { status: 404 }
      )
    }

    // Check if survey is already completed
    const existingSurvey = await prisma.survey.findFirst({
      where: {
        guestId: guestId,
        eventId: eventId
      }
    })

    if (existingSurvey) {
      // Survey already completed, redirect to thank you page
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/survey/thank-you?completed=true`
      )
    }

    // Create a survey record to mark as completed
    await prisma.survey.create({
      data: {
        guestId: guestId,
        eventId: eventId,
        rating: 0, // Default rating, will be updated when they actually complete the form
        feedback: 'Survey link clicked - completion tracked'
      }
    })

    // Update the invitation status to opened
    await prisma.invitation.update({
      where: {
        id: surveyInvitation.id
      },
      data: {
        status: 'OPENED',
        openedAt: new Date()
      }
    })

    // Redirect to the actual survey form
    const surveyUrl = process.env.GOOGLE_FORM_URL || 'https://forms.google.com/your-form-id'
    
    return NextResponse.redirect(surveyUrl)
  } catch (error) {
    console.error('Error processing survey completion:', error)
    return NextResponse.json(
      { error: 'Failed to process survey completion' },
      { status: 500 }
    )
  }
} 