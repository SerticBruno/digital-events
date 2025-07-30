import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Check environment variables
    const envCheck = {
      RESEND_API_KEY: !!process.env.RESEND_API_KEY,
      FROM_EMAIL: !!process.env.FROM_EMAIL,
      NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
      TEST_URL: !!process.env.TEST_URL
    }

    // Test database connection
    let dbStatus = 'unknown'
    let guestCount = 0
    let eventCount = 0
    
    try {
      guestCount = await prisma.guest.count()
      eventCount = await prisma.event.count()
      dbStatus = 'connected'
    } catch (error) {
      dbStatus = `error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }

    // Test a simple guest query
    let sampleGuest = null
    try {
      sampleGuest = await prisma.guest.findFirst({
        select: { id: true, email: true, firstName: true, lastName: true }
      })
    } catch (error) {
      console.error('Sample guest query error:', error)
    }

    // Test event_guests query
    let eventGuestCount = 0
    try {
      eventGuestCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count FROM event_guests
      `
      eventGuestCount = Number(eventGuestCount[0]?.count || 0)
    } catch (error) {
      console.error('Event guests query error:', error)
    }

    return NextResponse.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      environment: envCheck,
      database: {
        status: dbStatus,
        guestCount,
        eventCount,
        eventGuestCount,
        sampleGuest
      }
    })
  } catch (error) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
} 