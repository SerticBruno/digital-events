import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateQRCode } from '@/lib/qr'

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

    // Get the first event if no eventId provided
    const event = await prisma.event.findFirst({
      where: eventId === 'first' ? undefined : { id: eventId },
      include: {
        eventGuests: {
          include: {
            guest: true
          }
        }
      }
    })

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    const results = []

    // Generate QR codes for the first 3 guests (or all if less than 3)
    const guestsToProcess = event.eventGuests.slice(0, 3)
    
    for (const eventGuest of guestsToProcess) {
      try {
        const qrCode = await generateQRCode(eventGuest.guest.id, event.id, 'REGULAR')
        results.push({ 
          guestId: eventGuest.guest.id, 
          guestName: `${eventGuest.guest.firstName} ${eventGuest.guest.lastName}`,
          success: true, 
          qrCode 
        })
      } catch (error) {
        console.error(`Failed to generate QR code for guest ${eventGuest.guest.id}:`, error)
        results.push({ 
          guestId: eventGuest.guest.id, 
          guestName: `${eventGuest.guest.firstName} ${eventGuest.guest.lastName}`,
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failureCount = results.length - successCount

    return NextResponse.json({
      event: {
        id: event.id,
        name: event.name
      },
      message: `Generated QR codes for ${successCount} guests, ${failureCount} failed`,
      results
    })
  } catch (error) {
    console.error('Failed to generate test QR codes:', error)
    return NextResponse.json(
      { error: 'Failed to generate test QR codes' },
      { status: 500 }
    )
  }
} 