import { NextRequest, NextResponse } from 'next/server'
import { sendSaveTheDate, sendInvitation, sendQRCode, sendSurvey, sendPlusOneInvitation, sendPlusOneQRCode } from '@/lib/email'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, guestIds, eventId, plusOneEmails, plusOneNames, to, subject, html } = body

    // Handle test emails (direct email sending)
    if (to && subject && html) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: process.env.FROM_EMAIL || 'onboarding@resend.dev',
            to: [to],
            html: html,
          }),
        })

        if (!response.ok) {
          const error = await response.text()
          throw new Error(error)
        }

        return NextResponse.json({ success: true, message: 'Test email sent successfully' })
      } catch (error) {
        console.error('Failed to send test email:', error)
        return NextResponse.json(
          { error: `Failed to send test email: ${error}` },
          { status: 500 }
        )
      }
    }

    // Handle regular guest emails
    if (!type || !guestIds || !Array.isArray(guestIds) || !eventId) {
      return NextResponse.json(
        { error: 'Type, guest IDs array, and event ID are required' },
        { status: 400 }
      )
    }

    // Validate plus-one data if sending plus-one invitations
    if (type === 'plus_one_invitation' || type === 'plus_one_qr_code') {
      if (!plusOneEmails || !Array.isArray(plusOneEmails) || !plusOneNames || !Array.isArray(plusOneNames)) {
        return NextResponse.json(
          { error: 'Plus-one emails and names arrays are required for plus-one invitations' },
          { status: 400 }
        )
      }
      if (plusOneEmails.length !== guestIds.length || plusOneNames.length !== guestIds.length) {
        return NextResponse.json(
          { error: 'Plus-one emails and names arrays must match the number of guest IDs' },
          { status: 400 }
        )
      }
    }

    const results = []

    // Add delay between requests to avoid rate limiting
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

    for (let i = 0; i < guestIds.length; i++) {
      const guestId = guestIds[i]
      
      try {
        // Add delay between requests (500ms = 2 requests per second)
        if (i > 0) {
          await delay(500)
        }

        let result

        switch (type) {
          case 'save_the_date':
            result = await sendSaveTheDate(guestId, eventId)
            break
                            case 'invitation':
                    result = await sendInvitation(guestId, eventId)
                    break
          case 'qr_code':
            result = await sendQRCode(guestId, eventId)
            break
          case 'plus_one_invitation':
            result = await sendPlusOneInvitation(guestId, plusOneEmails[i], plusOneNames[i], eventId)
            break
          case 'plus_one_qr_code':
            result = await sendPlusOneQRCode(guestId, plusOneEmails[i], plusOneNames[i], eventId)
            break
          case 'survey':
            result = await sendSurvey(guestId, eventId)
            break
          default:
            throw new Error(`Unknown email type: ${type}`)
        }

                    if (result.success) {
              // Update or create invitation status in database
              const existingInvitation = await prisma.invitation.findFirst({
                where: { guestId, eventId }
              })

              if (existingInvitation) {
                // Update existing invitation - preserve hasPlusOne status
                await prisma.invitation.update({
                  where: { id: existingInvitation.id },
                  data: {
                    type: type.toUpperCase().replace('_', '') as string,
                    status: 'SENT',
                    sentAt: new Date()
                    // Note: hasPlusOne is not updated here to preserve existing value
                  }
                })
              } else {
                // Create new invitation
                await prisma.invitation.create({
                  data: {
                    type: type.toUpperCase().replace('_', '') as string,
                    status: 'SENT',
                    sentAt: new Date(),
                    guestId,
                    eventId,
                    hasPlusOne: false
                  }
                })
              }

          results.push({ guestId, success: true, message: 'Email sent successfully' })
        } else {
          console.error(`Failed to send email to guest ${guestId}:`, result.error)
          results.push({ guestId, success: false, error: result.error })
        }
      } catch (error) {
        console.error(`Failed to send email to guest ${guestId}:`, error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        results.push({ guestId, success: false, error: errorMessage })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failureCount = results.length - successCount

    return NextResponse.json({
      message: `Sent ${successCount} emails successfully, ${failureCount} failed`,
      results
    })
  } catch (error) {
    console.error('Failed to send emails:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json(
      { error: `Failed to send emails: ${errorMessage}` },
      { status: 500 }
    )
  }
} 