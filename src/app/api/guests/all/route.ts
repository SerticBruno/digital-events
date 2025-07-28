import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const guests = await (prisma as any).guest.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        company: true,
        position: true,
        phone: true,
        isVip: true,
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
      },
      take: 50 // Limit results
    })

    // Transform the data to match the expected format
    const transformedGuests = guests.map((guest: any) => ({
      ...guest,
      event: guest.eventGuests[0]?.event || null
    }))

    console.log('Total guests in database:', transformedGuests.length)
    return NextResponse.json(transformedGuests)

  } catch (error) {
    console.error('Get all guests error:', error)
    return NextResponse.json(
      { error: 'Failed to get guests' },
      { status: 500 }
    )
  }
} 