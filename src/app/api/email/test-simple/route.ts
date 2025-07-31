import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { to } = body

    if (!to) {
      return NextResponse.json({
        error: 'Email address is required'
      }, { status: 400 })
    }

    console.log('Testing email configuration...')
    console.log('SENDGRID_API_KEY exists:', !!process.env.SENDGRID_API_KEY)
    console.log('FROM_EMAIL:', process.env.FROM_EMAIL)
    console.log('Sending test email to:', to)

    const testHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Test Email</title>
      </head>
      <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h1>Test Email</h1>
        <p>This is a test email to verify the email configuration is working correctly.</p>
        <p>If you received this email, the email system is configured properly.</p>
        <p>Timestamp: ${new Date().toISOString()}</p>
      </body>
      </html>
    `

    const { sendSendGridEmail } = await import('@/lib/sendgrid')
    
    const result = await sendSendGridEmail({
      to,
      subject: 'Test Email - Digital Events System',
      html: testHtml,
      from: process.env.SENDGRID_FROM_EMAIL
    })

    if (!result.success) {
      console.error('SendGrid API error:', result.error)
      return NextResponse.json({
        error: `Email test failed: ${result.error}`,
        status: 500
      }, { status: 500 })
    }

    console.log('Email test successful:', result.data)

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
      data: result.data
    })

  } catch (error) {
    console.error('Email test error:', error)
    return NextResponse.json({
      error: 'Email test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 