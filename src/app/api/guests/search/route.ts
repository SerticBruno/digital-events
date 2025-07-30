import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'



export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query || query.trim().length < 2) {
      return NextResponse.json([])
    }

    const searchTerm = query.trim()
    
    console.log('Searching for guests with term:', searchTerm)

    // Search guests by name, email, or company using raw SQL
    const guests = await prisma.$queryRaw<Array<{
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      company: string | null;
      position: string | null;
      phone: string | null;
      isVip: boolean;
    }>>`
      SELECT id, "firstName", "lastName", email, company, position, phone, "isVip"
      FROM guests
      WHERE "firstName" LIKE ${`%${searchTerm}%`} 
         OR "lastName" LIKE ${`%${searchTerm}%`}
         OR email LIKE ${`%${searchTerm}%`}
         OR company LIKE ${`%${searchTerm}%`}
      LIMIT 20
    `

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
    eventGuests.forEach(eg => {
      if (!guestEventMap.has(eg.guestId)) {
        guestEventMap.set(eg.guestId, [])
      }
      guestEventMap.get(eg.guestId)!.push({ id: eg.eventId, name: eg.eventName })
    })

    // Transform the data to match the expected format
    const transformedGuests = guests.map(guest => ({
      ...guest,
      eventGuests: guestEventMap.get(guest.id)?.map(event => ({ event })) || []
    }))

    console.log('Found guests:', transformedGuests.length)
    return NextResponse.json(transformedGuests)

  } catch (error) {
    console.error('Guest search error:', error)
    return NextResponse.json(
      { error: 'Failed to search guests' },
      { status: 500 }
    )
  }
} 