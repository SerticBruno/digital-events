import QRCode from 'qrcode'
import { prisma } from '@/lib/db'



export async function generateQRCode(guestId: string, eventId: string, type: 'REGULAR' | 'VIP' = 'REGULAR') {
  try {
    // Generate a unique code
    const code = `${guestId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Create QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(code, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })

    // Store in database using raw SQL
    const qrCodeId = crypto.randomUUID()
    await prisma.$executeRaw`
      INSERT INTO qr_codes (id, code, type, "guestId", "eventId", "isUsed", "createdAt")
      VALUES (${qrCodeId}, ${qrDataUrl}, ${type}, ${guestId}, ${eventId}, false, datetime('now'))
    `

    const qrCode = {
      id: qrCodeId,
      code: qrDataUrl,
      type,
      guestId,
      eventId,
      isUsed: false,
      createdAt: new Date()
    }

    return qrCode
  } catch (error) {
    console.error('QR code generation failed:', error)
    throw error
  }
}

export async function generateQRCodesForGuest(guestId: string, eventId: string, hasPlusOne: boolean = false, isVip: boolean = false) {
  const type = isVip ? 'VIP' : 'REGULAR'
  
  // Generate QR code for main guest
  const mainQR = await generateQRCode(guestId, eventId, type)
  
  // Generate QR code for plus one if needed
  let plusOneQR = null
  if (hasPlusOne) {
    plusOneQR = await generateQRCode(guestId, eventId, type)
  }
  
  return { mainQR, plusOneQR }
}

export async function validateQRCode(code: string) {
  try {
    // Get QR code and guest data using raw SQL
    const qrCodes = await prisma.$queryRaw<Array<{
      id: string;
      code: string;
      type: string;
      isUsed: boolean;
      usedAt: string | null;
      createdAt: string;
      guestId: string;
      eventId: string;
      guestFirstName: string;
      guestLastName: string;
      guestEmail: string;
      guestCompany: string | null;
      guestIsVip: boolean;
      eventName: string;
      eventDescription: string | null;
      eventDate: string;
      eventLocation: string | null;
      eventMaxGuests: number | null;
    }>>`
      SELECT 
        qc.id,
        qc.code,
        qc.type,
        qc."isUsed",
        qc."usedAt",
        qc."createdAt",
        qc."guestId",
        qc."eventId",
        g."firstName" as guestFirstName,
        g."lastName" as guestLastName,
        g.email as guestEmail,
        g.company as guestCompany,
        g."isVip" as guestIsVip,
        e.name as eventName,
        e.description as eventDescription,
        e.date as eventDate,
        e.location as eventLocation,
        e."maxGuests" as eventMaxGuests
      FROM qr_codes qc
      JOIN guests g ON qc."guestId" = g.id
      JOIN events e ON qc."eventId" = e.id
      WHERE qc.code = ${code}
    `

    if (qrCodes.length === 0) {
      return { valid: false, error: 'Invalid QR code' }
    }

    const qrCodeData = qrCodes[0]

    if (qrCodeData.isUsed) {
      return { valid: false, error: 'QR code already used' }
    }

    const qrCode = {
      id: qrCodeData.id,
      code: qrCodeData.code,
      type: qrCodeData.type,
      isUsed: qrCodeData.isUsed,
      usedAt: qrCodeData.usedAt ? new Date(qrCodeData.usedAt) : undefined,
      createdAt: new Date(qrCodeData.createdAt),
      guestId: qrCodeData.guestId,
      eventId: qrCodeData.eventId
    }

    const guest = {
      id: qrCodeData.guestId,
      firstName: qrCodeData.guestFirstName,
      lastName: qrCodeData.guestLastName,
      email: qrCodeData.guestEmail,
      company: qrCodeData.guestCompany,
      isVip: qrCodeData.guestIsVip
    }

    const event = {
      id: qrCodeData.eventId,
      name: qrCodeData.eventName,
      description: qrCodeData.eventDescription,
      date: new Date(qrCodeData.eventDate),
      location: qrCodeData.eventLocation,
      maxGuests: qrCodeData.eventMaxGuests
    }

    return { 
      valid: true, 
      qrCode,
      guest,
      event
    }
  } catch (error) {
    console.error('QR code validation failed:', error)
    return { valid: false, error: 'Validation failed' }
  }
}

export async function useQRCode(code: string) {
  try {
    // Update QR code using raw SQL
    await prisma.$executeRaw`
      UPDATE qr_codes 
      SET "isUsed" = true, "usedAt" = datetime('now')
      WHERE code = ${code}
    `

    // Get updated QR code data
    const result = await validateQRCode(code)
    if (!result.valid) {
      return { success: false, error: 'QR code not found' }
    }

    return { success: true, qrCode: result.qrCode }
  } catch (error) {
    console.error('QR code usage failed:', error)
    return { success: false, error }
  }
} 