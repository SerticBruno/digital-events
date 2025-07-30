import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST() {
  try {
    // Test connection first
    await prisma.$connect()
    console.log('Database connected successfully')
    
    // Try to push the schema
    console.log('Pushing database schema...')
    
    // This will create all the tables based on your Prisma schema
    await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      date TIMESTAMP NOT NULL,
      location TEXT,
      maxGuests INTEGER,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
    
    await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS guests (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      company TEXT,
      position TEXT,
      phone TEXT,
      isVip BOOLEAN DEFAULT FALSE,
      isPlusOne BOOLEAN DEFAULT FALSE,
      canHavePlusOne BOOLEAN DEFAULT FALSE,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
    
    await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS event_guests (
      id TEXT PRIMARY KEY,
      eventId TEXT NOT NULL,
      guestId TEXT NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE,
      FOREIGN KEY (guestId) REFERENCES guests(id) ON DELETE CASCADE,
      UNIQUE(eventId, guestId)
    )`
    
    await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS invitations (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING',
      sentAt TIMESTAMP,
      openedAt TIMESTAMP,
      respondedAt TIMESTAMP,
      response TEXT,
      hasPlusOne BOOLEAN DEFAULT FALSE,
      plusOneName TEXT,
      plusOneEmail TEXT,
      guestId TEXT NOT NULL,
      eventId TEXT NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (guestId) REFERENCES guests(id) ON DELETE CASCADE,
      FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE
    )`
    
    await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS qr_codes (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL,
      status TEXT DEFAULT 'CREATED',
      usedAt TIMESTAMP,
      guestId TEXT NOT NULL,
      eventId TEXT NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (guestId) REFERENCES guests(id) ON DELETE CASCADE,
      FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE
    )`
    
    await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS surveys (
      id TEXT PRIMARY KEY,
      rating INTEGER NOT NULL,
      feedback TEXT,
      submittedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      guestId TEXT UNIQUE NOT NULL,
      eventId TEXT NOT NULL,
      FOREIGN KEY (guestId) REFERENCES guests(id) ON DELETE CASCADE,
      FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE
    )`
    
    console.log('Database schema initialized successfully')
    
    return NextResponse.json({
      status: 'success',
      message: 'Database schema initialized successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Database setup failed:', error)
    
    return NextResponse.json({
      status: 'error',
      message: 'Failed to initialize database schema',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
} 