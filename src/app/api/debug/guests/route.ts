import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    const eventId = searchParams.get('eventId')

    const result: Record<string, unknown> = {}

    // Get all guests
    const allGuests = await prisma.guest.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true
      }
    })
    result.allGuests = allGuests

    // If email provided, check specific guest
    if (email) {
      const guest = await prisma.guest.findUnique({
        where: { email },
        include: {
          eventGuests: {
            include: {
              event: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      })
      result.guestByEmail = guest
    }

    // If eventId provided, check event guests
    if (eventId) {
      const eventGuests = await prisma.eventGuest.findMany({
        where: { eventId },
        include: {
          guest: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          }
        }
      })
      result.eventGuests = eventGuests
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json({
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 