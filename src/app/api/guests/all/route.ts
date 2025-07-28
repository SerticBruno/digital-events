import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface TransformedGuest {
  id: string
  firstName: string
  lastName: string
  email: string
  company: string | null
  position: string | null
  phone: string | null
  isVip: boolean
  event: {
    id: string
    name: string
  } | null
}

export async function GET() {
  try {
    // Get all guests
    const guests = await prisma.guest.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        company: true,
        position: true,
        phone: true,
        isVip: true,
      },
      take: 50 // Limit results
    })

    // Get event relationships for these guests
    const eventGuests = await prisma.$queryRaw<Array<{
      guestId: string;
      eventId: string;
      eventName: string;
    }>>`
      SELECT eg.guestId, e.id as eventId, e.name as eventName
      FROM event_guests eg
      JOIN events e ON eg.eventId = e.id
      WHERE eg.guestId IN (${guests.map(g => g.id).join(',')})
    `

    // Create a map of guest ID to their first event
    const guestEventMap = new Map<string, { id: string; name: string }>()
    eventGuests.forEach((eg) => {
      if (!guestEventMap.has(eg.guestId)) {
        guestEventMap.set(eg.guestId, { id: eg.eventId, name: eg.eventName })
      }
    })

    // Transform the data to match the expected format
    const transformedGuests: TransformedGuest[] = guests.map(guest => ({
      ...guest,
      event: guestEventMap.get(guest.id) || null
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