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

    console.log('Production survey test for event:', eventId)

    // 1. Check environment variables
    const envCheck = {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_URL: process.env.VERCEL_URL,
      RESEND_API_KEY: process.env.RESEND_API_KEY ? 'Set' : 'Not set',
      FROM_EMAIL: process.env.FROM_EMAIL,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      TEST_URL: process.env.TEST_URL,
      DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Not set',
      GOOGLE_FORM_URL: process.env.GOOGLE_FORM_URL
    }

    console.log('Environment check:', envCheck)

    // 2. Test database connection
    let dbConnectionTest = { success: false, error: null }
    try {
      await prisma.$queryRaw`SELECT 1 as test`
      dbConnectionTest = { success: true, error: null }
    } catch (error) {
      dbConnectionTest = { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown database error' 
      }
    }

    // 3. Check if event exists
    let eventCheck = { exists: false, event: null, error: null }
    try {
      const event = await prisma.event.findUnique({
        where: { id: eventId }
      })
      eventCheck = { exists: !!event, event, error: null }
    } catch (error) {
      eventCheck = { 
        exists: false, 
        event: null, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }

    // 4. Check total guests for event
    let totalGuestsCheck = { count: 0, error: null }
    try {
      const totalGuests = await prisma.eventGuest.count({
        where: { eventId }
      })
      totalGuestsCheck = { count: totalGuests, error: null }
    } catch (error) {
      totalGuestsCheck = { 
        count: 0, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }

    // 5. Check QR codes for event
    let qrCodesCheck = { total: 0, used: 0, error: null }
    try {
      const qrCodes = await prisma.qRCode.findMany({
        where: { eventId }
      })
      const usedQRCodes = qrCodes.filter(qr => qr.status === 'USED')
      qrCodesCheck = { 
        total: qrCodes.length, 
        used: usedQRCodes.length, 
        error: null 
      }
    } catch (error) {
      qrCodesCheck = { 
        total: 0, 
        used: 0, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }

    // 6. Test the exact query used in survey sending
    let surveyQueryTest = { guests: [], count: 0, error: null }
    try {
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
      surveyQueryTest = { 
        guests: guestsWithUsedQRCodes, 
        count: guestsWithUsedQRCodes.length, 
        error: null 
      }
    } catch (error) {
      surveyQueryTest = { 
        guests: [], 
        count: 0, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }

    // 7. Test email configuration
    let emailTest = { success: false, error: null }
    if (surveyQueryTest.count > 0) {
      try {
        const testGuest = surveyQueryTest.guests[0]
        const { sendSurvey } = await import('@/lib/email')
        const result = await sendSurvey(testGuest.id, eventId)
        emailTest = { 
          success: result.success, 
          error: result.success ? null : result.error 
        }
      } catch (error) {
        emailTest = { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }
      }
    }

    // 8. Check existing survey invitations
    let surveyInvitationsCheck = { count: 0, error: null }
    try {
      const surveyInvitations = await prisma.invitation.count({
        where: { 
          eventId,
          type: 'SURVEY'
        }
      })
      surveyInvitationsCheck = { count: surveyInvitations, error: null }
    } catch (error) {
      surveyInvitationsCheck = { 
        count: 0, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }

    const debugInfo = {
      environment: envCheck,
      database: {
        connection: dbConnectionTest,
        event: eventCheck,
        totalGuests: totalGuestsCheck,
        qrCodes: qrCodesCheck,
        surveyInvitations: surveyInvitationsCheck
      },
      surveyQuery: surveyQueryTest,
      emailTest: emailTest,
      summary: {
        canSendSurveys: surveyQueryTest.count > 0 && emailTest.success,
        issues: []
      }
    }

    // Identify issues
    if (!dbConnectionTest.success) {
      debugInfo.summary.issues.push('Database connection failed')
    }
    if (!eventCheck.exists) {
      debugInfo.summary.issues.push('Event not found')
    }
    if (surveyQueryTest.count === 0) {
      debugInfo.summary.issues.push('No guests with used QR codes found')
    }
    if (!emailTest.success) {
      debugInfo.summary.issues.push('Email sending failed')
    }
    if (!process.env.RESEND_API_KEY) {
      debugInfo.summary.issues.push('RESEND_API_KEY not configured')
    }

    console.log('Production survey test completed:', debugInfo)

    return NextResponse.json({
      message: 'Production survey test completed',
      debug: debugInfo
    })

  } catch (error) {
    console.error('Error in production survey test:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('Detailed error:', errorMessage)
    
    return NextResponse.json(
      { error: `Failed to run production survey test: ${errorMessage}` },
      { status: 500 }
    )
  }
} 