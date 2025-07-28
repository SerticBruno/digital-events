import QRCode from 'qrcode'
import { prisma } from './db'

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

    // Store in database
    const qrCode = await (prisma as any).qRCode.create({
      data: {
        code: qrDataUrl,
        type,
        guestId,
        eventId
      }
    })

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
    const qrCode = await (prisma as any).qRCode.findFirst({
      where: { code },
      include: {
        guest: {
          include: { 
            eventGuests: {
              include: {
                event: true
              }
            }
          }
        }
      }
    })

    if (!qrCode) {
      return { valid: false, error: 'Invalid QR code' }
    }

    if (qrCode.isUsed) {
      return { valid: false, error: 'QR code already used' }
    }

    // Get the first event (or you could pass eventId as parameter)
    const event = qrCode.guest.eventGuests[0]?.event

    return { 
      valid: true, 
      qrCode,
      guest: qrCode.guest,
      event
    }
  } catch (error) {
    console.error('QR code validation failed:', error)
    return { valid: false, error: 'Validation failed' }
  }
}

export async function useQRCode(code: string) {
  try {
    const qrCode = await (prisma as any).qRCode.update({
      where: { code },
      data: {
        isUsed: true,
        usedAt: new Date()
      },
      include: {
        guest: {
          include: { 
            eventGuests: {
              include: {
                event: true
              }
            }
          }
        }
      }
    })

    return { success: true, qrCode }
  } catch (error) {
    console.error('QR code usage failed:', error)
    return { success: false, error }
  }
} 