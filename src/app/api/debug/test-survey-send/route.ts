import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { eventId } = body

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      )
    }

    console.log('Testing survey send for event:', eventId)

    // First, let's check if there are any guests with used QR codes
    const guestsWithUsedQRCodes = await prisma.$queryRaw<Array<{
      id: string
      firstName: string
      lastName: string
      email: string
      company: string | null
      isVip: boolean
      qrCodeId: string
      qrCodeUsedAt: string
    }>>`
      SELECT 
        g.id,
        g."firstName",
        g."lastName",
        g.email,
        g.company,
        g."isVip",
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

    console.log('Found guests with used QR codes:', guestsWithUsedQRCodes.length)

    if (guestsWithUsedQRCodes.length === 0) {
      return NextResponse.json({
        message: 'No guests found who have used their QR codes for this event',
        results: [],
        debug: {
          eventId,
          totalGuests: 0,
          guestsWithUsedQRCodes: 0
        }
      })
    }

    // Test sending survey to the first guest only
    const testGuest = guestsWithUsedQRCodes[0]
    console.log('Testing with guest:', testGuest)

    // Check if survey invitation already exists
    const existingSurveyInvitation = await prisma.invitation.findFirst({
      where: { 
        guestId: testGuest.id, 
        eventId,
        type: 'SURVEY'
      }
    })

    if (existingSurveyInvitation) {
      return NextResponse.json({
        message: 'Survey invitation already exists for test guest',
        results: [{
          guestId: testGuest.id,
          guestName: `${testGuest.firstName} ${testGuest.lastName}`,
          email: testGuest.email,
          status: 'already_sent',
          message: 'Survey invitation already sent'
        }],
        debug: {
          eventId,
          totalGuests: guestsWithUsedQRCodes.length,
          testGuest: testGuest,
          existingInvitation: existingSurveyInvitation
        }
      })
    }

    // Test the sendSurvey function
    const { sendSurvey } = await import('@/lib/email')
    const result = await sendSurvey(testGuest.id, eventId)
    
    if (result.success) {
      // Create survey invitation record
      await prisma.invitation.create({
        data: {
          type: 'SURVEY',
          status: 'SENT',
          sentAt: new Date(),
          guestId: testGuest.id,
          eventId,
          hasPlusOne: false
        }
      })

      return NextResponse.json({
        message: 'Test survey sent successfully',
        results: [{
          guestId: testGuest.id,
          guestName: `${testGuest.firstName} ${testGuest.lastName}`,
          email: testGuest.email,
          status: 'success',
          message: 'Survey sent successfully'
        }],
        debug: {
          eventId,
          totalGuests: guestsWithUsedQRCodes.length,
          testGuest: testGuest,
          emailResult: result
        }
      })
    } else {
      return NextResponse.json({
        message: 'Test survey failed to send',
        results: [{
          guestId: testGuest.id,
          guestName: `${testGuest.firstName} ${testGuest.lastName}`,
          email: testGuest.email,
          status: 'failed',
          error: result.error
        }],
        debug: {
          eventId,
          totalGuests: guestsWithUsedQRCodes.length,
          testGuest: testGuest,
          emailResult: result
        }
      })
    }

  } catch (error) {
    console.error('Error testing survey send:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('Detailed error:', errorMessage)
    
    return NextResponse.json(
      { error: `Failed to test survey send: ${errorMessage}` },
      { status: 500 }
    )
  }
} 