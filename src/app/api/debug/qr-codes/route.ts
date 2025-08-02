import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const eventId = searchParams.get('eventId')
    const guestId = searchParams.get('guestId')
    const limit = parseInt(searchParams.get('limit') || '50')

    let whereClause = ''
    const params: (string | number)[] = []
    let paramIndex = 1

    if (code) {
      whereClause += `WHERE qr.code = $${paramIndex}`
      params.push(code)
      paramIndex++
    }

    if (eventId) {
      if (whereClause) {
        whereClause += ` AND qr."eventId" = $${paramIndex}`
      } else {
        whereClause += `WHERE qr."eventId" = $${paramIndex}`
      }
      params.push(eventId)
      paramIndex++
    }

    if (guestId) {
      if (whereClause) {
        whereClause += ` AND qr."guestId" = $${paramIndex}`
      } else {
        whereClause += `WHERE qr."guestId" = $${paramIndex}`
      }
      params.push(guestId)
      paramIndex++
    }

    const query = `
      SELECT 
        qr.id,
        qr.code,
        qr.type,
        qr.status,
        qr."usedAt",
        qr."createdAt",
        qr."guestId",
        qr."eventId",
        g."firstName",
        g."lastName",
        g.email,
        g."isVip",
        e.name as "eventName",
        e.date as "eventDate",
        CASE 
          WHEN qr."usedAt" IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (NOW() - qr."usedAt"))::INTEGER
          ELSE NULL 
        END as "secondsSinceUsed"
      FROM qr_codes qr
      LEFT JOIN guests g ON qr."guestId" = g.id
      LEFT JOIN events e ON qr."eventId" = e.id
      ${whereClause}
      ORDER BY qr."createdAt" DESC
      LIMIT $${paramIndex}
    `
    params.push(limit)

    const qrCodes = await prisma.$queryRawUnsafe(query, ...params)

    // Get summary statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as "totalQRCodes",
        COUNT(CASE WHEN status = 'CREATED' THEN 1 END) as "created",
        COUNT(CASE WHEN status = 'GENERATED' THEN 1 END) as "generated",
        COUNT(CASE WHEN status = 'SENT' THEN 1 END) as "sent",
        COUNT(CASE WHEN status = 'USED' THEN 1 END) as "used",
        COUNT(CASE WHEN status = 'EXPIRED' THEN 1 END) as "expired",
        COUNT(CASE WHEN "usedAt" IS NOT NULL AND "usedAt" > NOW() - INTERVAL '1 hour' THEN 1 END) as "usedLastHour",
        COUNT(CASE WHEN "usedAt" IS NOT NULL AND "usedAt" > NOW() - INTERVAL '1 day' THEN 1 END) as "usedLastDay"
      FROM qr_codes
    `

    const stats = await prisma.$queryRawUnsafe(statsQuery) as Array<{
      totalQRCodes: number
      created: number
      generated: number
      sent: number
      used: number
      expired: number
      usedLastHour: number
      usedLastDay: number
    }>

    // Get recent activity
    const recentActivityQuery = `
      SELECT 
        qr.code,
        qr.status,
        qr."usedAt",
        g."firstName",
        g."lastName",
        e.name as "eventName",
        CASE 
          WHEN qr."usedAt" IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (NOW() - qr."usedAt"))::INTEGER
          ELSE NULL 
        END as "secondsAgo"
      FROM qr_codes qr
      LEFT JOIN guests g ON qr."guestId" = g.id
      LEFT JOIN events e ON qr."eventId" = e.id
      WHERE qr."usedAt" IS NOT NULL
      ORDER BY qr."usedAt" DESC
      LIMIT 10
    `

    const recentActivity = await prisma.$queryRawUnsafe(recentActivityQuery)

    return NextResponse.json({
      success: true,
      data: {
        qrCodes,
        stats: stats[0],
        recentActivity,
        query: {
          code,
          eventId,
          guestId,
          limit
        }
      }
    })

  } catch (error) {
    console.error('Error fetching QR code debug info:', error)
    return NextResponse.json(
      { 
        error: 'Error fetching QR code debug info',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 