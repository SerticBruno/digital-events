import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendSurvey } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    console.log('Survey send API called')
    
    const body = await request.json()
    
    const { eventId } = body

    console.log('Survey send request for event:', eventId)

    if (!eventId) {
      console.error('Missing event ID')
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      )
    }

    // Get all guests who have used their QR codes for this event
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

    if (guestsWithUsedQRCodes.length === 0) {
      return NextResponse.json({
        message: 'No guests found who have used their QR codes for this event',
        results: []
      })
    }

    const results = []
    let totalSurveysSent = 0
    let totalFailures = 0

    console.log(`Sending surveys to ${guestsWithUsedQRCodes.length} guests who attended event ${eventId}`)

    // Add delay between requests to avoid rate limiting
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

    for (let i = 0; i < guestsWithUsedQRCodes.length; i++) {
      const guest = guestsWithUsedQRCodes[i]
      
      try {
        // Add delay between requests (500ms = 2 requests per second)
        if (i > 0) {
          await delay(500)
        }

        // Check if survey invitation already exists
        const existingSurveyInvitation = await prisma.invitation.findFirst({
          where: { 
            guestId: guest.id, 
            eventId,
            type: 'SURVEY'
          }
        })

        if (existingSurveyInvitation) {
          results.push({
            guestId: guest.id,
            guestName: `${guest.firstName} ${guest.lastName}`,
            email: guest.email,
            status: 'already_sent',
            message: 'Survey invitation already sent'
          })
          continue
        }

        // Send survey email
        console.log(`Sending survey to guest: ${guest.firstName} ${guest.lastName} (${guest.id}) for event: ${eventId}`)
        const result = await sendSurvey(guest.id, eventId)
        
        if (result.success) {
          // Create survey invitation record
          await prisma.invitation.create({
            data: {
              type: 'SURVEY',
              status: 'SENT',
              sentAt: new Date(),
              guestId: guest.id,
              eventId,
              hasPlusOne: false
            }
          })

          totalSurveysSent++
          results.push({
            guestId: guest.id,
            guestName: `${guest.firstName} ${guest.lastName}`,
            email: guest.email,
            status: 'success',
            message: 'Survey sent successfully'
          })
        } else {
          console.error(`Failed to send survey to ${guest.firstName} ${guest.lastName}:`, result.error)
          totalFailures++
          results.push({
            guestId: guest.id,
            guestName: `${guest.firstName} ${guest.lastName}`,
            email: guest.email,
            status: 'failed',
            error: result.error
          })
        }
      } catch (error) {
        console.error(`Failed to send survey to ${guest.firstName} ${guest.lastName}:`, error)
        totalFailures++
        results.push({
          guestId: guest.id,
          guestName: `${guest.firstName} ${guest.lastName}`,
          email: guest.email,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    const responseData = {
      message: `Sent surveys to ${totalSurveysSent} guests, ${totalFailures} failed`,
      totalSent: totalSurveysSent,
      totalFailed: totalFailures,
      results
    }
    
    console.log('Survey send completed:', responseData)
    
    return NextResponse.json(responseData)
  } catch (error) {
    console.error('Failed to send surveys:', error)
    
    // Provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('Detailed error:', errorMessage)
    
    return NextResponse.json(
      { error: `Failed to send surveys: ${errorMessage}` },
      { status: 500 }
    )
  }
} 