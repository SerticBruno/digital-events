import { NextRequest, NextResponse } from 'next/server'
import { sendSaveTheDate, sendRegularInvitation, sendRegularPlusOneInvitation, sendVIPInvitation, sendVIPPlusOneInvitation, sendQRCode, sendSurvey, sendPlusOneInvitation, sendPlusOneQRCode } from '@/lib/email'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, guestIds, eventId, plusOneEmails, plusOneNames, to, subject, html } = body

    console.log('Email send request received:', { type, guestIds, eventId, plusOneEmails: !!plusOneEmails, plusOneNames: !!plusOneNames })

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
        console.log(`Processing guest ${i + 1}/${guestIds.length}: ${guestId}`)
        
        // Add delay between requests (500ms = 2 requests per second)
        if (i > 0) {
          await delay(500)
        }

        // Validate guest exists before attempting to send email
        const guest = await prisma.guest.findUnique({
          where: { id: guestId },
          select: { id: true, email: true, firstName: true, lastName: true }
        })

        if (!guest) {
          console.error(`Guest not found: ${guestId}`)
          results.push({ 
            guestId, 
            success: false, 
            error: `Guest not found: ${guestId}` 
          })
          continue
        }

        console.log(`Found guest: ${guest.firstName} ${guest.lastName} (${guest.email})`)

        // Validate event exists
        const event = await prisma.event.findUnique({
          where: { id: eventId },
          select: { id: true, name: true }
        })

        if (!event) {
          console.error(`Event not found: ${eventId}`)
          results.push({ 
            guestId, 
            success: false, 
            error: `Event not found: ${eventId}` 
          })
          continue
        }

        console.log(`Found event: ${event.name}`)

        // Validate guest is associated with event
        const eventGuest = await prisma.eventGuest.findUnique({
          where: {
            eventId_guestId: {
              eventId: eventId,
              guestId: guestId
            }
          }
        })

        if (!eventGuest) {
          console.error(`Guest ${guestId} is not associated with event ${eventId}`)
          results.push({ 
            guestId, 
            success: false, 
            error: `Guest is not associated with this event` 
          })
          continue
        }

        let result

        switch (type) {
          case 'save_the_date':
            result = await sendSaveTheDate(guestId, eventId)
            break
          case 'regular_invitation':
            result = await sendRegularInvitation(guestId, eventId)
            break
          case 'regular_plus_one_invitation':
            result = await sendRegularPlusOneInvitation(guestId, eventId)
            break
          case 'vip_invitation':
            result = await sendVIPInvitation(guestId, eventId)
            break
          case 'vip_plus_one_invitation':
            result = await sendVIPPlusOneInvitation(guestId, eventId)
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

        console.log(`Email send result for ${guestId}:`, result)

        if (result.success) {
          // Handle invitation status updates based on email type
          if (type === 'save_the_date') {
            // For save-the-date emails, create or update a SAVE_THE_DATE invitation
            const existingSaveTheDateInvitation = await prisma.invitation.findFirst({
              where: { 
                guestId, 
                eventId,
                type: 'SAVETHEDATE'
              }
            })

            if (existingSaveTheDateInvitation) {
              // Update existing save-the-date invitation
              await prisma.invitation.update({
                where: { id: existingSaveTheDateInvitation.id },
                data: {
                  status: 'SENT',
                  sentAt: new Date()
                }
              })
            } else {
              // Create new save-the-date invitation
              await prisma.invitation.create({
                data: {
                  type: 'SAVETHEDATE',
                  status: 'SENT',
                  sentAt: new Date(),
                  guestId,
                  eventId,
                  hasPlusOne: false
                }
              })
            }
          } else if (type === 'regular_invitation' || type === 'regular_plus_one_invitation' || type === 'vip_invitation' || type === 'vip_plus_one_invitation') {
            // Update invitation status for all types of invitation emails
            const existingInvitation = await prisma.invitation.findFirst({
              where: { 
                guestId, 
                eventId,
                type: 'INVITATION'
              }
            })

            if (existingInvitation) {
              // Update existing invitation
              await prisma.invitation.update({
                where: { id: existingInvitation.id },
                data: {
                  status: 'SENT',
                  sentAt: new Date()
                  // Don't set hasPlusOne here - it should only be set when guest confirms they're bringing a plus-one
                }
              })
            } else {
              // Create new invitation
              await prisma.invitation.create({
                data: {
                  type: 'INVITATION',
                  status: 'SENT',
                  sentAt: new Date(),
                  guestId,
                  eventId,
                  hasPlusOne: false // Always false when sending invitations - only set to true when guest confirms plus-one
                }
              })
            }
            
            // Note: We don't set canHavePlusOne here because it should only be set when the guest actually confirms they're bringing a plus-one
            // The canHavePlusOne field will be updated in the respond API when the guest submits their response
          }
          // For other email types (qr_code, survey, etc.), don't update invitation status

          results.push({ guestId, success: true, message: 'Email sent successfully' })
                } else {
          console.error(`Failed to send email to guest ${guestId}:`, result.error)
          const errorMessage = typeof result.error === 'string' ? result.error :
                              JSON.stringify(result.error)
          results.push({ guestId, success: false, error: errorMessage })
        }
      } catch (error) {
        console.error(`Failed to send email to guest ${guestId}:`, error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        const errorStack = error instanceof Error ? error.stack : undefined
        console.error(`Error stack for guest ${guestId}:`, errorStack)
        results.push({ 
          guestId, 
          success: false, 
          error: errorMessage,
          errorDetails: errorStack ? errorStack.split('\n').slice(0, 3).join('\n') : undefined
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failureCount = results.length - successCount

    console.log(`Email sending completed. Success: ${successCount}, Failed: ${failureCount}`)

    return NextResponse.json({
      message: `Sent ${successCount} emails successfully, ${failureCount} failed`,
      results
    })
  } catch (error) {
    console.error('Failed to send emails:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('Error stack:', errorStack)
    return NextResponse.json(
      { 
        error: `Failed to send emails: ${errorMessage}`,
        errorDetails: errorStack ? errorStack.split('\n').slice(0, 3).join('\n') : undefined
      },
      { status: 500 }
    )
  }
} 