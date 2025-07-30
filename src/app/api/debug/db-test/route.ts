import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    console.log('Testing database connection...')
    
    // Test basic connection
    await prisma.$connect()
    console.log('Database connection successful')
    
    // Test if tables exist by checking table names
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `
    console.log('Available tables:', tables.map(t => t.tablename))
    
    // Test basic queries with error handling
    let guestCount = 0
    let eventCount = 0
    let guestError = null
    let eventError = null
    
    try {
      guestCount = await prisma.guest.count()
      console.log(`Guest count: ${guestCount}`)
    } catch (error) {
      guestError = error instanceof Error ? error.message : 'Unknown error'
      console.error('Guest count error:', guestError)
    }
    
    try {
      eventCount = await prisma.event.count()
      console.log(`Event count: ${eventCount}`)
    } catch (error) {
      eventError = error instanceof Error ? error.message : 'Unknown error'
      console.error('Event count error:', eventError)
    }
    
    // Test a simple guest query
    let sampleGuests: Array<{ id: string; email: string; firstName: string; lastName: string }> = []
    try {
      sampleGuests = await prisma.guest.findMany({
        take: 5,
        select: { id: true, email: true, firstName: true, lastName: true }
      })
      console.log('Sample guests:', sampleGuests)
    } catch (error) {
      console.error('Sample guests query error:', error)
    }
    
    return NextResponse.json({
      status: 'success',
      message: 'Database connection and queries working',
      tables: tables.map(t => t.tablename),
      guestCount,
      eventCount,
      guestError,
      eventError,
      sampleGuests,
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