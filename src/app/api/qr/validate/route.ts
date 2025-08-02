import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Helper function to format time ago
function formatTimeAgo(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''} ago`
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
  } else if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600)
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`
  } else {
    const days = Math.floor(seconds / 86400)
    return `${days} day${days !== 1 ? 's' : ''} ago`
  }
}

export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7)
  const startTime = Date.now()
  
  console.log(`[${requestId}] Starting QR validation request`)
  
  try {
    const body = await request.json()
    const { code, eventId } = body

    console.log(`[${requestId}] Validation request for code: ${code}, eventId: ${eventId}`)

    if (!code || !eventId) {
      console.log(`[${requestId}] Missing required parameters`)
      return NextResponse.json(
        { error: 'QR code and event ID are required' },
        { status: 400 }
      )
    }

    // Use database transaction with row-level locking to prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
      console.log(`[${requestId}] Starting database transaction`)
      
      // Find QR code with row-level lock to prevent race conditions
      const qrCodeRecord = await tx.$queryRaw<Array<{
        id: string
        code: string
        type: string
        status: string
        guestId: string
        eventId: string
        usedAt: string | null
        createdAt: string
      }>>`
        SELECT id, code, type, status, "guestId", "eventId", "usedAt", "createdAt"
        FROM qr_codes 
        WHERE code = ${code} 
        AND "eventId" = ${eventId}
        AND status IN ('SENT', 'GENERATED', 'USED')
        FOR UPDATE SKIP LOCKED
      `

      console.log(`[${requestId}] Found ${qrCodeRecord.length} QR code records`)

      if (qrCodeRecord.length === 0) {
        console.log(`[${requestId}] No valid QR code found`)
        return { 
          success: false, 
          error: 'Invalid QR code or wrong event',
          status: 404,
          debug: {
            code,
            eventId,
            searchedStatuses: ['SENT', 'GENERATED', 'USED']
          }
        }
      }

      const qrCode = qrCodeRecord[0]
      console.log(`[${requestId}] QR code found:`, {
        id: qrCode.id,
        code: qrCode.code,
        type: qrCode.type,
        status: qrCode.status,
        usedAt: qrCode.usedAt,
        createdAt: qrCode.createdAt
      })

      // Check if QR code is already used
      if (qrCode.status === 'USED') {
        const usedAt = qrCode.usedAt ? new Date(qrCode.usedAt) : null
        const now = new Date()
        const timeDiff = usedAt ? (now.getTime() - usedAt.getTime()) / 1000 : 0 // seconds
        
        console.log(`[${requestId}] QR code already used. Time difference: ${timeDiff.toFixed(1)} seconds`)
        
        // Get guest information for the error message
        const guestRecord = await tx.$queryRaw<Array<{
          id: string
          firstName: string
          lastName: string
          email: string
          company: string | null
          isVip: boolean
        }>>`
          SELECT id, "firstName", "lastName", email, company, "isVip"
          FROM guests 
          WHERE id = ${qrCode.guestId}
        `

        const guest = guestRecord.length > 0 ? guestRecord[0] : null
        
        // If used more than 5 seconds ago, show detailed error
        if (timeDiff > 5) {
          const formattedTime = usedAt ? usedAt.toLocaleString() : 'Unknown time'
          const timeAgo = formatTimeAgo(timeDiff)
          
          console.log(`[${requestId}] QR code used too long ago (${timeDiff.toFixed(1)}s), rejecting`)
          
          return {
            success: false,
            error: 'QR code already used',
            status: 409,
            details: {
              usedAt: qrCode.usedAt,
              formattedTime,
              timeAgo,
              timeDiffSeconds: timeDiff,
              guest: guest ? {
                firstName: guest.firstName,
                lastName: guest.lastName,
                email: guest.email,
                company: guest.company,
                isVip: guest.isVip
              } : null,
              message: `This QR code was already scanned ${timeAgo} ago at ${formattedTime}. Guest: ${guest ? `${guest.firstName} ${guest.lastName}` : 'Unknown'}`
            },
            debug: {
              code,
              eventId,
              qrCodeId: qrCode.id,
              usedAt: qrCode.usedAt,
              timeDiffSeconds: timeDiff,
              thresholdSeconds: 5
            }
          }
        }
        // If used within 5 seconds, treat it as a successful re-scan
        console.log(`[${requestId}] QR code used recently (${timeDiff.toFixed(1)}s), allowing re-scan`)
      }

      // Only update status if not already used
      if (qrCode.status !== 'USED') {
        console.log(`[${requestId}] Updating QR code status to USED`)
        await tx.qRCode.update({
          where: { id: qrCode.id },
          data: {
            status: 'USED',
            usedAt: new Date()
          }
        })
        console.log(`[${requestId}] QR code status updated successfully`)
      } else {
        console.log(`[${requestId}] QR code already marked as USED, skipping update`)
      }

      // Get guest information
      const guestRecord = await tx.$queryRaw<Array<{
        id: string
        firstName: string
        lastName: string
        email: string
        company: string | null
        isVip: boolean
      }>>`
        SELECT id, "firstName", "lastName", email, company, "isVip"
        FROM guests 
        WHERE id = ${qrCode.guestId}
      `

      if (guestRecord.length === 0) {
        console.log(`[${requestId}] Guest not found for guestId: ${qrCode.guestId}`)
        return {
          success: false,
          error: 'Guest not found',
          status: 404,
          debug: {
            code,
            eventId,
            qrCodeId: qrCode.id,
            guestId: qrCode.guestId
          }
        }
      }

      const guest = guestRecord[0]
      console.log(`[${requestId}] Guest found:`, {
        id: guest.id,
        firstName: guest.firstName,
        lastName: guest.lastName,
        email: guest.email
      })

      // Determine if this was a recent re-scan
      const usedAt = qrCode.usedAt ? new Date(qrCode.usedAt) : null
      const now = new Date()
      const timeDiff = usedAt ? (now.getTime() - usedAt.getTime()) / 1000 : 0
      const wasRecentlyUsed = qrCode.status === 'USED' && timeDiff <= 5

      console.log(`[${requestId}] Validation successful. wasRecentlyUsed: ${wasRecentlyUsed}, timeDiff: ${timeDiff.toFixed(1)}s`)

      return {
        success: true,
        guest: {
          id: guest.id,
          firstName: guest.firstName,
          lastName: guest.lastName,
          email: guest.email,
          company: guest.company,
          isVip: guest.isVip
        },
        qrCode: {
          id: qrCode.id,
          code: qrCode.code,
          type: qrCode.type,
          status: 'USED',
          usedAt: qrCode.usedAt || new Date().toISOString(),
          wasAlreadyUsed: qrCode.status === 'USED',
          wasRecentlyUsed: wasRecentlyUsed
        },
        debug: {
          requestId,
          processingTimeMs: Date.now() - startTime,
          code,
          eventId,
          qrCodeId: qrCode.id,
          guestId: guest.id,
          wasAlreadyUsed: qrCode.status === 'USED',
          wasRecentlyUsed,
          timeDiffSeconds: timeDiff
        }
      }
    }, {
      timeout: 10000, // 10 second timeout
      maxWait: 5000   // 5 second max wait for lock
    })

    if (!result.success) {
      console.log(`[${requestId}] Validation failed:`, result.error)
      return NextResponse.json(
        { 
          error: result.error,
          details: result.details,
          debug: result.debug
        },
        { status: result.status }
      )
    }

    console.log(`[${requestId}] Validation completed successfully in ${Date.now() - startTime}ms`)
    return NextResponse.json(result)

  } catch (error) {
    const processingTime = Date.now() - startTime
    console.error(`[${requestId}] Error validating QR code after ${processingTime}ms:`, error)
    
    // Check if it's a lock timeout error
    if (error instanceof Error && error.message.includes('timeout')) {
      return NextResponse.json(
        { 
          error: 'QR code validation timeout - please try again',
          debug: {
            requestId,
            processingTimeMs: processingTime,
            errorType: 'timeout',
            message: error.message
          }
        },
        { status: 408 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Error validating QR code',
        debug: {
          requestId,
          processingTimeMs: processingTime,
          errorType: 'unknown',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    )
  }
} 