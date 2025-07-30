import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    console.log('Testing database connection...')
    
    // Test basic connection
    await prisma.$connect()
    console.log('Database connection successful')
    
    // Test basic query
    const guestCount = await prisma.guest.count()
    console.log(`Guest count: ${guestCount}`)
    
    // Test event query
    const eventCount = await prisma.event.count()
    console.log(`Event count: ${eventCount}`)
    
    return NextResponse.json({
      status: 'success',
      message: 'Database connection and queries working',
      guestCount,
      eventCount,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Database test failed:', error)
    return NextResponse.json(
      { 
        status: 'error',
        error: 'Database connection failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
} 