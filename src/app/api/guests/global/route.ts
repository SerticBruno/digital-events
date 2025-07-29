import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { randomUUID } from 'crypto'

interface GuestData {
  email: string
  firstName: string
  lastName: string
  company?: string
  position?: string
  phone?: string
  isVip?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as GuestData
    const { 
      email, 
      firstName, 
      lastName, 
      company, 
      position, 
      phone, 
      isVip 
    } = body

    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Email, first name, and last name are required' },
        { status: 400 }
      )
    }

    // Check if guest already exists globally
    const existingGuest = await prisma.guest.findUnique({
      where: { email }
    })

    if (existingGuest) {
      return NextResponse.json(
        { error: 'Guest with this email already exists' },
        { status: 409 }
      )
    }

    // Create new guest globally (without event) using raw SQL
    const guestId = randomUUID()
    await prisma.$executeRaw`
      INSERT INTO guests (id, email, firstName, lastName, company, position, phone, isVip, createdAt, updatedAt)
      VALUES (${guestId}, ${email}, ${firstName}, ${lastName}, ${company || null}, ${position || null}, ${phone || null}, ${isVip || false}, datetime('now'), datetime('now'))
    `
    
    const guest = {
      id: guestId,
      email,
      firstName,
      lastName,
      company: company || null,
      position: position || null,
      phone: phone || null,
      isVip: isVip || false
    }

    return NextResponse.json(guest, { status: 201 })
  } catch (error) {
    console.error('Failed to create global guest:', error)
    return NextResponse.json(
      { error: 'Failed to create guest' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const guestId = searchParams.get('guestId')

    if (!guestId) {
      return NextResponse.json(
        { error: 'Guest ID is required' },
        { status: 400 }
      )
    }

    // Check if guest exists and get their invitations to find plus-ones
    const guest = await prisma.guest.findUnique({
      where: { id: guestId },
      include: {
        eventGuests: {
          include: {
            event: true
          }
        },
        invitations: {
          where: {
            hasPlusOne: true
          },
          select: {
            plusOneEmail: true
          }
        }
      }
    })

    if (!guest) {
      return NextResponse.json(
        { error: 'Guest not found' },
        { status: 404 }
      )
    }

    // Find plus-one guests to delete (cascade deletion)
    // When a guest is deleted, if they have plus-ones, those plus-ones should also be deleted
    // since they were created specifically for this guest and have no independent existence
    const plusOneEmails = guest.invitations
      .map(inv => inv.plusOneEmail)
      .filter(email => email) as string[]

    const deletedPlusOnes: Array<{ email: string; firstName: string; lastName: string }> = []
    
    if (plusOneEmails.length > 0) {
      // Find plus-one guests by their emails
      const plusOneGuests = await prisma.guest.findMany({
        where: {
          email: {
            in: plusOneEmails
          }
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true
        }
      })

      // Delete plus-one guests first (before deleting the main guest)
      for (const plusOneGuest of plusOneGuests) {
        await prisma.guest.delete({
          where: { id: plusOneGuest.id }
        })
        deletedPlusOnes.push({
          email: plusOneGuest.email,
          firstName: plusOneGuest.firstName,
          lastName: plusOneGuest.lastName
        })
      }
    }

    // Get list of events this guest is associated with for the response
    const associatedEvents = guest.eventGuests.map(eg => eg.event.name)

    // Delete the main guest (this will cascade delete all related records)
    await prisma.guest.delete({
      where: { id: guestId }
    })

    return NextResponse.json({ 
      message: 'Guest deleted successfully',
      deletedGuest: {
        id: guest.id,
        firstName: guest.firstName,
        lastName: guest.lastName,
        email: guest.email
      },
      deletedPlusOnes,
      associatedEvents
    })
  } catch (error) {
    console.error('Failed to delete guest:', error)
    return NextResponse.json(
      { error: 'Failed to delete guest' },
      { status: 500 }
    )
  }
} 