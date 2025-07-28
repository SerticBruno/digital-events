import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      )
    }

    const guests = await prisma.guest.findMany({
      where: { eventId },
      include: {
        invitations: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        qrCodes: true,
        survey: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(guests)
  } catch (error) {
    console.error('Failed to fetch guests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch guests' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      eventId, 
      email, 
      firstName, 
      lastName, 
      company, 
      position, 
      phone, 
      isVip 
    } = body

    if (!eventId || !email || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Event ID, email, first name, and last name are required' },
        { status: 400 }
      )
    }

    // Check if guest already exists for this event
    const existingGuest = await prisma.guest.findFirst({
      where: { 
        email,
        eventId
      }
    })

    if (existingGuest) {
      return NextResponse.json(
        { error: 'Guest already exists for this event' },
        { status: 409 }
      )
    }

    const guest = await prisma.guest.create({
      data: {
        eventId,
        email,
        firstName,
        lastName,
        company,
        position,
        phone,
        isVip: isVip || false
      }
    })

    return NextResponse.json(guest, { status: 201 })
  } catch (error) {
    console.error('Failed to create guest:', error)
    return NextResponse.json(
      { error: 'Failed to create guest' },
      { status: 500 }
    )
  }
} 