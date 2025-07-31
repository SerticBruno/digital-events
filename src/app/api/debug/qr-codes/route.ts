import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')
    const guestId = searchParams.get('guestId')

    const result: Record<string, unknown> = {}

    // Get all QR codes
    const allQRCodes = await prisma.qRCode.findMany({
      include: {
        guest: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        },
        event: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    result.allQRCodes = allQRCodes

    // Get QR codes by status
    const qrCodesByStatus = await prisma.qRCode.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    })
    result.qrCodesByStatus = qrCodesByStatus

    // If eventId provided, check event QR codes
    if (eventId) {
      const eventQRCodes = await prisma.qRCode.findMany({
        where: { eventId },
        include: {
          guest: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
      result.eventQRCodes = eventQRCodes
    }

    // If guestId provided, check guest QR codes
    if (guestId) {
      const guestQRCodes = await prisma.qRCode.findMany({
        where: { guestId },
        include: {
          event: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
      result.guestQRCodes = guestQRCodes
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Debug QR codes error:', error)
    return NextResponse.json({
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 