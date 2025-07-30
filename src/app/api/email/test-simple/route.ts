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
    console.log('RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY)
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

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.FROM_EMAIL || 'onboarding@resend.dev',
        to: [to],
        subject: 'Test Email - Digital Events System',
        html: testHtml,
      }),
    })

    console.log('Resend API response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Resend API error:', errorText)
      return NextResponse.json({
        error: `Email test failed: ${errorText}`,
        status: response.status
      }, { status: 500 })
    }

    const responseData = await response.json()
    console.log('Email test successful:', responseData)

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
      data: responseData
    })

  } catch (error) {
    console.error('Email test error:', error)
    return NextResponse.json({
      error: 'Email test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 