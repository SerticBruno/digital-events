import sgMail from '@sendgrid/mail'

// Initialize SendGrid with API key
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

export interface SendGridEmailData {
  to: string
  subject: string
  html: string
  from?: string
  replyTo?: string
  trackingSettings?: {
    clickTracking?: boolean
    openTracking?: boolean
    subscriptionTracking?: boolean
  }
  customArgs?: Record<string, string>
}

export async function sendSendGridEmail(data: SendGridEmailData) {
  try {
    console.log('sendSendGridEmail called with:', { 
      to: data.to, 
      subject: data.subject,
      from: data.from || process.env.SENDGRID_FROM_EMAIL 
    })
    
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error('SENDGRID_API_KEY environment variable is not set')
    }

    if (!data.to) {
      throw new Error('Recipient email address is required')
    }

    // Default from email
    const fromEmail = data.from || process.env.SENDGRID_FROM_EMAIL || 'noreply@yourdomain.com'
    
    const msg = {
      to: data.to,
      from: {
        email: fromEmail,
        name: process.env.SENDGRID_FROM_NAME || 'Event Team'
      },
      subject: data.subject,
      html: data.html,
      replyTo: data.replyTo || process.env.SENDGRID_REPLY_TO,
      trackingSettings: {
        clickTracking: {
          enable: data.trackingSettings?.clickTracking ?? true,
          enableText: false
        },
        openTracking: {
          enable: data.trackingSettings?.openTracking ?? true
        },
        subscriptionTracking: {
          enable: data.trackingSettings?.subscriptionTracking ?? false
        }
      },
      customArgs: {
        ...data.customArgs,
        source: 'digital-events',
        timestamp: new Date().toISOString()
      },
      headers: {
        'X-Priority': '3',
        'X-MSMail-Priority': 'Normal',
        'Importance': 'normal',
        'X-Mailer': 'Digital Events System'
      },
      categories: ['event-invitation'],
      personalizations: [{
        to: [{ email: data.to }],
        customArgs: {
          guest_email: data.to,
          sent_at: new Date().toISOString()
        }
      }]
    }

    console.log('Sending SendGrid email with configuration:', {
      from: msg.from,
      to: msg.to,
      subject: msg.subject,
      hasTracking: !!msg.trackingSettings
    })

    const response = await sgMail.send(msg)
    
    console.log('SendGrid API success response:', {
      statusCode: response[0].statusCode,
      headers: response[0].headers,
      messageId: response[0].headers['x-message-id']
    })

    return { 
      success: true, 
      data: {
        messageId: response[0].headers['x-message-id'],
        statusCode: response[0].statusCode
      }
    }
  } catch (error) {
    console.error('Failed to send SendGrid email:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('SendGrid email error stack:', errorStack)
    
    return { 
      success: false, 
      error: errorMessage,
      errorDetails: errorStack ? errorStack.split('\n').slice(0, 3).join('\n') : undefined
    }
  }
} 