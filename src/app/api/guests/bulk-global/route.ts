import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { guests } = body

    if (!guests || !Array.isArray(guests)) {
      return NextResponse.json(
        { error: 'Guests array is required' },
        { status: 400 }
      )
    }

    const results = []
    const errors = []

    for (const guestData of guests) {
      try {
        // Check if guest already exists globally
        let guest = await (prisma as any).guest.findUnique({
          where: { email: guestData.email }
        })

        if (!guest) {
          // Create new guest
          guest = await (prisma as any).guest.create({
            data: {
              firstName: guestData.firstName,
              lastName: guestData.lastName,
              email: guestData.email,
              company: guestData.company || null,
              position: guestData.position || null,
              phone: guestData.phone || null,
              isVip: guestData.isVip || false
            }
          })
        }

        results.push({
          id: guest.id,
          email: guest.email,
          success: true,
          action: guest ? 'created' : 'already_exists'
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
      message: `Successfully processed ${successCount} guests, ${errorCount} failed`,
      results,
      errors
    })
  } catch (error) {
    console.error('Failed to bulk import global guests:', error)
    return NextResponse.json(
      { error: 'Failed to bulk import guests' },
      { status: 500 }
    )
  }
} 