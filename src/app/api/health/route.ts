import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    // Test database connection
    await prisma.$connect()
    
    // Try to query the events table to see if it exists
    const eventCount = await prisma.event.count()
    
    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      eventsCount: eventCount,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Health check failed:', error)
    
    // If the table doesn't exist, try to push the schema
    if (error instanceof Error && error.message.includes('does not exist')) {
      try {
        console.log('Attempting to push database schema...')
        await prisma.$executeRaw`SELECT 1` // Test connection
        return NextResponse.json({
          status: 'schema_missing',
          message: 'Database connected but schema needs to be initialized',
          timestamp: new Date().toISOString()
        })
      } catch (schemaError) {
        console.error('Schema push failed:', schemaError)
        return NextResponse.json({
          status: 'error',
          message: 'Database connection or schema initialization failed',
          error: schemaError instanceof Error ? schemaError.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }, { status: 500 })
      }
    }
    
    return NextResponse.json({
      status: 'error',
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
} 