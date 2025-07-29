import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { guestId, eventId, rating, feedback } = body

    if (!guestId || !eventId) {
      return NextResponse.json(
        { error: 'Guest ID and Event ID are required' },
        { status: 400 }
      )
    }

    // Verify the guest exists and is associated with the event
    const guest = await prisma.guest.findFirst({
      where: {
        id: guestId,
        eventGuests: {
          some: {
            eventId: eventId
          }
        }
      }
    })

    if (!guest) {
      return NextResponse.json(
        { error: 'Guest not found or not associated with this event' },
        { status: 404 }
      )
    }

    // Update or create survey record
    const survey = await prisma.survey.upsert({
      where: {
        guestId: guestId
      },
      update: {
        rating: rating || 0,
        feedback: feedback || null,
        submittedAt: new Date()
      },
      create: {
        guestId: guestId,
        eventId: eventId,
        rating: rating || 0,
        feedback: feedback || null
      }
    })

    // Update invitation status to responded
    await prisma.invitation.updateMany({
      where: {
        guestId: guestId,
        eventId: eventId,
        type: 'SURVEY'
      },
      data: {
        status: 'RESPONDED',
        respondedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Survey updated successfully',
      survey
    })
  } catch (error) {
    console.error('Error updating survey:', error)
    return NextResponse.json(
      { error: 'Failed to update survey' },
      { status: 500 }
    )
  }
} 