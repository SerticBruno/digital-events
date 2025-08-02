import { NextRequest, NextResponse } from 'next/server'
import { 
  resetQRCodeForReuse, 
  resetAllQRCodesForEvent, 
  resetQRCodeForGuest,
  getQRCodeHistory 
} from '@/lib/qr'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, qrCodeId, eventId, guestId } = body

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required (reset_single, reset_event, reset_guest, get_history)' },
        { status: 400 }
      )
    }

    let result

    switch (action) {
      case 'reset_single':
        if (!qrCodeId) {
          return NextResponse.json(
            { error: 'QR code ID is required for reset_single action' },
            { status: 400 }
          )
        }
        result = await resetQRCodeForReuse(qrCodeId)
        break

      case 'reset_event':
        if (!eventId) {
          return NextResponse.json(
            { error: 'Event ID is required for reset_event action' },
            { status: 400 }
          )
        }
        result = await resetAllQRCodesForEvent(eventId)
        break

      case 'reset_guest':
        if (!guestId || !eventId) {
          return NextResponse.json(
            { error: 'Guest ID and Event ID are required for reset_guest action' },
            { status: 400 }
          )
        }
        result = await resetQRCodeForGuest(guestId, eventId)
        break

      case 'get_history':
        if (!guestId || !eventId) {
          return NextResponse.json(
            { error: 'Guest ID and Event ID are required for get_history action' },
            { status: 400 }
          )
        }
        result = await getQRCodeHistory(guestId, eventId)
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: reset_single, reset_event, reset_guest, or get_history' },
          { status: 400 }
        )
    }

    if (result.success) {
      return NextResponse.json(result)
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error in QR reset API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 