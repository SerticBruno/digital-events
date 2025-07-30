import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Check environment variables (without exposing sensitive data)
    const envInfo = {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Not set',
      DATABASE_URL_LENGTH: process.env.DATABASE_URL?.length || 0,
      DATABASE_URL_STARTS_WITH: process.env.DATABASE_URL?.substring(0, 10) || 'N/A',
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_URL: process.env.VERCEL_URL,
    }
    
    return NextResponse.json({
      status: 'success',
      environment: envInfo,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Environment test failed:', error)
    return NextResponse.json(
      { 
        status: 'error',
        error: 'Environment test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
} 