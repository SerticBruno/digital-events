import { NextRequest, NextResponse } from 'next/server'
import { sendTestEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      )
    }

    // For testing, only allow sending to your own email address
    const allowedEmails = ['budasevo.trouts@gmail.com'] // Add your email here
    if (!allowedEmails.includes(email)) {
      return NextResponse.json(
        { error: 'For testing, you can only send emails to your own email address. Please use: ' + allowedEmails.join(', ') },
        { status: 400 }
      )
    }

    console.log('Testing email sending to:', email)

    const result = await sendTestEmail(email)

    if (result.success) {
      return NextResponse.json({
        message: 'Test email sent successfully',
        result: result
      })
    } else {
      return NextResponse.json(
        { error: `Failed to send test email: ${result.error}` },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Failed to send test email:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json(
      { error: `Failed to send test email: ${errorMessage}` },
      { status: 500 }
    )
  }
} 