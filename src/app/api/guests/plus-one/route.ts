import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { guestId, eventId, hasPlusOne } = body

    if (!guestId || !eventId || typeof hasPlusOne !== 'boolean') {
      return NextResponse.json(
        { error: 'Guest ID, event ID, and hasPlusOne boolean are required' },
        { status: 400 }
      )
    }

    // Check if guest exists in this event
    const eventGuest = await prisma.eventGuest.findFirst({
      where: { guestId, eventId }
    })

    if (!eventGuest) {
      return NextResponse.json(
        { error: 'Guest not found in this event' },
        { status: 404 }
      )
    }

    // Update or create invitation record
    let invitation = await prisma.invitation.findFirst({
      where: { guestId, eventId }
    })

    if (invitation) {
      // Update existing invitation
      invitation = await prisma.invitation.update({
        where: { id: invitation.id },
        data: { hasPlusOne }
      })
    } else {
      // Create new invitation with PENDING status for regular guests
      invitation = await prisma.invitation.create({
        data: {
          guestId,
          eventId,
          type: 'INVITATION',
          status: 'PENDING',
          hasPlusOne
        }
      })
    }

    return NextResponse.json({
      message: 'Plus-one status updated successfully',
      invitation
    })
  } catch (error) {
    console.error('Failed to update plus-one status:', error)
    return NextResponse.json(
      { error: 'Failed to update plus-one status' },
      { status: 500 }
    )
  }
} 