import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST() {
  try {
    // Test connection first
    await prisma.$connect()
    console.log('Database connected successfully')
    
    // Drop existing tables if they exist (to ensure clean slate)
    console.log('Dropping existing tables...')
    await prisma.$executeRaw`DROP TABLE IF EXISTS surveys CASCADE`
    await prisma.$executeRaw`DROP TABLE IF EXISTS qr_codes CASCADE`
    await prisma.$executeRaw`DROP TABLE IF EXISTS invitations CASCADE`
    await prisma.$executeRaw`DROP TABLE IF EXISTS event_guests CASCADE`
    await prisma.$executeRaw`DROP TABLE IF EXISTS guests CASCADE`
    await prisma.$executeRaw`DROP TABLE IF EXISTS events CASCADE`
    
    // Create tables with proper Prisma-compatible structure
    console.log('Creating tables with proper structure...')
    
    await prisma.$executeRaw`CREATE TABLE events (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      date TIMESTAMP(3) NOT NULL,
      location TEXT,
      "maxGuests" INTEGER,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
    
    await prisma.$executeRaw`CREATE TABLE guests (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      "firstName" TEXT NOT NULL,
      "lastName" TEXT NOT NULL,
      company TEXT,
      position TEXT,
      phone TEXT,
      "isVip" BOOLEAN NOT NULL DEFAULT false,
      "isPlusOne" BOOLEAN NOT NULL DEFAULT false,
      "canHavePlusOne" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
    
    await prisma.$executeRaw`CREATE TABLE event_guests (
      id TEXT PRIMARY KEY,
      "eventId" TEXT NOT NULL,
      "guestId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("eventId") REFERENCES events(id) ON DELETE CASCADE,
      FOREIGN KEY ("guestId") REFERENCES guests(id) ON DELETE CASCADE,
      UNIQUE("eventId", "guestId")
    )`
    
    await prisma.$executeRaw`CREATE TABLE invitations (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      "sentAt" TIMESTAMP(3),
      "openedAt" TIMESTAMP(3),
      "respondedAt" TIMESTAMP(3),
      response TEXT,
      "hasPlusOne" BOOLEAN NOT NULL DEFAULT false,
      "plusOneName" TEXT,
      "plusOneEmail" TEXT,
      "guestId" TEXT NOT NULL,
      "eventId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("guestId") REFERENCES guests(id) ON DELETE CASCADE,
      FOREIGN KEY ("eventId") REFERENCES events(id) ON DELETE CASCADE
    )`
    
    await prisma.$executeRaw`CREATE TABLE qr_codes (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'CREATED',
      "usedAt" TIMESTAMP(3),
      "guestId" TEXT NOT NULL,
      "eventId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("guestId") REFERENCES guests(id) ON DELETE CASCADE,
      FOREIGN KEY ("eventId") REFERENCES events(id) ON DELETE CASCADE
    )`
    
    await prisma.$executeRaw`CREATE TABLE surveys (
      id TEXT PRIMARY KEY,
      rating INTEGER NOT NULL,
      feedback TEXT,
      "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "guestId" TEXT NOT NULL UNIQUE,
      "eventId" TEXT NOT NULL,
      FOREIGN KEY ("guestId") REFERENCES guests(id) ON DELETE CASCADE,
      FOREIGN KEY ("eventId") REFERENCES events(id) ON DELETE CASCADE
    )`
    
    console.log('Database schema initialized successfully')
    
    return NextResponse.json({
      status: 'success',
      message: 'Database schema initialized successfully with proper Prisma structure',
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