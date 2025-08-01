import { NextRequest, NextResponse } from 'next/server'
import { sendSurvey } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    console.log('Test survey send API called')
    
    const body = await request.json()
    const { guestId, eventId } = body

    console.log('Test survey send request:', { guestId, eventId })

    if (!guestId || !eventId) {
      return NextResponse.json(
        { error: 'Guest ID and Event ID are required' },
        { status: 400 }
      )
    }

    console.log('Calling sendSurvey function...')
    const result = await sendSurvey(guestId, eventId)
    
    console.log('sendSurvey result:', result)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to send test survey:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return NextResponse.json(
      { error: `Failed to send test survey: ${errorMessage}` },
      { status: 500 }
    )
  }
} 