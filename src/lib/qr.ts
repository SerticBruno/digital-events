import { prisma } from './db'
import { randomUUID } from 'crypto'

export async function validateQRCode(code: string, eventId: string) {
  try {
    // Find QR code and check if it's valid and unused
    const qrCodeRecord = await prisma.$queryRaw<Array<{
      id: string
      code: string
      type: string
      status: string
      guestId: string
      eventId: string
    }>>`
      SELECT id, code, type, status, "guestId", "eventId"
      FROM qr_codes 
      WHERE code = ${code} 
      AND "eventId" = ${eventId}
      AND status IN ('SENT', 'GENERATED')
    `

    if (qrCodeRecord.length === 0) {
      return { valid: false, message: 'Invalid or already used QR code' }
    }

    const qrCode = qrCodeRecord[0]

    // Mark QR code as used
    await prisma.$executeRaw`
      UPDATE qr_codes 
      SET status = 'USED', "usedAt" = datetime('now')
      WHERE id = ${qrCode.id}
    `

    // Get guest information
    const guestRecord = await prisma.$queryRaw<Array<{
      id: string
      firstName: string
      lastName: string
      email: string
      company: string | null
      isVip: boolean
    }>>`
      SELECT id, "firstName", "lastName", email, company, "isVip"
      FROM guests 
      WHERE id = ${qrCode.guestId}
    `

    if (guestRecord.length === 0) {
      return { valid: false, message: 'Guest not found' }
    }

    const guest = guestRecord[0]

    return {
      valid: true,
      guest: {
        id: guest.id,
        firstName: guest.firstName,
        lastName: guest.lastName,
        email: guest.email,
        company: guest.company,
        isVip: guest.isVip
      },
      qrCode: {
        id: qrCode.id,
        code: qrCode.code,
        type: qrCode.type,
        status: 'USED',
        usedAt: new Date().toISOString()
      }
    }
  } catch (error) {
    console.error('Error validating QR code:', error)
    return { valid: false, message: 'Error validating QR code' }
  }
}

export async function generateQRCode(guestId: string, eventId: string, type: 'REGULAR' | 'VIP' = 'REGULAR') {
  try {
    // Generate unique QR code
    const code = `QR-${randomUUID().substring(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`

    // Insert QR code into database with GENERATED status
    await prisma.$executeRaw`
      INSERT INTO qr_codes (id, code, type, "guestId", "eventId", status, "createdAt")
      VALUES (${randomUUID()}, ${code}, ${type}, ${guestId}, ${eventId}, 'GENERATED', datetime('now'))
    `

    return {
      success: true,
      code,
      type,
      status: 'GENERATED'
    }
  } catch (error) {
    console.error('Error generating QR code:', error)
    return {
      success: false,
      error: 'Failed to generate QR code'
    }
  }
}

export async function getQRCodeForGuest(guestId: string, eventId: string) {
  try {
    const qrCodeData = await prisma.$queryRaw<Array<{
      id: string
      code: string
      type: string
      status: string
      usedAt: string | null
      createdAt: string
    }>>`
      SELECT id, code, type, status, "usedAt", "createdAt"
      FROM qr_codes 
      WHERE "guestId" = ${guestId} 
      AND "eventId" = ${eventId}
      ORDER BY "createdAt" DESC
      LIMIT 1
    `

    if (qrCodeData.length === 0) {
      return null
    }

    const qrCode = qrCodeData[0]

    return {
      id: qrCode.id,
      code: qrCode.code,
      type: qrCode.type,
      status: qrCode.status,
      usedAt: qrCode.usedAt,
      createdAt: qrCode.createdAt
    }
  } catch (error) {
    console.error('Error getting QR code for guest:', error)
    return null
  }
}

export async function generatePlusOneQRCode(guestId: string, eventId: string, type: 'REGULAR' | 'VIP' = 'REGULAR', plusOneName: string) {
  try {
    // This function is deprecated - use generateQRCode with the plus-one's guest ID instead
    // For backward compatibility, we'll still create a QR code but log a warning
    console.warn('generatePlusOneQRCode is deprecated. Use generateQRCode with the plus-one guest ID instead.')
    
    // Generate unique QR code for plus-one
    const code = `QR-PLUS-${randomUUID().substring(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`

    // Insert QR code into database with plus-one identifier and GENERATED status
    await prisma.$executeRaw`
      INSERT INTO qr_codes (id, code, type, "guestId", "eventId", status, "createdAt")
      VALUES (${randomUUID()}, ${code}, ${type}, ${guestId}, ${eventId}, 'GENERATED', datetime('now'))
    `

    return {
      success: true,
      code,
      type,
      status: 'GENERATED'
    }
  } catch (error) {
    console.error('Error generating plus-one QR code:', error)
    return {
      success: false,
      error: 'Failed to generate plus-one QR code'
    }
  }
}

export async function regenerateQRCode(guestId: string, eventId: string, type: 'REGULAR' | 'VIP' = 'REGULAR') {
  try {
    // Invalidate existing QR codes for this guest and event
    await prisma.$executeRaw`
      UPDATE qr_codes 
      SET status = 'EXPIRED'
      WHERE "guestId" = ${guestId} 
      AND "eventId" = ${eventId}
      AND status IN ('GENERATED', 'SENT')
    `

    // Generate new QR code
    return await generateQRCode(guestId, eventId, type)
  } catch (error) {
    console.error('Error regenerating QR code:', error)
    return {
      success: false,
      error: 'Failed to regenerate QR code'
    }
  }
}

export async function updateQRCodeStatus(guestId: string, eventId: string, status: 'CREATED' | 'GENERATED' | 'SENT' | 'USED' | 'EXPIRED') {
  try {
    console.log(`updateQRCodeStatus called: guestId=${guestId}, eventId=${eventId}, status=${status}`)
    
    const result = await prisma.$executeRaw`
      UPDATE qr_codes 
      SET status = ${status}
      WHERE "guestId" = ${guestId} 
      AND "eventId" = ${eventId}
    `
    
    console.log(`updateQRCodeStatus result:`, result)

    return {
      success: true,
      message: `QR code status updated to ${status}`
    }
  } catch (error) {
    console.error('Error updating QR code status:', error)
    return {
      success: false,
      error: 'Failed to update QR code status'
    }
  }
}

export async function activateAllQRCodesForGuest(guestId: string, eventId: string) {
  try {
    await prisma.$executeRaw`
      UPDATE qr_codes 
      SET status = 'SENT'
      WHERE "guestId" = ${guestId} 
      AND "eventId" = ${eventId}
      AND status IN ('CREATED', 'GENERATED')
    `

    return {
      success: true,
      message: 'All QR codes marked as sent for guest'
    }
  } catch (error) {
    console.error('Error activating QR codes for guest:', error)
    return {
      success: false,
      error: 'Failed to activate QR codes for guest'
    }
  }
} 