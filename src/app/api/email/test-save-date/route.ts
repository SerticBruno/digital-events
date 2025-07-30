import { NextRequest, NextResponse } from 'next/server'
import { sendSaveTheDate } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { guestId, eventId } = body

    if (!guestId) {
      return NextResponse.json({
        error: 'Guest ID is required'
      }, { status: 400 })
    }

    console.log('Testing save the date email for:', { guestId, eventId })

    const result = await sendSaveTheDate(guestId, eventId)

    return NextResponse.json({
      success: true,
      result
    })
  } catch (error) {
    console.error('Test save the date error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
} 