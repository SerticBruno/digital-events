import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateQRCode } from '@/lib/qr'
import { sendEmail } from '@/lib/email'

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

    // Get all guests for the event with their invitation responses
    const guestsWithResponses = await prisma.$queryRaw<Array<{
      id: string
      firstName: string
      lastName: string
      email: string
      company: string | null
      isVip: boolean
      response: string | null
      hasPlusOne: boolean
      plusOneName: string | null
      plusOneEmail: string | null
    }>>`
      SELECT 
        g.id,
        g."firstName",
        g."lastName",
        g.email,
        g.company,
        g."isVip",
        i.response,
        i."hasPlusOne",
        i."plusOneName",
        i."plusOneEmail"
      FROM guests g
      JOIN event_guests eg ON g.id = eg."guestId"
      LEFT JOIN invitations i ON g.id = i."guestId" AND eg."eventId" = i."eventId" AND i.type = 'INVITATION'
      WHERE eg."eventId" = ${eventId}
      ORDER BY g."lastName", g."firstName"
    `

    const results = []
    let totalQRCodesGenerated = 0
    let totalEmailsSent = 0

    console.log(`Processing ${guestsWithResponses.length} guests for event ${eventId}`)

    for (const guest of guestsWithResponses) {
      try {
        console.log(`Processing guest: ${guest.firstName} ${guest.lastName}, response: ${guest.response}`)
        
        // Skip guests who haven't responded
        if (!guest.response) {
          console.log(`Skipping guest ${guest.firstName} ${guest.lastName} - no response`)
          results.push({
            guestId: guest.id,
            guestName: `${guest.firstName} ${guest.lastName}`,
            status: 'skipped',
            reason: 'No response received'
          })
          continue
        }

        // Skip guests who responded "NOT_COMING"
        if (guest.response === 'NOT_COMING') {
          console.log(`Skipping guest ${guest.firstName} ${guest.lastName} - declined invitation`)
          results.push({
            guestId: guest.id,
            guestName: `${guest.firstName} ${guest.lastName}`,
            status: 'skipped',
            reason: 'Guest declined invitation'
          })
          continue
        }

        // Handle different response scenarios
        if (guest.response === 'COMING') {
          console.log(`Processing guest ${guest.firstName} ${guest.lastName} - coming alone`)
          // Guest is coming alone - check if QR code already exists
          const qrType: 'REGULAR' | 'VIP' = guest.isVip ? 'VIP' : 'REGULAR'
          
          // Check if guest already has a QR code for this event
          const existingQRCodes = await prisma.$queryRaw<Array<{
            code: string;
            status: string;
          }>>`
            SELECT code, status
            FROM qr_codes
            WHERE "guestId" = ${guest.id}
            AND "eventId" = ${eventId}
            AND type = ${qrType}
          `
          
          if (existingQRCodes.length > 0) {
            // QR code already exists, just update it to SENT if it's not already sent
            const existingQR = existingQRCodes[0]
            console.log(`Found existing QR code for guest ${guest.id} with status: ${existingQR.status}`)
            if (existingQR.status === 'GENERATED') {
              const { updateQRCodeStatus } = await import('@/lib/qr')
              console.log(`Updating existing QR code status from GENERATED to SENT for guest ${guest.id}`)
              const updateResult = await updateQRCodeStatus(guest.id, eventId, 'SENT')
              if (updateResult.success) {
                console.log(`Successfully updated existing QR code status to SENT for guest ${guest.id}`)
              } else {
                console.warn(`Failed to update existing QR code status for guest ${guest.id}:`, updateResult.error)
              }
            }
            
            // Send email with existing QR code
            const emailResult = await sendQRCodeEmail(
              guest.email,
              `${guest.firstName} ${guest.lastName}`,
              existingQR.code,
              qrType,
              eventId,
              true,
              undefined
            )
            
            if (emailResult.success) {
              totalEmailsSent++
              results.push({
                guestId: guest.id,
                guestName: `${guest.firstName} ${guest.lastName}`,
                status: 'success',
                qrCodesGenerated: 0,
                emailsSent: 1,
                reason: 'Used existing QR code'
              })
            } else {
              results.push({
                guestId: guest.id,
                guestName: `${guest.firstName} ${guest.lastName}`,
                status: 'failed',
                reason: 'Failed to send email with existing QR code'
              })
            }
            continue
          }
          
          // Generate new QR code if none exists
          const qrResult = await generateQRCode(guest.id, eventId, qrType)
          
          if (!qrResult.success) {
            throw new Error(qrResult.error || 'Failed to generate QR code')
          }

          totalQRCodesGenerated++

          // Directly update the QR code status to SENT since we're sending it via email
          const { updateQRCodeStatus } = await import('@/lib/qr')
          console.log(`Updating QR code status to SENT for guest ${guest.id} in event ${eventId}`)
          const statusUpdateResult = await updateQRCodeStatus(guest.id, eventId, 'SENT')
          
          if (statusUpdateResult.success) {
            console.log(`Successfully updated QR code status to SENT for guest ${guest.id}`)
          } else {
            console.warn(`Failed to update QR code status for guest ${guest.id}:`, statusUpdateResult.error)
          }

          // Send email with QR code
          const emailResult = await sendQRCodeEmail(
            guest.email,
            `${guest.firstName} ${guest.lastName}`,
            qrResult.code!,
            qrType,
            eventId,
            true,
            undefined
          )

          if (emailResult.success) {
            totalEmailsSent++
            results.push({
              guestId: guest.id,
              guestName: `${guest.firstName} ${guest.lastName}`,
              status: 'success',
              qrCodesGenerated: 1,
              emailsSent: 1
            })
          } else {
            results.push({
              guestId: guest.id,
              guestName: `${guest.firstName} ${guest.lastName}`,
              status: 'failed',
              reason: 'Failed to send email'
            })
          }
        } else if (guest.response === 'COMING_WITH_PLUS_ONE') {
          console.log(`Processing guest ${guest.firstName} ${guest.lastName} - coming with plus-one`)
          // Guest is coming with plus-one - check for existing QR codes first
          const qrType: 'REGULAR' | 'VIP' = guest.isVip ? 'VIP' : 'REGULAR'
          
          // Check if main guest already has a QR code for this event
          const existingMainGuestQRCodes = await prisma.$queryRaw<Array<{
            code: string;
            status: string;
          }>>`
            SELECT code, status
            FROM qr_codes
            WHERE "guestId" = ${guest.id}
            AND "eventId" = ${eventId}
            AND type = ${qrType}
          `
          
          let mainGuestQRCode = null
          let mainGuestQRGenerated = false
          
                      if (existingMainGuestQRCodes.length > 0) {
              // Use existing QR code
              mainGuestQRCode = existingMainGuestQRCodes[0].code
              if (existingMainGuestQRCodes[0].status === 'GENERATED') {
                const { updateQRCodeStatus } = await import('@/lib/qr')
                await updateQRCodeStatus(guest.id, eventId, 'SENT')
              }
          } else {
            // Generate new QR code for main guest
            const mainGuestQRResult = await generateQRCode(guest.id, eventId, qrType)
            
            if (!mainGuestQRResult.success) {
              throw new Error(mainGuestQRResult.error || 'Failed to generate main guest QR code')
            }

            mainGuestQRCode = mainGuestQRResult.code
            mainGuestQRGenerated = true
            totalQRCodesGenerated++
          }

          let plusOneQRCode = null
          let plusOneQRGenerated = false
          
          // Generate QR code for plus-one (if plus-one email exists)
          if (guest.plusOneEmail && guest.plusOneName) {
            console.log(`Generating plus-one QR code for ${guest.plusOneName} (${guest.plusOneEmail}) for guest ${guest.firstName} ${guest.lastName}`)
            
            // Find the plus-one guest by email
            const plusOneGuests = await prisma.$queryRaw<Array<{
              id: string;
            }>>`
              SELECT id
              FROM guests
              WHERE email = ${guest.plusOneEmail}
            `
            
            if (plusOneGuests.length > 0) {
              const plusOneGuestId = plusOneGuests[0].id
              
              // Check if plus-one guest already has a QR code for this event
              const existingPlusOneQRCodes = await prisma.$queryRaw<Array<{
                code: string;
                status: string;
              }>>`
                SELECT code, status
                FROM qr_codes
                WHERE "guestId" = ${plusOneGuestId}
                AND "eventId" = ${eventId}
                AND type = ${qrType}
              `
              
              if (existingPlusOneQRCodes.length > 0) {
                // Use existing QR code
                plusOneQRCode = existingPlusOneQRCodes[0].code
                if (existingPlusOneQRCodes[0].status === 'GENERATED') {
                  const { updateQRCodeStatus } = await import('@/lib/qr')
                  await updateQRCodeStatus(plusOneGuestId, eventId, 'SENT')
                }
              } else {
                // Generate new QR code for the plus-one guest using their own ID
                const plusOneQRResult = await generateQRCode(plusOneGuestId, eventId, qrType)
                
                if (plusOneQRResult.success) {
                  plusOneQRCode = plusOneQRResult.code
                  plusOneQRGenerated = true
                  totalQRCodesGenerated++
                  
                  // Directly update the plus-one's QR code status to SENT since we're sending it via email
                  const { updateQRCodeStatus } = await import('@/lib/qr')
                  const plusOneStatusUpdateResult = await updateQRCodeStatus(plusOneGuestId, eventId, 'SENT')
                  
                  if (!plusOneStatusUpdateResult.success) {
                    console.warn(`Failed to update QR code status for plus-one guest ${plusOneGuestId}:`, plusOneStatusUpdateResult.error)
                  }
                } else {
                  console.error(`Failed to generate plus-one QR code for ${guest.plusOneName}:`, plusOneQRResult.error)
                }
              }
            } else {
              console.error(`Plus-one guest not found for email: ${guest.plusOneEmail}`)
            }
          }

          // Ensure QR codes are activated if we generated new ones
          if (mainGuestQRGenerated) {
            const { updateQRCodeStatus } = await import('@/lib/qr')
            const statusUpdateResult = await updateQRCodeStatus(guest.id, eventId, 'SENT')
            
            if (!statusUpdateResult.success) {
              console.warn(`Failed to update QR code status for guest ${guest.id}:`, statusUpdateResult.error)
            }
          }

          // Send single email with both QR codes to main guest
          const emailResult = await sendQRCodeEmailWithPlusOne(
            guest.email,
            `${guest.firstName} ${guest.lastName}`,
            mainGuestQRCode!,
            plusOneQRCode || null,
            qrType,
            eventId,
            guest.plusOneName || null,
            guest.plusOneEmail || null
          )

          if (emailResult.success) {
            totalEmailsSent++
            results.push({
              guestId: guest.id,
              guestName: `${guest.firstName} ${guest.lastName}`,
              email: guest.email,
              status: 'success',
              qrCode: mainGuestQRCode,
              qrType: qrType,
              isMainGuest: true,
              plusOneQRCode: plusOneQRCode
            })
          } else {
            results.push({
              guestId: guest.id,
              guestName: `${guest.firstName} ${guest.lastName}`,
              email: guest.email,
              status: 'qr_generated_email_failed',
              qrCode: mainGuestQRCode,
              qrType: qrType,
              error: emailResult.error,
              plusOneQRCode: plusOneQRCode
            })
          }
          
          continue // Skip the regular QR generation loop for this guest
        } else {
          // Handle any other response types
          console.log(`Unknown response type for guest ${guest.firstName} ${guest.lastName}: ${guest.response}`)
          results.push({
            guestId: guest.id,
            guestName: `${guest.firstName} ${guest.lastName}`,
            status: 'skipped',
            reason: `Unknown response type: ${guest.response}`
          })
        }


      } catch (error) {
        console.error(`Failed to process guest ${guest.firstName} ${guest.lastName}:`, error)
        results.push({
          guestId: guest.id,
          guestName: `${guest.firstName} ${guest.lastName}`,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    const successCount = results.filter(r => r.status === 'success').length
    const skippedCount = results.filter(r => r.status === 'skipped').length
    const failedCount = results.filter(r => r.status === 'failed').length
    const qrGeneratedEmailFailedCount = results.filter(r => r.status === 'qr_generated_email_failed').length

    return NextResponse.json({
      message: `Processed ${guestsWithResponses.length} guests. Generated ${totalQRCodesGenerated} QR codes, sent ${totalEmailsSent} emails.`,
      summary: {
        totalGuests: guestsWithResponses.length,
        qrCodesGenerated: totalQRCodesGenerated,
        emailsSent: totalEmailsSent,
        successCount,
        skippedCount,
        failedCount,
        qrGeneratedEmailFailedCount
      },
      results
    })
  } catch (error) {
    console.error('Failed to send QR codes:', error)
    return NextResponse.json(
      { error: 'Failed to send QR codes' },
      { status: 500 }
    )
  }
}

async function sendQRCodeEmailWithPlusOne(
  email: string,
  guestName: string,
  mainGuestQRCode: string,
  plusOneQRCode: string | null,
  qrType: string,
  eventId: string,
  plusOneName: string | null,
  plusOneEmail: string | null
) {
  try {
    // Get event details
    const eventData = await prisma.$queryRaw<Array<{
      name: string
      description: string | null
      date: string
      location: string | null
    }>>`
      SELECT name, description, date, location
      FROM events
      WHERE id = ${eventId}
    `

    if (eventData.length === 0) {
      throw new Error('Event not found')
    }

    const event = eventData[0]
    const mainGuestQRImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(mainGuestQRCode)}`
    
    // Create email content
    let subject = `Entry Pass - ${event.name}`
    let greeting = `Dear ${guestName},`
    let description = 'Thank you for confirming your attendance. Please find your QR codes below:'

    if (qrType === 'VIP') {
      subject = `VIP Entry Pass - ${event.name}`
      description = 'Thank you for confirming your VIP attendance. Please find your VIP QR codes below:'
    }

    let qrCodesSection = `
      <!-- Main Guest QR Code -->
      <div style="text-align: center; margin: 30px 0;">
        <h3 style="color: #2d3748; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">Your QR Code</h3>
        <div style="background: #ffffff; border: 2px solid #e2e8f0; border-radius: 12px; padding: 30px; display: inline-block; margin: 20px 0;">
          <img src="${mainGuestQRImageUrl}" alt="QR Code" style="width: 200px; height: 200px; display: block; margin: 0 auto;">
          <p style="color: #718096; font-size: 12px; margin: 10px 0 0 0; font-family: monospace;">${mainGuestQRCode}</p>
        </div>
      </div>
    `

    // Add plus-one QR code if available
    if (plusOneQRCode && plusOneName) {
      const plusOneQRImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(plusOneQRCode)}`
      qrCodesSection += `
        <!-- Plus-One QR Code -->
        <div style="text-align: center; margin: 30px 0;">
          <h3 style="color: #2d3748; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">QR Code for ${plusOneName}</h3>
          <div style="background: #ffffff; border: 2px solid #e2e8f0; border-radius: 12px; padding: 30px; display: inline-block; margin: 20px 0;">
            <img src="${plusOneQRImageUrl}" alt="QR Code" style="width: 200px; height: 200px; display: block; margin: 0 auto;">
            <p style="color: #718096; font-size: 12px; margin: 10px 0 0 0; font-family: monospace;">${plusOneQRCode}</p>
          </div>
        </div>
      `
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Entry Pass</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 300; letter-spacing: 2px;">
              ${qrType === 'VIP' ? 'VIP ENTRY PASS' : 'ENTRY PASS'}
            </h1>
            <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your digital tickets for the event</p>
          </div>

          <!-- Content -->
          <div style="padding: 40px 30px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h2 style="color: #2d3748; margin: 0 0 20px 0; font-size: 28px; font-weight: 600;">${event.name}</h2>
              <div style="width: 60px; height: 3px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); margin: 0 auto;"></div>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                ${greeting}
              </p>
              <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                ${description}
              </p>
              
              ${qrCodesSection}
            </div>

            <!-- Event Details -->
            <div style="background: #f7fafc; border-radius: 8px; padding: 25px; margin: 30px 0;">
              <h3 style="color: #2d3748; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">Event Details</h3>
              <div style="display: flex; align-items: center; margin-bottom: 10px;">
                <span style="color: #4a5568; font-weight: 500; min-width: 80px;">Date:</span>
                <span style="color: #2d3748;">${new Date(event.date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</span>
              </div>
              ${event.location ? `
                <div style="display: flex; align-items: center; margin-bottom: 10px;">
                  <span style="color: #4a5568; font-weight: 500; min-width: 80px;">Location:</span>
                  <span style="color: #2d3748;">${event.location}</span>
                </div>
              ` : ''}
              ${event.description ? `
                <div style="margin-top: 15px;">
                  <span style="color: #4a5568; font-weight: 500;">Description:</span>
                  <p style="color: #2d3748; margin: 5px 0 0 0; line-height: 1.5;">${event.description}</p>
                </div>
              ` : ''}
            </div>

            <!-- Instructions -->
            <div style="background: #edf2f7; border-radius: 8px; padding: 20px; margin: 30px 0;">
              <h4 style="color: #2d3748; margin: 0 0 10px 0; font-size: 16px; font-weight: 600;">Instructions</h4>
              <ul style="color: #4a5568; margin: 0; padding-left: 20px; line-height: 1.6;">
                <li>Present the appropriate QR code at the entrance</li>
                <li>Keep this email handy for easy access</li>
                <li>Each QR code is unique and cannot be shared</li>
                ${plusOneQRCode ? '<li>Share the plus-one QR code with your guest</li>' : ''}
                ${qrType === 'VIP' ? '<li>VIP guests will receive special treatment and access</li>' : ''}
              </ul>
            </div>
          </div>

          <!-- Footer -->
          <div style="background: #2d3748; color: #a0aec0; text-align: center; padding: 20px; font-size: 14px;">
            <p style="margin: 0;">This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `

    await sendEmail({
      to: email,
      subject,
      html
    })

    return { success: true }
  } catch (error) {
    console.error('Failed to send QR code email with plus-one:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

async function sendQRCodeEmail(
  email: string,
  guestName: string,
  qrCode: string,
  qrType: string,
  eventId: string,
  isMainGuest: boolean,
  mainGuestName: string | undefined
) {
  try {
    // Get event details
    const eventData = await prisma.$queryRaw<Array<{
      name: string
      description: string | null
      date: string
      location: string | null
    }>>`
      SELECT name, description, date, location
      FROM events
      WHERE id = ${eventId}
    `

    if (eventData.length === 0) {
      throw new Error('Event not found')
    }

    const event = eventData[0]
    const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode)}`

    // Create email content based on guest type
    let subject = `Entry Pass - ${event.name}`
    let greeting = `Dear ${guestName},`
    let description = 'Thank you for confirming your attendance. Please present this QR code at the entrance:'

    if (!isMainGuest && mainGuestName) {
      subject = `Entry Pass - ${event.name} (Guest of ${mainGuestName})`
      greeting = `Dear ${guestName},`
      description = `You are attending as a guest of ${mainGuestName}. Please present this QR code at the entrance:`
    }

    if (qrType === 'VIP') {
      subject = `VIP Entry Pass - ${event.name}`
      description = 'Thank you for confirming your VIP attendance. Please present this VIP QR code at the entrance:'
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Entry Pass</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 300; letter-spacing: 2px;">
              ${qrType === 'VIP' ? 'VIP ENTRY PASS' : 'ENTRY PASS'}
            </h1>
            <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your digital ticket for the event</p>
          </div>

          <!-- Content -->
          <div style="padding: 40px 30px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h2 style="color: #2d3748; margin: 0 0 20px 0; font-size: 28px; font-weight: 600;">${event.name}</h2>
              <div style="width: 60px; height: 3px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); margin: 0 auto;"></div>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                ${greeting}
              </p>
              <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                ${description}
              </p>
              
              <!-- QR Code -->
              <div style="background: #ffffff; border: 2px solid #e2e8f0; border-radius: 12px; padding: 30px; display: inline-block; margin: 20px 0;">
                <img src="${qrCodeImageUrl}" alt="QR Code" style="width: 200px; height: 200px; display: block; margin: 0 auto;">
                <p style="color: #718096; font-size: 12px; margin: 10px 0 0 0; font-family: monospace;">${qrCode}</p>
              </div>
            </div>

            <!-- Event Details -->
            <div style="background: #f7fafc; border-radius: 8px; padding: 25px; margin: 30px 0;">
              <h3 style="color: #2d3748; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">Event Details</h3>
              <div style="display: flex; align-items: center; margin-bottom: 10px;">
                <span style="color: #4a5568; font-weight: 500; min-width: 80px;">Date:</span>
                <span style="color: #2d3748;">${new Date(event.date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</span>
              </div>
              ${event.location ? `
                <div style="display: flex; align-items: center; margin-bottom: 10px;">
                  <span style="color: #4a5568; font-weight: 500; min-width: 80px;">Location:</span>
                  <span style="color: #2d3748;">${event.location}</span>
                </div>
              ` : ''}
              ${event.description ? `
                <div style="margin-top: 15px;">
                  <span style="color: #4a5568; font-weight: 500;">Description:</span>
                  <p style="color: #2d3748; margin: 5px 0 0 0; line-height: 1.5;">${event.description}</p>
                </div>
              ` : ''}
            </div>

            <!-- Instructions -->
            <div style="background: #edf2f7; border-radius: 8px; padding: 20px; margin: 30px 0;">
              <h4 style="color: #2d3748; margin: 0 0 10px 0; font-size: 16px; font-weight: 600;">Instructions</h4>
              <ul style="color: #4a5568; margin: 0; padding-left: 20px; line-height: 1.6;">
                <li>Present this QR code at the entrance</li>
                <li>Keep this email handy for easy access</li>
                <li>This QR code is unique to you and cannot be shared</li>
                ${qrType === 'VIP' ? '<li>VIP guests will receive special treatment and access</li>' : ''}
              </ul>
            </div>
          </div>

          <!-- Footer -->
          <div style="background: #2d3748; color: #a0aec0; text-align: center; padding: 20px; font-size: 14px;">
            <p style="margin: 0;">This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `

    await sendEmail({
      to: email,
      subject,
      html
    })

    return { success: true }
  } catch (error) {
    console.error('Failed to send QR code email:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
} 