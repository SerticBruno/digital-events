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
    const { guests } = body

    if (!guests || !Array.isArray(guests)) {
      return NextResponse.json(
        { error: 'Guests array is required' },
        { status: 400 }
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
          // Create new guest using raw SQL
          const guestId = randomUUID()
          await prisma.$executeRaw`
            INSERT INTO guests (id, email, firstName, lastName, company, position, phone, isVip, createdAt, updatedAt)
            VALUES (${guestId}, ${guestData.email}, ${guestData.firstName}, ${guestData.lastName}, ${guestData.company || null}, ${guestData.position || null}, ${guestData.phone || null}, ${guestData.isVip || false}, datetime('now'), datetime('now'))
          `
          guest = {
            id: guestId,
            email: guestData.email,
            firstName: guestData.firstName,
            lastName: guestData.lastName,
            company: guestData.company || null,
            position: guestData.position || null,
            phone: guestData.phone || null,
            isVip: guestData.isVip || false,
            createdAt: new Date(),
            updatedAt: new Date()
          } as unknown as { id: string; email: string; firstName: string; lastName: string; company: string | null; position: string | null; phone: string | null; isVip: boolean; createdAt: Date; updatedAt: Date; eventId: string }
        }

        results.push({
          id: guest!.id,
          email: guest!.email,
          success: true,
          action: guest ? 'created' : 'already_exists'
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