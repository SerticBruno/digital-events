import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

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

    for (const guestData of guests) {
      try {
        // Check if guest already exists for this event
        const existingGuest = await prisma.guest.findFirst({
          where: { 
            email: guestData.email,
            eventId
          }
        })

        if (existingGuest) {
          errors.push({
            email: guestData.email,
            error: 'Guest already exists for this event'
          })
          continue
        }

        // Create guest
        const guest = await prisma.guest.create({
          data: {
            eventId,
            firstName: guestData.firstName,
            lastName: guestData.lastName,
            email: guestData.email,
            company: guestData.company || null,
            position: guestData.position || null,
            phone: guestData.phone || null,
            isVip: guestData.isVip || false
          }
        })

        results.push({
          id: guest.id,
          email: guest.email,
          success: true
        })
      } catch (error) {
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