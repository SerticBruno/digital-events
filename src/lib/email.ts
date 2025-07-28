import { Resend } from 'resend'
import { prisma } from './db'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface EmailData {
  to: string
  subject: string
  html: string
  from?: string
}

export async function sendEmail(data: EmailData) {
  try {
    const result = await resend.emails.send({
      from: data.from || 'Digital Events <noreply@yourdomain.com>',
      to: data.to,
      subject: data.subject,
      html: data.html,
    })
    return { success: true, data: result }
  } catch (error) {
    console.error('Email sending failed:', error)
    return { success: false, error }
  }
}

export async function sendSaveTheDate(guestId: string, eventId?: string) {
  const guest = await (prisma as any).guest.findUnique({
    where: { id: guestId },
    include: { 
      eventGuests: {
        include: {
          event: true
        }
      }
    }
  })

  if (!guest) throw new Error('Guest not found')

  // Find the specific event if eventId is provided, otherwise use the first event
  const eventGuest = eventId 
    ? guest.eventGuests.find((eg: any) => eg.event.id === eventId)
    : guest.eventGuests[0]

  if (!eventGuest) throw new Error('Guest not found in any event')

  const event = eventGuest.event

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1>Save the Date</h1>
      <p>Dear ${guest.firstName} ${guest.lastName},</p>
      <p>We are excited to invite you to:</p>
      <h2>${event.name}</h2>
      <p><strong>Date:</strong> ${event.date.toLocaleDateString()}</p>
      <p><strong>Location:</strong> ${event.location || 'TBA'}</p>
      <p>More details and formal invitation will follow soon.</p>
      <p>Best regards,<br>Event Team</p>
    </div>
  `

  return sendEmail({
    to: guest.email,
    subject: `Save the Date: ${event.name}`,
    html
  })
}

export async function sendInvitation(guestId: string, hasPlusOne: boolean = false, eventId?: string) {
  const guest = await (prisma as any).guest.findUnique({
    where: { id: guestId },
    include: { 
      eventGuests: {
        include: {
          event: true
        }
      }
    }
  })

  if (!guest) throw new Error('Guest not found')

  // Find the specific event if eventId is provided, otherwise use the first event
  const eventGuest = eventId 
    ? guest.eventGuests.find((eg: any) => eg.event.id === eventId)
    : guest.eventGuests[0]

  if (!eventGuest) throw new Error('Guest not found in any event')

  const event = eventGuest.event
  const responseUrl = `${process.env.NEXTAUTH_URL}/respond/${guestId}`
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1>You're Invited!</h1>
      <p>Dear ${guest.firstName} ${guest.lastName},</p>
      <p>We are delighted to invite you to:</p>
      <h2>${event.name}</h2>
      <p><strong>Date:</strong> ${event.date.toLocaleDateString()}</p>
      <p><strong>Location:</strong> ${event.location || 'TBA'}</p>
      ${event.description ? `<p>${event.description}</p>` : ''}
      <div style="margin: 30px 0;">
        <a href="${responseUrl}?response=coming" style="background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-right: 10px;">
          ${hasPlusOne ? 'I\'m Coming with Guest' : 'I\'m Coming'}
        </a>
        <a href="${responseUrl}?response=not_coming" style="background: #f44336; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
          I Can't Come
        </a>
      </div>
      <p>Best regards,<br>Event Team</p>
    </div>
  `

  return sendEmail({
    to: guest.email,
    subject: `Invitation: ${event.name}`,
    html
  })
}

export async function sendQRCode(guestId: string, eventId?: string) {
  const guest = await (prisma as any).guest.findUnique({
    where: { id: guestId },
    include: { 
      eventGuests: {
        include: {
          event: true
        }
      },
      qrCodes: {
        where: eventId ? { eventId } : undefined
      },
      invitations: {
        where: { 
          response: { in: ['COMING', 'COMING_WITH_PLUS_ONE', 'COMING_ALONE'] },
          ...(eventId && { eventId })
        }
      }
    }
  })

  if (!guest) throw new Error('Guest not found')

  // Find the specific event if eventId is provided, otherwise use the first event
  const eventGuest = eventId 
    ? guest.eventGuests.find((eg: any) => eg.event.id === eventId)
    : guest.eventGuests[0]

  if (!eventGuest) throw new Error('Guest not found in any event')

  const event = eventGuest.event
  const qrCodes = guest.qrCodes.filter((qr: any) => !qr.isUsed)
  if (qrCodes.length === 0) throw new Error('No QR codes available')

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1>Your Entry Pass</h1>
      <p>Dear ${guest.firstName} ${guest.lastName},</p>
      <p>Thank you for confirming your attendance to <strong>${event.name}</strong>.</p>
      <p>Please present this QR code at the entrance:</p>
      <div style="text-align: center; margin: 30px 0;">
        <img src="data:image/png;base64,${qrCodes[0].code}" alt="QR Code" style="max-width: 200px;" />
      </div>
      <p><strong>Event Details:</strong></p>
      <p>Date: ${event.date.toLocaleDateString()}</p>
      <p>Location: ${event.location || 'TBA'}</p>
      <p>Best regards,<br>Event Team</p>
    </div>
  `

  return sendEmail({
    to: guest.email,
    subject: `Entry Pass: ${event.name}`,
    html
  })
}

export async function sendSurvey(guestId: string, eventId?: string) {
  const guest = await (prisma as any).guest.findUnique({
    where: { id: guestId },
    include: { 
      eventGuests: {
        include: {
          event: true
        }
      }
    }
  })

  if (!guest) throw new Error('Guest not found')

  // Find the specific event if eventId is provided, otherwise use the first event
  const eventGuest = eventId 
    ? guest.eventGuests.find((eg: any) => eg.event.id === eventId)
    : guest.eventGuests[0]

  if (!eventGuest) throw new Error('Guest not found in any event')

  const event = eventGuest.event
  const surveyUrl = `${process.env.NEXTAUTH_URL}/survey/${guestId}`
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1>Event Feedback</h1>
      <p>Dear ${guest.firstName} ${guest.lastName},</p>
      <p>Thank you for attending <strong>${event.name}</strong>!</p>
      <p>We would love to hear your feedback about the event. Please take a moment to share your thoughts:</p>
      <div style="margin: 30px 0;">
        <a href="${surveyUrl}" style="background: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
          Take Survey
        </a>
      </div>
      <p>Your feedback helps us improve future events.</p>
      <p>Best regards,<br>Event Team</p>
    </div>
  `

  return sendEmail({
    to: guest.email,
    subject: `Feedback Request: ${event.name}`,
    html
  })
} 