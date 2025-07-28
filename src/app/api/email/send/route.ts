import { NextRequest, NextResponse } from 'next/server'
import { sendSaveTheDate, sendInvitation, sendQRCode, sendSurvey } from '@/lib/email'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, guestIds, hasPlusOne } = body

    if (!type || !guestIds || !Array.isArray(guestIds)) {
      return NextResponse.json(
        { error: 'Type and guest IDs array are required' },
        { status: 400 }
      )
    }

    const results = []

    for (const guestId of guestIds) {
      try {
        let result

        switch (type) {
          case 'save_the_date':
            result = await sendSaveTheDate(guestId)
            break
          case 'invitation':
            result = await sendInvitation(guestId, hasPlusOne)
            break
          case 'qr_code':
            result = await sendQRCode(guestId)
            break
          case 'survey':
            result = await sendSurvey(guestId)
            break
          default:
            throw new Error(`Unknown email type: ${type}`)
        }

        if (result.success) {
          // Update invitation status in database
          await prisma.invitation.create({
            data: {
              type: type.toUpperCase().replace('_', '') as any,
              status: 'SENT',
              sentAt: new Date(),
              guestId,
              eventId: (await prisma.guest.findUnique({ where: { id: guestId } }))?.eventId || ''
            }
          })

          results.push({ guestId, success: true })
        } else {
          results.push({ guestId, success: false, error: result.error })
        }
      } catch (error) {
        console.error(`Failed to send email to guest ${guestId}:`, error)
        results.push({ guestId, success: false, error: error.message })
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
    return NextResponse.json(
      { error: 'Failed to send emails' },
      { status: 500 }
    )
  }
} 