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

    // Search guests by name, email, or company
    const guests = await (prisma as any).guest.findMany({
      where: {
        OR: [
          {
            firstName: {
              contains: searchTerm
            }
          },
          {
            lastName: {
              contains: searchTerm
            }
          },
          {
            email: {
              contains: searchTerm
            }
          },
          {
            company: {
              contains: searchTerm
            }
          }
        ]
      },
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
      take: 20 // Limit results
    })

    // Transform the data to match the expected format
    const transformedGuests = guests.map((guest: any) => ({
      ...guest,
      event: guest.eventGuests[0]?.event || null
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