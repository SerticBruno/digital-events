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
  isPlusOne: boolean
  eventGuests?: Array<{
    event: {
      id: string
      name: string
    }
  }>
}

export async function GET() {
  try {
    console.log('Fetching all guests...')
    
    // Test database connection first
    await prisma.$connect()
    console.log('Database connected successfully')
    
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
        isPlusOne: true,
      },
      take: 50 // Limit results
    })
    
    console.log(`Found ${guests.length} guests in database`)

    // Get event relationships for these guests
    let eventGuests: Array<{
      guestId: string;
      eventId: string;
      eventName: string;
    }> = []
    
    if (guests.length > 0) {
      eventGuests = await prisma.$queryRaw<Array<{
        guestId: string;
        eventId: string;
        eventName: string;
      }>>`
        SELECT eg."guestId", e.id as "eventId", e.name as "eventName"
        FROM event_guests eg
        JOIN events e ON eg."eventId" = e.id
        WHERE eg."guestId" IN (${guests.map(g => g.id).join(',')})
      `
    }

    // Create a map of guest ID to their events
    const guestEventMap = new Map<string, Array<{ id: string; name: string }>>()
    eventGuests.forEach((eg) => {
      if (!guestEventMap.has(eg.guestId)) {
        guestEventMap.set(eg.guestId, [])
      }
      guestEventMap.get(eg.guestId)!.push({ id: eg.eventId, name: eg.eventName })
    })

    // Transform the data to match the expected format
    const transformedGuests: TransformedGuest[] = guests.map(guest => ({
      ...guest,
      eventGuests: guestEventMap.get(guest.id)?.map(event => ({ event })) || []
    }))

    console.log('Total guests returned:', transformedGuests.length)
    return NextResponse.json(transformedGuests)

  } catch (error) {
    console.error('Get all guests error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get guests',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
} 