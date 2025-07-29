import { prisma } from '@/lib/db'

export interface EmailData {
  to: string
  subject: string
  html: string
  from?: string
}





export async function sendTestEmail(to: string) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Test Email</title>
    </head>
    <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif;">
      <h1>Test Email</h1>
      <p>This is a test email to verify the email functionality is working correctly.</p>
      <p>If you received this email, the email system is configured properly.</p>
    </body>
    </html>
  `

  return sendEmail({ to, subject: 'Test Email', html })
}

export async function sendEmail(data: EmailData) {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
              body: JSON.stringify({
          from: process.env.FROM_EMAIL || 'onboarding@resend.dev',
          to: [data.to],
          subject: data.subject,
          html: data.html,
        }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(error)
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to send email:', error)
    return { success: false, error }
  }
}

export async function sendSaveTheDate(guestId: string, eventId?: string) {
  // Get guest data using raw SQL
  const guests = await prisma.$queryRaw<Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    company: string | null;
    isVip: boolean;
  }>>`
    SELECT id, "firstName", "lastName", email, company, "isVip"
    FROM guests
    WHERE id = ${guestId}
  `

  if (guests.length === 0) throw new Error('Guest not found')
  const guest = guests[0]

  // Get event data using raw SQL
  let eventGuests: Array<{
    eventId: string;
    eventName: string;
    eventDescription: string | null;
    eventDate: string;
    eventLocation: string | null;
    eventMaxGuests: number | null;
  }> = []

  if (eventId) {
    eventGuests = await prisma.$queryRaw`
      SELECT 
        e.id as eventId,
        e.name as eventName,
        e.description as eventDescription,
        e.date as eventDate,
        e.location as eventLocation,
        e."maxGuests" as eventMaxGuests
      FROM event_guests eg
      JOIN events e ON eg.eventId = e.id
      WHERE eg.guestId = ${guestId}
      AND e.id = ${eventId}
      ORDER BY e.date ASC
      LIMIT 1
    `
  } else {
    eventGuests = await prisma.$queryRaw`
      SELECT 
        e.id as eventId,
        e.name as eventName,
        e.description as eventDescription,
        e.date as eventDate,
        e.location as eventLocation,
        e."maxGuests" as eventMaxGuests
      FROM event_guests eg
      JOIN events e ON eg.eventId = e.id
      WHERE eg.guestId = ${guestId}
      ORDER BY e.date ASC
      LIMIT 1
    `
  }

  if (eventGuests.length === 0) throw new Error('Guest not found in any event')
  const eventData = eventGuests[0]

  const event = {
    id: eventData.eventId,
    name: eventData.eventName,
    description: eventData.eventDescription,
    date: new Date(eventData.eventDate),
    location: eventData.eventLocation,
    maxGuests: eventData.eventMaxGuests
  }
  const eventDate = new Date(event.date)

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Save the Date</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 300; letter-spacing: 2px;">SAVE THE DATE</h1>
          <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">You're invited to a special event</p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #2d3748; margin: 0 0 20px 0; font-size: 28px; font-weight: 600;">${event.name}</h2>
            <div style="width: 60px; height: 3px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); margin: 0 auto;"></div>
          </div>

          <div style="background-color: #f7fafc; border-radius: 12px; padding: 30px; margin: 30px 0; text-align: center;">
            <div style="font-size: 48px; color: #667eea; margin-bottom: 10px;">📅</div>
            <h3 style="color: #2d3748; margin: 0 0 15px 0; font-size: 24px; font-weight: 600;">
              ${eventDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </h3>
            ${event.location ? `
              <p style="color: #4a5568; margin: 0; font-size: 18px;">
                📍 ${event.location}
              </p>
            ` : ''}
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              Dear <strong>${guest.firstName} ${guest.lastName}</strong>,
            </p>
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              We are excited to invite you to this special event. Please save this date in your calendar.
            </p>
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0;">
              A formal invitation with more details will follow soon.
            </p>
          </div>

          <div style="text-align: center; margin: 40px 0;">
            <div style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 15px 30px; border-radius: 25px; color: #ffffff; font-weight: 600; font-size: 16px;">
              We look forward to seeing you!
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #2d3748; padding: 30px; text-align: center;">
          <p style="color: #a0aec0; margin: 0; font-size: 14px;">
            Best regards,<br>
            <strong style="color: #ffffff;">Event Team</strong>
          </p>
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #4a5568;">
            <p style="color: #a0aec0; margin: 0; font-size: 12px;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `

  return sendEmail({
    to: guest.email,
    subject: `Save the Date: ${event.name}`,
    html
  })
}

export async function sendRegularInvitation(guestId: string, eventId?: string) {
  // Get guest data using raw SQL
  const guests = await prisma.$queryRaw<Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    company: string | null;
    isVip: boolean;
  }>>`
    SELECT id, "firstName", "lastName", email, company, "isVip"
    FROM guests
    WHERE id = ${guestId}
  `

  if (guests.length === 0) throw new Error('Guest not found')
  const guest = guests[0]

  // Get event data using raw SQL
  let eventGuests: Array<{
    eventId: string;
    eventName: string;
    eventDescription: string | null;
    eventDate: string;
    eventLocation: string | null;
    eventMaxGuests: number | null;
  }> = []

  if (eventId) {
    eventGuests = await prisma.$queryRaw`
      SELECT 
        e.id as eventId,
        e.name as eventName,
        e.description as eventDescription,
        e.date as eventDate,
        e.location as eventLocation,
        e."maxGuests" as eventMaxGuests
      FROM event_guests eg
      JOIN events e ON eg.eventId = e.id
      WHERE eg.guestId = ${guestId}
      AND e.id = ${eventId}
      ORDER BY e.date ASC
      LIMIT 1
    `
  } else {
    eventGuests = await prisma.$queryRaw`
      SELECT 
        e.id as eventId,
        e.name as eventName,
        e.description as eventDescription,
        e.date as eventDate,
        e.location as eventLocation,
        e."maxGuests" as eventMaxGuests
      FROM event_guests eg
      JOIN events e ON eg.eventId = e.id
      WHERE eg.guestId = ${guestId}
      ORDER BY e.date ASC
      LIMIT 1
    `
  }

  if (eventGuests.length === 0) throw new Error('Guest not found in any event')
  const eventData = eventGuests[0]

  const event = {
    id: eventData.eventId,
    name: eventData.eventName,
    description: eventData.eventDescription,
    date: new Date(eventData.eventDate),
    location: eventData.eventLocation,
    maxGuests: eventData.eventMaxGuests
  }
  // Use TEST_URL for QR codes if available, otherwise fall back to NEXTAUTH_URL
  const baseUrl = process.env.TEST_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const responseUrl = `${baseUrl}/respond/${guestId}?eventId=${event.id}`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>You're Invited!</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 300; letter-spacing: 2px;">YOU'RE INVITED!</h1>
          <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Join us for a special event</p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #2d3748; margin: 0 0 20px 0; font-size: 28px; font-weight: 600;">${event.name}</h2>
            <div style="width: 60px; height: 3px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); margin: 0 auto;"></div>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              Dear <strong>${guest.firstName} ${guest.lastName}</strong>,
            </p>
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
              We are delighted to invite you to this special event. Please let us know if you can attend.
            </p>
          </div>

          <!-- Event Details -->
          <div style="background-color: #edf2f7; border-radius: 12px; padding: 25px; margin: 30px 0;">
            <h3 style="color: #2d3748; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">Event Details</h3>
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
              <span style="color: #667eea; font-size: 18px; margin-right: 10px;">${event.date.toLocaleDateString('en-US', { month: 'short' })} ${event.date.getDate()} 📅</span>
              <span style="color: #4a5568; font-size: 16px;">${event.date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</span>
            </div>
            ${event.location ? `
              <div style="display: flex; align-items: center;">
                <span style="color: #667eea; font-size: 18px; margin-right: 10px;">📍</span>
                <span style="color: #4a5568; font-size: 16px;">${event.location}</span>
              </div>
            ` : ''}
          </div>

          <!-- Response Buttons -->
          <div style="text-align: center; margin: 40px 0;">
            <div style="margin-bottom: 20px;">
              <a href="${responseUrl}&response=coming" style="background: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; margin: 0 10px 10px 0;">
                I'm Coming
              </a>
              <a href="${responseUrl}&response=not_coming" style="background: #f44336; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; margin: 0 10px 10px 0;">
                I Can't Come
              </a>
            </div>
          </div>

          <div style="text-align: center; margin: 40px 0;">
            <div style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 15px 30px; border-radius: 25px; color: #ffffff; font-weight: 600; font-size: 16px;">
              We look forward to seeing you!
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #2d3748; padding: 30px; text-align: center;">
          <p style="color: #a0aec0; margin: 0; font-size: 14px;">
            Best regards,<br>
            <strong style="color: #ffffff;">Event Team</strong>
          </p>
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #4a5568;">
            <p style="color: #a0aec0; margin: 0; font-size: 12px;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `

  return sendEmail({
    to: guest.email,
    subject: `Invitation: ${event.name}`,
    html
  })
}

export async function sendRegularPlusOneInvitation(guestId: string, eventId?: string) {
  // Get guest data using raw SQL
  const guests = await prisma.$queryRaw<Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    company: string | null;
    isVip: boolean;
  }>>`
    SELECT id, "firstName", "lastName", email, company, "isVip"
    FROM guests
    WHERE id = ${guestId}
  `

  if (guests.length === 0) throw new Error('Guest not found')
  const guest = guests[0]

  // Get event data using raw SQL
  let eventGuests: Array<{
    eventId: string;
    eventName: string;
    eventDescription: string | null;
    eventDate: string;
    eventLocation: string | null;
    eventMaxGuests: number | null;
  }> = []

  if (eventId) {
    eventGuests = await prisma.$queryRaw`
      SELECT 
        e.id as eventId,
        e.name as eventName,
        e.description as eventDescription,
        e.date as eventDate,
        e.location as eventLocation,
        e."maxGuests" as eventMaxGuests
      FROM event_guests eg
      JOIN events e ON eg.eventId = e.id
      WHERE eg.guestId = ${guestId}
      AND e.id = ${eventId}
      ORDER BY e.date ASC
      LIMIT 1
    `
  } else {
    eventGuests = await prisma.$queryRaw`
      SELECT 
        e.id as eventId,
        e.name as eventName,
        e.description as eventDescription,
        e.date as eventDate,
        e.location as eventLocation,
        e."maxGuests" as eventMaxGuests
      FROM event_guests eg
      JOIN events e ON eg.eventId = e.id
      WHERE eg.guestId = ${guestId}
      ORDER BY e.date ASC
      LIMIT 1
    `
  }

  if (eventGuests.length === 0) throw new Error('Guest not found in any event')
  const eventData = eventGuests[0]

  const event = {
    id: eventData.eventId,
    name: eventData.eventName,
    description: eventData.eventDescription,
    date: new Date(eventData.eventDate),
    location: eventData.eventLocation,
    maxGuests: eventData.eventMaxGuests
  }
  // Use TEST_URL for QR codes if available, otherwise fall back to NEXTAUTH_URL
  const baseUrl = process.env.TEST_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const responseUrl = `${baseUrl}/respond/${guestId}?eventId=${event.id}`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>You're Invited!</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 300; letter-spacing: 2px;">YOU'RE INVITED!</h1>
          <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Join us for a special event</p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #2d3748; margin: 0 0 20px 0; font-size: 28px; font-weight: 600;">${event.name}</h2>
            <div style="width: 60px; height: 3px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); margin: 0 auto;"></div>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              Dear <strong>${guest.firstName} ${guest.lastName}</strong>,
            </p>
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
              We are delighted to invite you to this special event. You may bring a guest with you.
            </p>
          </div>

          <!-- Event Details -->
          <div style="background-color: #edf2f7; border-radius: 12px; padding: 25px; margin: 30px 0;">
            <h3 style="color: #2d3748; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">Event Details</h3>
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
              <span style="color: #667eea; font-size: 18px; margin-right: 10px;">${event.date.toLocaleDateString('en-US', { month: 'short' })} ${event.date.getDate()} 📅</span>
              <span style="color: #4a5568; font-size: 16px;">${event.date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</span>
            </div>
            ${event.location ? `
              <div style="display: flex; align-items: center;">
                <span style="color: #667eea; font-size: 18px; margin-right: 10px;">📍</span>
                <span style="color: #4a5568; font-size: 16px;">${event.location}</span>
              </div>
            ` : ''}
          </div>

          <!-- Plus-One Notice -->
          <div style="background-color: #f0f8ff; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #1976d2; font-size: 14px;">
              <strong>Plus-One Option:</strong> You can bring a guest with you to this event. 
              Click "I'm Coming with Guest" below and we'll ask for your guest's email.
            </p>
          </div>

          <!-- Response Buttons -->
          <div style="text-align: center; margin: 40px 0;">
            <div style="margin-bottom: 20px;">
              <a href="${responseUrl}&response=coming" style="background: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; margin: 0 10px 10px 0;">
                I'm Coming
              </a>
              <a href="${responseUrl}&response=coming_with_plus_one" style="background: #2196F3; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; margin: 0 10px 10px 0;">
                I'm Coming with Guest
              </a>
              <a href="${responseUrl}&response=not_coming" style="background: #f44336; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; margin: 0 10px 10px 0;">
                I Can't Come
              </a>
            </div>
          </div>

          <div style="text-align: center; margin: 40px 0;">
            <div style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 15px 30px; border-radius: 25px; color: #ffffff; font-weight: 600; font-size: 16px;">
              We look forward to seeing you!
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #2d3748; padding: 30px; text-align: center;">
          <p style="color: #a0aec0; margin: 0; font-size: 14px;">
            Best regards,<br>
            <strong style="color: #ffffff;">Event Team</strong>
          </p>
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #4a5568;">
            <p style="color: #a0aec0; margin: 0; font-size: 12px;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `

  return sendEmail({
    to: guest.email,
    subject: `Invitation: ${event.name}`,
    html
  })
}

export async function sendVIPInvitation(guestId: string, eventId?: string) {
  // Get guest data using raw SQL
  const guests = await prisma.$queryRaw<Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    company: string | null;
    isVip: boolean;
  }>>`
    SELECT id, "firstName", "lastName", email, company, "isVip"
    FROM guests
    WHERE id = ${guestId}
  `

  if (guests.length === 0) throw new Error('Guest not found')
  const guest = guests[0]

  // Get event data using raw SQL
  let eventGuests: Array<{
    eventId: string;
    eventName: string;
    eventDescription: string | null;
    eventDate: string;
    eventLocation: string | null;
    eventMaxGuests: number | null;
  }> = []

  if (eventId) {
    eventGuests = await prisma.$queryRaw`
      SELECT 
        e.id as eventId,
        e.name as eventName,
        e.description as eventDescription,
        e.date as eventDate,
        e.location as eventLocation,
        e."maxGuests" as eventMaxGuests
      FROM event_guests eg
      JOIN events e ON eg.eventId = e.id
      WHERE eg.guestId = ${guestId}
      AND e.id = ${eventId}
      ORDER BY e.date ASC
      LIMIT 1
    `
  } else {
    eventGuests = await prisma.$queryRaw`
      SELECT 
        e.id as eventId,
        e.name as eventName,
        e.description as eventDescription,
        e.date as eventDate,
        e.location as eventLocation,
        e."maxGuests" as eventMaxGuests
      FROM event_guests eg
      JOIN events e ON eg.eventId = e.id
      WHERE eg.guestId = ${guestId}
      ORDER BY e.date ASC
      LIMIT 1
    `
  }

  if (eventGuests.length === 0) throw new Error('Guest not found in any event')
  const eventData = eventGuests[0]

  const event = {
    id: eventData.eventId,
    name: eventData.eventName,
    description: eventData.eventDescription,
    date: new Date(eventData.eventDate),
    location: eventData.eventLocation,
    maxGuests: eventData.eventMaxGuests
  }
  // Use TEST_URL for QR codes if available, otherwise fall back to NEXTAUTH_URL
  const baseUrl = process.env.TEST_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const responseUrl = `${baseUrl}/respond/${guestId}?eventId=${event.id}`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>VIP Invitation</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #ffd700 0%, #ffb347 100%); padding: 40px 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 300; letter-spacing: 2px;">VIP INVITATION</h1>
          <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Exclusive invitation for our valued guest</p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #2d3748; margin: 0 0 20px 0; font-size: 28px; font-weight: 600;">${event.name}</h2>
            <div style="width: 60px; height: 3px; background: linear-gradient(135deg, #ffd700 0%, #ffb347 100%); margin: 0 auto;"></div>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              Dear <strong>${guest.firstName} ${guest.lastName}</strong>,
            </p>
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
              As one of our valued VIP guests, we are honored to invite you to this exclusive event. Please let us know if you can attend.
            </p>
          </div>

          <!-- VIP Badge -->
          <div style="background: linear-gradient(135deg, #ffd700 0%, #ffb347 100%); border-radius: 12px; padding: 20px; margin: 30px 0; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 10px;">👑</div>
            <h3 style="color: #ffffff; margin: 0; font-size: 18px; font-weight: 600;">VIP Guest</h3>
            <p style="color: #ffffff; margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Exclusive access and special privileges</p>
          </div>

          <!-- Event Details -->
          <div style="background-color: #edf2f7; border-radius: 12px; padding: 25px; margin: 30px 0;">
            <h3 style="color: #2d3748; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">Event Details</h3>
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
              <span style="color: #ffd700; font-size: 18px; margin-right: 10px;">${event.date.toLocaleDateString('en-US', { month: 'short' })} ${event.date.getDate()} 📅</span>
              <span style="color: #4a5568; font-size: 16px;">${event.date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</span>
            </div>
            ${event.location ? `
              <div style="display: flex; align-items: center;">
                <span style="color: #ffd700; font-size: 18px; margin-right: 10px;">📍</span>
                <span style="color: #4a5568; font-size: 16px;">${event.location}</span>
              </div>
            ` : ''}
          </div>

          <!-- Response Buttons -->
          <div style="text-align: center; margin: 40px 0;">
            <div style="margin-bottom: 20px;">
              <a href="${responseUrl}&response=coming" style="background: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; margin: 0 10px 10px 0;">
                I'm Coming
              </a>
              <a href="${responseUrl}&response=not_coming" style="background: #f44336; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; margin: 0 10px 10px 0;">
                I Can't Come
              </a>
            </div>
          </div>

          <div style="text-align: center; margin: 40px 0;">
            <div style="display: inline-block; background: linear-gradient(135deg, #ffd700 0%, #ffb347 100%); padding: 15px 30px; border-radius: 25px; color: #ffffff; font-weight: 600; font-size: 16px;">
              We look forward to your presence!
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #2d3748; padding: 30px; text-align: center;">
          <p style="color: #a0aec0; margin: 0; font-size: 14px;">
            Best regards,<br>
            <strong style="color: #ffffff;">Event Team</strong>
          </p>
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #4a5568;">
            <p style="color: #a0aec0; margin: 0; font-size: 12px;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `

  return sendEmail({
    to: guest.email,
    subject: `VIP Invitation: ${event.name}`,
    html
  })
}

export async function sendVIPPlusOneInvitation(guestId: string, eventId?: string) {
  // Get guest data using raw SQL
  const guests = await prisma.$queryRaw<Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    company: string | null;
    isVip: boolean;
  }>>`
    SELECT id, "firstName", "lastName", email, company, "isVip"
    FROM guests
    WHERE id = ${guestId}
  `

  if (guests.length === 0) throw new Error('Guest not found')
  const guest = guests[0]

  // Get event data using raw SQL
  let eventGuests: Array<{
    eventId: string;
    eventName: string;
    eventDescription: string | null;
    eventDate: string;
    eventLocation: string | null;
    eventMaxGuests: number | null;
  }> = []

  if (eventId) {
    eventGuests = await prisma.$queryRaw`
      SELECT 
        e.id as eventId,
        e.name as eventName,
        e.description as eventDescription,
        e.date as eventDate,
        e.location as eventLocation,
        e."maxGuests" as eventMaxGuests
      FROM event_guests eg
      JOIN events e ON eg.eventId = e.id
      WHERE eg.guestId = ${guestId}
      AND e.id = ${eventId}
      ORDER BY e.date ASC
      LIMIT 1
    `
  } else {
    eventGuests = await prisma.$queryRaw`
      SELECT 
        e.id as eventId,
        e.name as eventName,
        e.description as eventDescription,
        e.date as eventDate,
        e.location as eventLocation,
        e."maxGuests" as eventMaxGuests
      FROM event_guests eg
      JOIN events e ON eg.eventId = e.id
      WHERE eg.guestId = ${guestId}
      ORDER BY e.date ASC
      LIMIT 1
    `
  }

  if (eventGuests.length === 0) throw new Error('Guest not found in any event')
  const eventData = eventGuests[0]

  const event = {
    id: eventData.eventId,
    name: eventData.eventName,
    description: eventData.eventDescription,
    date: new Date(eventData.eventDate),
    location: eventData.eventLocation,
    maxGuests: eventData.eventMaxGuests
  }
  // Use TEST_URL for QR codes if available, otherwise fall back to NEXTAUTH_URL
  const baseUrl = process.env.TEST_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const responseUrl = `${baseUrl}/respond/${guestId}?eventId=${event.id}`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>VIP Invitation</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #ffd700 0%, #ffb347 100%); padding: 40px 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 300; letter-spacing: 2px;">VIP INVITATION</h1>
          <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Exclusive invitation for our valued guest</p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #2d3748; margin: 0 0 20px 0; font-size: 28px; font-weight: 600;">${event.name}</h2>
            <div style="width: 60px; height: 3px; background: linear-gradient(135deg, #ffd700 0%, #ffb347 100%); margin: 0 auto;"></div>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              Dear <strong>${guest.firstName} ${guest.lastName}</strong>,
            </p>
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
              As one of our valued VIP guests, we are honored to invite you to this exclusive event. You may bring a guest with you.
            </p>
          </div>

          <!-- VIP Badge -->
          <div style="background: linear-gradient(135deg, #ffd700 0%, #ffb347 100%); border-radius: 12px; padding: 20px; margin: 30px 0; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 10px;">👑</div>
            <h3 style="color: #ffffff; margin: 0; font-size: 18px; font-weight: 600;">VIP Guest</h3>
            <p style="color: #ffffff; margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Exclusive access and special privileges</p>
          </div>

          <!-- Event Details -->
          <div style="background-color: #edf2f7; border-radius: 12px; padding: 25px; margin: 30px 0;">
            <h3 style="color: #2d3748; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">Event Details</h3>
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
              <span style="color: #ffd700; font-size: 18px; margin-right: 10px;">${event.date.toLocaleDateString('en-US', { month: 'short' })} ${event.date.getDate()} 📅</span>
              <span style="color: #4a5568; font-size: 16px;">${event.date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</span>
            </div>
            ${event.location ? `
              <div style="display: flex; align-items: center;">
                <span style="color: #ffd700; font-size: 18px; margin-right: 10px;">📍</span>
                <span style="color: #4a5568; font-size: 16px;">${event.location}</span>
              </div>
            ` : ''}
          </div>

          <!-- Plus-One Notice -->
          <div style="background-color: #fff8e1; border-left: 4px solid #ffd700; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #f57c00; font-size: 14px;">
              <strong>VIP Plus-One Option:</strong> As a VIP guest, you can bring a guest with you to this exclusive event. 
              Click "I'm Coming with Guest" below and we'll ask for your guest's email.
            </p>
          </div>

          <!-- Response Buttons -->
          <div style="text-align: center; margin: 40px 0;">
            <div style="margin-bottom: 20px;">
              <a href="${responseUrl}&response=coming" style="background: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; margin: 0 10px 10px 0;">
                I'm Coming
              </a>
              <a href="${responseUrl}&response=coming_with_plus_one" style="background: #2196F3; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; margin: 0 10px 10px 0;">
                I'm Coming with Guest
              </a>
              <a href="${responseUrl}&response=not_coming" style="background: #f44336; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; margin: 0 10px 10px 0;">
                I Can't Come
              </a>
            </div>
          </div>

          <div style="text-align: center; margin: 40px 0;">
            <div style="display: inline-block; background: linear-gradient(135deg, #ffd700 0%, #ffb347 100%); padding: 15px 30px; border-radius: 25px; color: #ffffff; font-weight: 600; font-size: 16px;">
              We look forward to your presence!
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #2d3748; padding: 30px; text-align: center;">
          <p style="color: #a0aec0; margin: 0; font-size: 14px;">
            Best regards,<br>
            <strong style="color: #ffffff;">Event Team</strong>
          </p>
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #4a5568;">
            <p style="color: #a0aec0; margin: 0; font-size: 12px;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `

  return sendEmail({
    to: guest.email,
    subject: `VIP Invitation: ${event.name}`,
    html
  })
}

export async function sendQRCode(guestId: string, eventId?: string) {
  // Get guest data using raw SQL
  const guests = await prisma.$queryRaw<Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    company: string | null;
    isVip: boolean;
  }>>`
    SELECT id, "firstName", "lastName", email, company, "isVip"
    FROM guests
    WHERE id = ${guestId}
  `

  if (guests.length === 0) throw new Error('Guest not found')
  const guest = guests[0]

  // Get event data using raw SQL
  let eventGuests: Array<{
    eventId: string;
    eventName: string;
    eventDescription: string | null;
    eventDate: string;
    eventLocation: string | null;
    eventMaxGuests: number | null;
  }> = []

  if (eventId) {
    eventGuests = await prisma.$queryRaw`
      SELECT 
        e.id as eventId,
        e.name as eventName,
        e.description as eventDescription,
        e.date as eventDate,
        e.location as eventLocation,
        e."maxGuests" as eventMaxGuests
      FROM event_guests eg
      JOIN events e ON eg.eventId = e.id
      WHERE eg.guestId = ${guestId}
      AND e.id = ${eventId}
      ORDER BY e.date ASC
      LIMIT 1
    `
  } else {
    eventGuests = await prisma.$queryRaw`
      SELECT 
        e.id as eventId,
        e.name as eventName,
        e.description as eventDescription,
        e.date as eventDate,
        e.location as eventLocation,
        e."maxGuests" as eventMaxGuests
      FROM event_guests eg
      JOIN events e ON eg.eventId = e.id
      WHERE eg.guestId = ${guestId}
      ORDER BY e.date ASC
      LIMIT 1
    `
  }

  if (eventGuests.length === 0) throw new Error('Guest not found in any event')
  const eventData = eventGuests[0]

  const event = {
    id: eventData.eventId,
    name: eventData.eventName,
    description: eventData.eventDescription,
    date: new Date(eventData.eventDate),
    location: eventData.eventLocation,
    maxGuests: eventData.eventMaxGuests
  }

  // Get QR codes using raw SQL
  let qrCodes: Array<{
    code: string;
    status: string;
  }> = []

  if (eventId) {
    qrCodes = await prisma.$queryRaw`
      SELECT code, status
      FROM qr_codes
      WHERE "guestId" = ${guestId}
      AND "eventId" = ${eventId}
      AND status = 'ACTIVE'
    `
  } else {
    qrCodes = await prisma.$queryRaw`
      SELECT code, status
      FROM qr_codes
      WHERE "guestId" = ${guestId}
      AND status = 'ACTIVE'
    `
  }

  if (qrCodes.length === 0) {
    // Generate a new QR code if none exists
    const { generateQRCode } = await import('@/lib/qr')
    await generateQRCode(guestId, eventId || event.id, 'REGULAR')
    
    // Fetch the newly created QR code
    if (eventId) {
      qrCodes = await prisma.$queryRaw`
        SELECT code, status
        FROM qr_codes
        WHERE "guestId" = ${guestId}
        AND "eventId" = ${eventId}
        AND status = 'ACTIVE'
      `
    } else {
      qrCodes = await prisma.$queryRaw`
        SELECT code, status
        FROM qr_codes
        WHERE "guestId" = ${guestId}
        AND status = 'ACTIVE'
      `
    }
    
    if (qrCodes.length === 0) throw new Error('Failed to generate QR code')
  }

  // Generate QR code image URL from the text code
  const qrCodeText = qrCodes[0].code
  console.log('Generating QR code for text:', qrCodeText)
  console.log('QR code text type:', typeof qrCodeText)
  console.log('QR code text length:', qrCodeText.length)
  
  // Use external QR code service for better email compatibility
  // For check-in QR codes, we use the actual QR code text, not a response URL
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeText)}`

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
          <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 300; letter-spacing: 2px;">ENTRY PASS</h1>
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
              Dear <strong>${guest.firstName} ${guest.lastName}</strong>,
            </p>
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
              Thank you for confirming your attendance. Please present this QR code at the entrance:
            </p>
          </div>

          <!-- QR Code Section -->
          <div style="background-color:#f9f9f9;border:1px solid #ddd;padding:15px;margin:20px 0;border-radius:4px">
            <p style="margin:0;color:#666;font-size:14px">
              <strong>Quick Response:</strong> Scan this QR code with your phone to quickly respond to this invitation.
            </p>
            <div style="text-align:center;margin-top:15px">
              <img src="${qrCodeImageUrl}" alt="Response QR Code" style="border:2px solid #ddd;border-radius:8px;padding:10px;background:white" />
              <p style="margin-top:10px;font-family:monospace;font-size:12px;color:#666">Scan to respond to invitation</p>
            </div>
            <div style="margin-top:15px;padding-top:15px;border-top:1px solid #ddd;text-align:center">
              <p style="margin:0;color:#666;font-size:12px">
                <strong>Manual Entry:</strong> If scanning doesn't work, you can manually enter this code:
              </p>
              <p style="margin:5px 0 0 0;font-family:monospace;font-size:14px;color:#333;background:#fff;padding:8px;border:1px solid #ccc;border-radius:4px;display:inline-block">
                ${qrCodeText}
              </p>
            </div>
          </div>

          <!-- Event Details -->
          <div style="background-color: #edf2f7; border-radius: 12px; padding: 25px; margin: 30px 0;">
            <h3 style="color: #2d3748; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">Event Details</h3>
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
              <span style="color: #667eea; font-size: 18px; margin-right: 10px;">${event.date.toLocaleDateString('en-US', { month: 'short' })} ${event.date.getDate()} 📅</span>
              <span style="color: #4a5568; font-size: 16px;">${event.date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</span>
            </div>
            ${event.location ? `
              <div style="display: flex; align-items: center;">
                <span style="color: #667eea; font-size: 18px; margin-right: 10px;">📍</span>
                <span style="color: #4a5568; font-size: 16px;">${event.location}</span>
              </div>
            ` : ''}
          </div>

          <div style="text-align: center; margin: 40px 0;">
            <div style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 15px 30px; border-radius: 25px; color: #ffffff; font-weight: 600; font-size: 16px;">
              We look forward to seeing you!
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #2d3748; padding: 30px; text-align: center;">
          <p style="color: #a0aec0; margin: 0; font-size: 14px;">
            Best regards,<br>
            <strong style="color: #ffffff;">Event Team</strong>
          </p>
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #4a5568;">
            <p style="color: #a0aec0; margin: 0; font-size: 12px;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `

  return sendEmail({
    to: guest.email,
    subject: `Entry Pass: ${event.name}`,
    html
  })
}

export async function sendPlusOneInvitation(guestId: string, plusOneEmail: string, plusOneName: string, eventId?: string) {
  // Get guest data using raw SQL
  const guests = await prisma.$queryRaw<Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    company: string | null;
    isVip: boolean;
  }>>`
    SELECT id, "firstName", "lastName", email, company, "isVip"
    FROM guests
    WHERE id = ${guestId}
  `

  if (guests.length === 0) throw new Error('Guest not found')
  const guest = guests[0]

  // Get event data using raw SQL
  let eventGuests: Array<{
    eventId: string;
    eventName: string;
    eventDescription: string | null;
    eventDate: string;
    eventLocation: string | null;
    eventMaxGuests: number | null;
  }> = []

  if (eventId) {
    eventGuests = await prisma.$queryRaw`
      SELECT 
        e.id as eventId,
        e.name as eventName,
        e.description as eventDescription,
        e.date as eventDate,
        e.location as eventLocation,
        e."maxGuests" as eventMaxGuests
      FROM event_guests eg
      JOIN events e ON eg.eventId = e.id
      WHERE eg.guestId = ${guestId}
      AND e.id = ${eventId}
      ORDER BY e.date ASC
      LIMIT 1
    `
  } else {
    eventGuests = await prisma.$queryRaw`
      SELECT 
        e.id as eventId,
        e.name as eventName,
        e.description as eventDescription,
        e.date as eventDate,
        e.location as eventLocation,
        e."maxGuests" as eventMaxGuests
      FROM event_guests eg
      JOIN events e ON eg.eventId = e.id
      WHERE eg.guestId = ${guestId}
      ORDER BY e.date ASC
      LIMIT 1
    `
  }

  if (eventGuests.length === 0) throw new Error('Guest not found in any event')
  const eventData = eventGuests[0]

  const event = {
    id: eventData.eventId,
    name: eventData.eventName,
    description: eventData.eventDescription,
    date: new Date(eventData.eventDate),
    location: eventData.eventLocation,
    maxGuests: eventData.eventMaxGuests
  }
  // Use TEST_URL for QR codes if available, otherwise fall back to NEXTAUTH_URL
  const baseUrl = process.env.TEST_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const responseUrl = `${baseUrl}/respond/${guestId}?eventId=${event.id}`
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1>You're Invited!</h1>
      <p>Dear ${plusOneName},</p>
      <p>You have been invited as a guest of <strong>${guest.firstName} ${guest.lastName}</strong> to:</p>
      <h2>${event.name}</h2>
      <p><strong>Date:</strong> ${event.date.toLocaleDateString()}</p>
      <p><strong>Location:</strong> ${event.location || 'TBA'}</p>
      ${event.description ? `<p>${event.description}</p>` : ''}
      <div style="margin: 30px 0;">
        <a href="${responseUrl}&response=coming" style="background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-right: 10px;">
          I'm Coming
        </a>
        <a href="${responseUrl}&response=not_coming" style="background: #f44336; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
          I Can't Come
        </a>
      </div>
      <p>Best regards,<br>Event Team</p>
    </div>
  `

  return sendEmail({
    to: plusOneEmail,
    subject: `Invitation: ${event.name} (Guest of ${guest.firstName} ${guest.lastName})`,
    html
  })
}

export async function sendPlusOneQRCode(guestId: string, plusOneEmail: string, plusOneName: string, eventId?: string) {
  // Get guest data using raw SQL
  const guests = await prisma.$queryRaw<Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    company: string | null;
    isVip: boolean;
  }>>`
    SELECT id, "firstName", "lastName", email, company, "isVip"
    FROM guests
    WHERE id = ${guestId}
  `

  if (guests.length === 0) throw new Error('Guest not found')
  const guest = guests[0]

  // Get event data using raw SQL
  let eventGuests: Array<{
    eventId: string;
    eventName: string;
    eventDescription: string | null;
    eventDate: string;
    eventLocation: string | null;
    eventMaxGuests: number | null;
  }> = []

  if (eventId) {
    eventGuests = await prisma.$queryRaw`
      SELECT 
        e.id as eventId,
        e.name as eventName,
        e.description as eventDescription,
        e.date as eventDate,
        e.location as eventLocation,
        e."maxGuests" as eventMaxGuests
      FROM event_guests eg
      JOIN events e ON eg.eventId = e.id
      WHERE eg.guestId = ${guestId}
      AND e.id = ${eventId}
      ORDER BY e.date ASC
      LIMIT 1
    `
  } else {
    eventGuests = await prisma.$queryRaw`
      SELECT 
        e.id as eventId,
        e.name as eventName,
        e.description as eventDescription,
        e.date as eventDate,
        e.location as eventLocation,
        e."maxGuests" as eventMaxGuests
      FROM event_guests eg
      JOIN events e ON eg.eventId = e.id
      WHERE eg.guestId = ${guestId}
      ORDER BY e.date ASC
      LIMIT 1
    `
  }

  if (eventGuests.length === 0) throw new Error('Guest not found in any event')
  const eventData = eventGuests[0]

  const event = {
    id: eventData.eventId,
    name: eventData.eventName,
    description: eventData.eventDescription,
    date: new Date(eventData.eventDate),
    location: eventData.eventLocation,
    maxGuests: eventData.eventMaxGuests
  }

  // Find the plus-one guest by email
  const plusOneGuests = await prisma.$queryRaw<Array<{
    id: string;
  }>>`
    SELECT id
    FROM guests
    WHERE email = ${plusOneEmail}
  `

  if (plusOneGuests.length === 0) throw new Error('Plus-one guest not found')
  const plusOneGuestId = plusOneGuests[0].id

  // Get QR code for the plus-one guest
  let qrCodes: Array<{
    code: string;
    status: string;
  }> = []

  if (eventId) {
    qrCodes = await prisma.$queryRaw`
      SELECT code, status
      FROM qr_codes
      WHERE "guestId" = ${plusOneGuestId}
      AND "eventId" = ${eventId}
      AND status = 'ACTIVE'
    `
  } else {
    qrCodes = await prisma.$queryRaw`
      SELECT code, status
      FROM qr_codes
      WHERE "guestId" = ${plusOneGuestId}
      AND status = 'ACTIVE'
    `
  }

  if (qrCodes.length === 0) {
    // Generate a new QR code for the plus-one if none exists
    const { generateQRCode } = await import('@/lib/qr')
    await generateQRCode(plusOneGuestId, eventId || event.id, 'REGULAR')
    
    // Fetch the newly created QR code
    if (eventId) {
      qrCodes = await prisma.$queryRaw`
        SELECT code, status
        FROM qr_codes
        WHERE "guestId" = ${plusOneGuestId}
        AND "eventId" = ${eventId}
        AND status = 'ACTIVE'
      `
    } else {
      qrCodes = await prisma.$queryRaw`
        SELECT code, status
        FROM qr_codes
        WHERE "guestId" = ${plusOneGuestId}
        AND status = 'ACTIVE'
      `
    }
    
    if (qrCodes.length === 0) throw new Error('Failed to generate QR code for plus-one')
  }

  // Generate QR code image URL from the text code
  const qrCodeText = qrCodes[0].code
  console.log('Generating QR code for plus-one text:', qrCodeText)
  console.log('Plus-one QR code text type:', typeof qrCodeText)
  console.log('Plus-one QR code text length:', qrCodeText.length)
  
  // Use external QR code service for better email compatibility
  // For check-in QR codes, we use the actual QR code text, not a response URL
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeText)}`

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
          <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 300; letter-spacing: 2px;">ENTRY PASS</h1>
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
              Dear <strong>${plusOneName}</strong>,
            </p>
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
              Thank you for confirming your attendance to <strong>${event.name}</strong> as a guest of <strong>${guest.firstName} ${guest.lastName}</strong>.
            </p>
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
              Please present this QR code at the entrance:
            </p>
          </div>

          <!-- QR Code Section -->
          <div style="background-color:#f9f9f9;border:1px solid #ddd;padding:15px;margin:20px 0;border-radius:4px">
            <p style="margin:0;color:#666;font-size:14px">
              <strong>Entry Pass:</strong> Scan this QR code at the entrance to check in.
            </p>
            <div style="text-align:center;margin-top:15px">
              <img src="${qrCodeImageUrl}" alt="Entry QR Code" style="border:2px solid #ddd;border-radius:8px;padding:10px;background:white" />
              <p style="margin-top:10px;font-family:monospace;font-size:12px;color:#666">Scan to check in at entrance</p>
            </div>
            <div style="margin-top:15px;padding-top:15px;border-top:1px solid #ddd;text-align:center">
              <p style="margin:0;color:#666;font-size:12px">
                <strong>Manual Entry:</strong> If scanning doesn't work, you can manually enter this code:
              </p>
              <p style="margin:5px 0 0 0;font-family:monospace;font-size:14px;color:#333;background:#fff;padding:8px;border:1px solid #ccc;border-radius:4px;display:inline-block">
                ${qrCodeText}
              </p>
            </div>
          </div>

          <!-- Event Details -->
          <div style="background-color: #edf2f7; border-radius: 12px; padding: 25px; margin: 30px 0;">
            <h3 style="color: #2d3748; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">Event Details</h3>
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
              <span style="color: #667eea; font-size: 18px; margin-right: 10px;">${event.date.toLocaleDateString('en-US', { month: 'short' })} ${event.date.getDate()} 📅</span>
              <span style="color: #4a5568; font-size: 16px;">${event.date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</span>
            </div>
            ${event.location ? `
              <div style="display: flex; align-items: center;">
                <span style="color: #667eea; font-size: 18px; margin-right: 10px;">📍</span>
                <span style="color: #4a5568; font-size: 16px;">${event.location}</span>
              </div>
            ` : ''}
          </div>

          <div style="text-align: center; margin: 40px 0;">
            <div style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 15px 30px; border-radius: 25px; color: #ffffff; font-weight: 600; font-size: 16px;">
              We look forward to seeing you!
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #2d3748; padding: 30px; text-align: center;">
          <p style="color: #a0aec0; margin: 0; font-size: 14px;">
            Best regards,<br>
            <strong style="color: #ffffff;">Event Team</strong>
          </p>
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #4a5568;">
            <p style="color: #a0aec0; margin: 0; font-size: 12px;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `

  return sendEmail({
    to: plusOneEmail,
    subject: `Entry Pass: ${event.name} (Guest of ${guest.firstName} ${guest.lastName})`,
    html
  })
}

export async function sendSurvey(guestId: string, eventId?: string) {
  // Get guest data using raw SQL
  const guests = await prisma.$queryRaw<Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    company: string | null;
    isVip: boolean;
  }>>`
    SELECT id, "firstName", "lastName", email, company, "isVip"
    FROM guests
    WHERE id = ${guestId}
  `

  if (guests.length === 0) throw new Error('Guest not found')
  const guest = guests[0]

  // Get event data using raw SQL
  let eventGuests: Array<{
    eventId: string;
    eventName: string;
    eventDescription: string | null;
    eventDate: string;
    eventLocation: string | null;
    eventMaxGuests: number | null;
  }> = []

  if (eventId) {
    eventGuests = await prisma.$queryRaw`
      SELECT 
        e.id as eventId,
        e.name as eventName,
        e.description as eventDescription,
        e.date as eventDate,
        e.location as eventLocation,
        e."maxGuests" as eventMaxGuests
      FROM event_guests eg
      JOIN events e ON eg.eventId = e.id
      WHERE eg.guestId = ${guestId}
      AND e.id = ${eventId}
      ORDER BY e.date ASC
      LIMIT 1
    `
  } else {
    eventGuests = await prisma.$queryRaw`
      SELECT 
        e.id as eventId,
        e.name as eventName,
        e.description as eventDescription,
        e.date as eventDate,
        e.location as eventLocation,
        e."maxGuests" as eventMaxGuests
      FROM event_guests eg
      JOIN events e ON eg.eventId = e.id
      WHERE eg.guestId = ${guestId}
      ORDER BY e.date ASC
      LIMIT 1
    `
  }

  if (eventGuests.length === 0) throw new Error('Guest not found in any event')
  const eventData = eventGuests[0]

  const event = {
    id: eventData.eventId,
    name: eventData.eventName,
    description: eventData.eventDescription,
    date: new Date(eventData.eventDate),
    location: eventData.eventLocation,
    maxGuests: eventData.eventMaxGuests
  }
  // Create tracking URL for survey completion
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const trackingUrl = `${baseUrl}/api/surveys/complete/${guest.id}?eventId=${event.id}`
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Event Feedback Request</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 300; letter-spacing: 2px;">FEEDBACK REQUEST</h1>
          <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Help us improve future events</p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #2d3748; margin: 0 0 20px 0; font-size: 28px; font-weight: 600;">Thank You!</h2>
            <div style="width: 60px; height: 3px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); margin: 0 auto;"></div>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              Dear <strong>${guest.firstName} ${guest.lastName}</strong>,
            </p>
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
              Thank you for attending <strong>${event.name}</strong>! We hope you had a wonderful time.
            </p>
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
              We would love to hear your feedback about the event. Your input helps us improve future events and create even better experiences for our guests.
            </p>
          </div>

          <!-- Event Details -->
          <div style="background-color: #edf2f7; border-radius: 12px; padding: 25px; margin: 30px 0;">
            <h3 style="color: #2d3748; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">Event Details</h3>
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
              <span style="color: #667eea; font-size: 18px; margin-right: 10px;">📅</span>
              <span style="color: #4a5568; font-size: 16px;">${event.date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            ${event.location ? `
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
              <span style="color: #667eea; font-size: 18px; margin-right: 10px;">📍</span>
              <span style="color: #4a5568; font-size: 16px;">${event.location}</span>
            </div>
            ` : ''}
            ${event.description ? `
            <div style="display: flex; align-items: flex-start; margin-bottom: 10px;">
              <span style="color: #667eea; font-size: 18px; margin-right: 10px; margin-top: 2px;">📝</span>
              <span style="color: #4a5568; font-size: 16px;">${event.description}</span>
            </div>
            ` : ''}
          </div>

          <!-- Survey Button -->
          <div style="text-align: center; margin: 40px 0;">
            <a href="${trackingUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 18px 36px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 18px; display: inline-block; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              📊 Take Our Survey
            </a>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #4a5568; font-size: 14px; line-height: 1.6; margin: 0;">
              The survey will only take a few minutes to complete. Your feedback is invaluable to us!
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #2d3748; padding: 30px; text-align: center;">
          <p style="color: #a0aec0; margin: 0; font-size: 14px;">
            Best regards,<br>
            <strong style="color: #ffffff;">Event Team</strong>
          </p>
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #4a5568;">
            <p style="color: #a0aec0; margin: 0; font-size: 12px;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `

  return sendEmail({
    to: guest.email,
    subject: `Feedback Request: ${event.name}`,
    html
  })
} 