import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { guestId, eventId, response } = body

    console.log('Direct Respond API called with:', { guestId, eventId, response })
    
    if (!guestId || !eventId || !response) {
      return NextResponse.json(
        { error: 'Guest ID, event ID, and response are required' },
        { status: 400 }
      )
    }

    // Validate response values
    const validResponses = ['COMING', 'NOT_COMING']
    if (!validResponses.includes(response)) {
      return NextResponse.json(
        { error: 'Invalid response value' },
        { status: 400 }
      )
    }

    // Check if guest exists and is part of the event
    const eventGuest = await prisma.eventGuest.findFirst({
      where: {
        guestId,
        eventId
      }
    })

    console.log('EventGuest found:', eventGuest)

    if (!eventGuest) {
      return NextResponse.json(
        { error: 'Guest not found in this event' },
        { status: 404 }
      )
    }

    // Find the most recent invitation or create new one
    let invitation = await prisma.invitation.findFirst({
      where: {
        guestId,
        eventId
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (invitation) {
      // Update existing invitation
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: {
          response,
          respondedAt: new Date()
        }
      })
    } else {
          // Create new invitation
    invitation = await prisma.invitation.create({
      data: {
        guestId,
        eventId,
        type: 'INVITATION',
        response,
        respondedAt: new Date()
      }
    })
    }

    console.log('Response recorded:', invitation)

    return NextResponse.json({
      success: true,
      message: 'Response recorded successfully',
      invitation
    })

  } catch (error) {
    console.error('Error in direct respond API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 