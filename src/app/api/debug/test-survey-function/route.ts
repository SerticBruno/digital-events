import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { guestId, eventId } = body

    if (!guestId || !eventId) {
      return NextResponse.json(
        { error: 'Guest ID and Event ID are required' },
        { status: 400 }
      )
    }

    console.log('Testing sendSurvey function with:', { guestId, eventId })

    // Test the sendSurvey function directly
    const { sendSurvey } = await import('@/lib/email')
    const result = await sendSurvey(guestId, eventId)
    
    return NextResponse.json({
      message: 'sendSurvey function test completed',
      result,
      debug: {
        guestId,
        eventId,
        success: result.success,
        error: result.error || null
      }
    })

  } catch (error) {
    console.error('Error testing sendSurvey function:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('Detailed error:', errorMessage)
    
    return NextResponse.json(
      { error: `Failed to test sendSurvey function: ${errorMessage}` },
      { status: 500 }
    )
  }
} 