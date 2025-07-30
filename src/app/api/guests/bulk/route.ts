import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { randomUUID } from 'crypto'

interface GuestData {
  firstName: string
  lastName: string
  email: string
  company?: string
  position?: string
  phone?: string
  isVip?: boolean
}



export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { eventId, guests } = body

    if (!eventId || !guests || !Array.isArray(guests)) {
      return NextResponse.json(
        { error: 'Event ID and guests array are required' },
        { status: 400 }
      )
    }

    // Validate event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    })

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    const results = []
    const errors = []

    for (const guestData of guests as GuestData[]) {
      try {
        // Check if guest already exists globally
        let guest = await prisma.guest.findUnique({
          where: { email: guestData.email }
        })

        if (!guest) {
          // Create new guest using Prisma ORM
          guest = await prisma.guest.create({
            data: {
              email: guestData.email,
              firstName: guestData.firstName,
              lastName: guestData.lastName,
              company: guestData.company || null,
              position: guestData.position || null,
              phone: guestData.phone || null,
              isVip: guestData.isVip || false,
              isPlusOne: false,
              canHavePlusOne: false
            }
          })
        }

        // Check if guest is already in this event using Prisma ORM
        const existingEventGuest = await prisma.eventGuest.findFirst({
          where: {
            eventId,
            guestId: guest!.id
          }
        })

        if (existingEventGuest) {
          errors.push({
            email: guestData.email,
            error: 'Guest already exists for this event'
          })
          continue
        }

        // Add guest to event using Prisma ORM
        await prisma.eventGuest.create({
          data: {
            eventId,
            guestId: guest!.id
          }
        })

        // Create invitation with PENDING status for the new guest (not sent yet)
        await prisma.invitation.create({
          data: {
            guestId: guest!.id,
            eventId,
            type: 'INVITATION',
            status: 'PENDING',
            hasPlusOne: false
          }
        })

        results.push({
          id: guest!.id,
          email: guest!.email,
          success: true
        })
      } catch {
        errors.push({
          email: guestData.email,
          error: 'Failed to create guest'
        })
      }
    }

    const successCount = results.length
    const errorCount = errors.length

    return NextResponse.json({
      message: `Successfully imported ${successCount} guests, ${errorCount} failed`,
      results,
      errors
    })
  } catch (error) {
    console.error('Failed to bulk import guests:', error)
    return NextResponse.json(
      { error: 'Failed to bulk import guests' },
      { status: 500 }
    )
  }
} 