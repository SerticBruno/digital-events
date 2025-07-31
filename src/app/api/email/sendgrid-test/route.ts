import { NextRequest, NextResponse } from 'next/server'
import { sendSendGridEmail } from '@/lib/sendgrid'

export async function POST(request: NextRequest) {
  try {
    const { to, subject, html } = await request.json()

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, html' },
        { status: 400 }
      )
    }

    console.log('Testing SendGrid email to:', to)

    const result = await sendSendGridEmail({
      to,
      subject,
      html,
      customArgs: {
        test: 'true',
        timestamp: new Date().toISOString()
      }
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'SendGrid email sent successfully',
        data: result.data
      })
    } else {
      return NextResponse.json(
        { 
          success: false,
          error: result.error,
          details: result.errorDetails 
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in SendGrid test endpoint:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'SendGrid test endpoint',
    usage: 'POST with { to, subject, html }',
    environment: {
      hasApiKey: !!process.env.SENDGRID_API_KEY,
      fromEmail: process.env.SENDGRID_FROM_EMAIL,
      fromName: process.env.SENDGRID_FROM_NAME,
      replyTo: process.env.SENDGRID_REPLY_TO
    }
  })
} 