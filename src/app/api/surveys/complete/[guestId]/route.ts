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
    console.log('Environment variables:', {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      TEST_URL: process.env.TEST_URL
    })
    
    // Debug: Let's also check what events exist in the database
    try {
      const allEvents = await prisma.$queryRaw<Array<{ id: string; name: string }>>`
        SELECT id, name FROM events ORDER BY name
      `
      console.log('All events in database:', allEvents)
    } catch (error) {
      console.error('Error fetching all events:', error)
    }

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

    // Verify the guest exists and check event association
    console.log('Checking guest existence...')
    let guest
    try {
      // First, check if the guest exists
      const guestCheck = await prisma.$queryRaw<Array<{
        id: string;
        firstName: string;
        lastName: string;
        email: string;
      }>>`
        SELECT g.id, g."firstName", g."lastName", g.email
        FROM guests g
        WHERE g.id = ${guestId}
        LIMIT 1
      `
      
      console.log('Guest check result:', { guestId, guestsFound: guestCheck.length, guest: guestCheck[0] })
      
      if (guestCheck.length === 0) {
        console.error('Guest not found:', guestId)
        return NextResponse.json(
          { error: 'Guest not found' },
          { 
            status: 404,
            headers: {
              'Content-Type': 'application/json',
            }
          }
        )
      }
      
      const guestData = guestCheck[0]
      
      // Now check if the event exists
      console.log('Checking for event with ID:', eventId)
      const eventCheck = await prisma.$queryRaw<Array<{
        id: string;
        name: string;
      }>>`
        SELECT e.id, e.name
        FROM events e
        WHERE e.id = ${eventId}
        LIMIT 1
      `
      
      console.log('Event check result:', { eventId, eventsFound: eventCheck.length, event: eventCheck[0] })
      
      // Also try a case-insensitive search to see if there's a case mismatch
      if (eventCheck.length === 0) {
        console.log('Event not found with exact ID, trying case-insensitive search...')
        const caseInsensitiveCheck = await prisma.$queryRaw<Array<{
          id: string;
          name: string;
        }>>`
          SELECT e.id, e.name
          FROM events e
          WHERE LOWER(e.id) = LOWER(${eventId})
          LIMIT 1
        `
        console.log('Case-insensitive event check result:', { eventId, eventsFound: caseInsensitiveCheck.length, event: caseInsensitiveCheck[0] })
      }
      
      if (eventCheck.length === 0) {
        console.error('Event not found:', eventId)
        return NextResponse.json(
          { error: 'Event not found' },
          { 
            status: 404,
            headers: {
              'Content-Type': 'application/json',
            }
          }
        )
      }
      
      // Check if guest is associated with event (optional - for logging purposes)
      const associationCheck = await prisma.$queryRaw<Array<{
        guestId: string;
        eventId: string;
      }>>`
        SELECT eg."guestId", eg."eventId"
        FROM event_guests eg
        WHERE eg."guestId" = ${guestId}
        AND eg."eventId" = ${eventId}
        LIMIT 1
      `
      
      console.log('Association check result:', { guestId, eventId, associationsFound: associationCheck.length })
      
      // Note: We don't require the association to exist, as surveys might be sent to guests
      // who don't have a formal event_guests association
      
    } catch (dbError) {
      console.error('Database error when checking guest/event:', dbError)
      return NextResponse.json(
        { error: 'Database error when checking guest/event' },
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      )
    }

    console.log('Guest and event verification completed successfully')

    // Check if survey invitation exists
    console.log('Checking survey invitation...')
    let surveyInvitation: { id: string; status: string; eventId?: string } | null = null
    let surveyEventId = eventId // Default to URL parameter
    
    try {
      // First try to find existing invitation
      const invitations = await prisma.$queryRaw<Array<{
        id: string;
        status: string;
        eventId: string;
      }>>`
        SELECT id, status, "eventId"
        FROM invitations
        WHERE "guestId" = ${guestId}
        AND "eventId" = ${eventId}
        AND type = 'SURVEY'
        LIMIT 1
      `
      
      console.log('Survey invitation query result:', { guestId, eventId, invitationsFound: invitations.length, invitations })
      
      if (invitations.length > 0) {
        surveyInvitation = invitations[0]
        surveyEventId = invitations[0].eventId
      } else {
        // If no invitation found, also try to find any survey invitation for this guest
        const anyInvitation = await prisma.$queryRaw<Array<{
          id: string;
          status: string;
          eventId: string;
        }>>`
          SELECT id, status, "eventId"
          FROM invitations
          WHERE "guestId" = ${guestId}
          AND type = 'SURVEY'
          LIMIT 1
        `
        
        console.log('Any survey invitation query result:', { guestId, anyInvitationFound: anyInvitation.length, anyInvitation })
        
        if (anyInvitation.length > 0) {
          surveyInvitation = anyInvitation[0]
          surveyEventId = anyInvitation[0].eventId
          console.log('Using existing survey invitation for different event:', anyInvitation[0].eventId)
        }
      }
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
      console.log('Creating survey invitation automatically...')
      
      // Create survey invitation automatically if it doesn't exist
      try {
        const newInvitation = await prisma.invitation.create({
          data: {
            type: 'SURVEY',
            status: 'SENT',
            sentAt: new Date(),
            guestId: guestId,
            eventId: eventId,
            hasPlusOne: false
          }
        })
        
        console.log('Created survey invitation:', newInvitation.id)
        surveyInvitation = newInvitation
      } catch (createError) {
        console.error('Failed to create survey invitation:', createError)
        return NextResponse.json(
          { error: 'Failed to create survey invitation' },
          { 
            status: 500,
            headers: {
              'Content-Type': 'application/json',
            }
          }
        )
      }
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
          eventId: surveyEventId,
          rating: 0, // Default rating, will be updated when they actually complete the form
          feedback: 'Survey link clicked - completion tracked'
        }
      })
      
      console.log('Survey record created with event ID:', surveyEventId)
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
    
    // Add additional debugging for the redirect
    console.log('Final redirect details:', {
      surveyUrl,
      guestId,
      eventId,
      invitationId: surveyInvitation.id
    })
    
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