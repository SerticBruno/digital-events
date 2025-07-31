import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const checklist = {
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_ENV: process.env.VERCEL_ENV,
        VERCEL_URL: process.env.VERCEL_URL,
        status: 'checking'
      },
      database: {
        DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Not set',
        connection: 'checking',
        status: 'checking'
      },
      email: {
        RESEND_API_KEY: process.env.RESEND_API_KEY ? 'Set' : 'Not set',
        FROM_EMAIL: process.env.FROM_EMAIL || 'Not set',
        status: 'checking'
      },
      urls: {
        NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'Not set',
        TEST_URL: process.env.TEST_URL || 'Not set',
        GOOGLE_FORM_URL: process.env.GOOGLE_FORM_URL || 'Not set',
        status: 'checking'
      },
      summary: {
        allChecksPassed: false,
        issues: []
      }
    }

    // Test database connection
    try {
      await prisma.$queryRaw`SELECT 1 as test`
      checklist.database.connection = 'Connected'
      checklist.database.status = 'pass'
    } catch (error) {
      checklist.database.connection = 'Failed'
      checklist.database.status = 'fail'
      checklist.summary.issues.push('Database connection failed')
    }

    // Check environment
    if (process.env.NODE_ENV === 'production') {
      checklist.environment.status = 'pass'
    } else {
      checklist.environment.status = 'warning'
      checklist.summary.issues.push('Not in production environment')
    }

    // Check email configuration
    if (process.env.RESEND_API_KEY) {
      checklist.email.status = 'pass'
    } else {
      checklist.email.status = 'fail'
      checklist.summary.issues.push('RESEND_API_KEY not configured')
    }

    // Check URL configuration
    if (process.env.VERCEL_URL || process.env.NEXTAUTH_URL) {
      checklist.urls.status = 'pass'
    } else {
      checklist.urls.status = 'warning'
      checklist.summary.issues.push('No production URL configured')
    }

    // Determine overall status
    const hasFailures = checklist.database.status === 'fail' || checklist.email.status === 'fail'
    const hasWarnings = checklist.environment.status === 'warning' || checklist.urls.status === 'warning'
    
    if (hasFailures) {
      checklist.summary.allChecksPassed = false
    } else if (hasWarnings) {
      checklist.summary.allChecksPassed = true
      checklist.summary.issues.push('Some warnings but no critical failures')
    } else {
      checklist.summary.allChecksPassed = true
    }

    return NextResponse.json({
      message: 'Production checklist completed',
      checklist,
      recommendations: [
        'Ensure RESEND_API_KEY is set in Vercel environment variables',
        'Set FROM_EMAIL to a verified domain in Resend',
        'Configure NEXTAUTH_URL or VERCEL_URL for proper URL generation',
        'Verify DATABASE_URL is correctly configured',
        'Set GOOGLE_FORM_URL if using external survey forms'
      ]
    })

  } catch (error) {
    console.error('Error running production checklist:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return NextResponse.json(
      { error: `Failed to run production checklist: ${errorMessage}` },
      { status: 500 }
    )
  }
} 