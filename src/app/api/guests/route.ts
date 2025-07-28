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

    const eventGuests = await (prisma as any).eventGuest.findMany({
      where: { eventId },
      include: {
        guest: {
          include: {
            invitations: {
              where: { eventId },
              orderBy: { createdAt: 'desc' },
              take: 1
            },
            qrCodes: {
              where: { eventId }
            },
            survey: {
              where: { eventId }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Extract guests from eventGuests
    const guests = eventGuests.map((eg: any) => eg.guest)

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

    // Check if guest already exists globally
    let guest = await prisma.guest.findUnique({
      where: { email }
    })

    if (!guest) {
      // Create new guest
      guest = await prisma.guest.create({
        data: {
          email,
          firstName,
          lastName,
          company,
          position,
          phone,
          isVip: isVip || false
        }
      })
    }

    // Check if guest is already in this event
    const existingEventGuest = await (prisma as any).eventGuest.findUnique({
      where: {
        eventId_guestId: {
          eventId,
          guestId: guest.id
        }
      }
    })

    if (existingEventGuest) {
      return NextResponse.json(
        { error: 'Guest already exists for this event' },
        { status: 409 }
      )
    }

    // Add guest to event
    await (prisma as any).eventGuest.create({
      data: {
        eventId,
        guestId: guest.id
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