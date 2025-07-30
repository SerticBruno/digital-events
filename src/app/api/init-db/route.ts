import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST() {
  try {
    // Test connection first
    await prisma.$connect()
    console.log('Database connected successfully')
    
    // Try to create a simple table to test if we have write permissions
    // This will fail if the schema doesn't exist, which is what we want to detect
    await prisma.event.findFirst()
    
    return NextResponse.json({
      status: 'success',
      message: 'Database schema is already initialized',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Database initialization check failed:', error)
    
    // If we get a table doesn't exist error, we need to initialize the schema
    if (error instanceof Error && (
      error.message.includes('does not exist') ||
      error.message.includes('relation') ||
      error.message.includes('table')
    )) {
      return NextResponse.json({
        status: 'schema_missing',
        message: 'Database schema needs to be initialized. Please run: npx prisma db push',
        error: error.message,
        timestamp: new Date().toISOString()
      }, { status: 400 })
    }
    
    return NextResponse.json({
      status: 'error',
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
} 