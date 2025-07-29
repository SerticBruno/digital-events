import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { eventId } = params

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      )
    }

    // Get survey statistics for the event
    const stats = await prisma.$queryRaw<Array<{
      totalInvitations: number
      sentInvitations: number
      openedInvitations: number
      completedSurveys: number
      averageRating: number | null
      totalResponses: number
    }>>`
      SELECT 
        COUNT(DISTINCT i.id) as "totalInvitations",
        COUNT(DISTINCT CASE WHEN i.status = 'SENT' THEN i.id END) as "sentInvitations",
        COUNT(DISTINCT CASE WHEN i.status = 'OPENED' THEN i.id END) as "openedInvitations",
        COUNT(DISTINCT s.id) as "completedSurveys",
        AVG(s.rating) as "averageRating",
        COUNT(DISTINCT CASE WHEN i.status = 'RESPONDED' THEN i.id END) as "totalResponses"
      FROM invitations i
      LEFT JOIN surveys s ON i."guestId" = s."guestId" AND i."eventId" = s."eventId"
      WHERE i."eventId" = ${eventId}
      AND i.type = 'SURVEY'
    `

    // Get detailed survey responses
    const responses = await prisma.$queryRaw<Array<{
      guestId: string
      firstName: string
      lastName: string
      email: string
      rating: number
      feedback: string | null
      submittedAt: string
      invitationStatus: string
    }>>`
      SELECT 
        g.id as "guestId",
        g."firstName",
        g."lastName",
        g.email,
        s.rating,
        s.feedback,
        s."submittedAt",
        i.status as "invitationStatus"
      FROM guests g
      JOIN event_guests eg ON g.id = eg."guestId"
      LEFT JOIN invitations i ON g.id = i."guestId" AND eg."eventId" = i."eventId" AND i.type = 'SURVEY'
      LEFT JOIN surveys s ON g.id = s."guestId" AND eg."eventId" = s."eventId"
      WHERE eg."eventId" = ${eventId}
      ORDER BY g."lastName", g."firstName"
    `

    const result = stats[0] || {
      totalInvitations: 0,
      sentInvitations: 0,
      openedInvitations: 0,
      completedSurveys: 0,
      averageRating: null,
      totalResponses: 0
    }

    return NextResponse.json({
      stats: {
        ...result,
        averageRating: result.averageRating ? Math.round(result.averageRating * 10) / 10 : null
      },
      responses
    })
  } catch (error) {
    console.error('Error fetching survey stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch survey statistics' },
      { status: 500 }
    )
  }
} 