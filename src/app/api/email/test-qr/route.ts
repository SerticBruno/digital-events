import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'

export async function GET(request: NextRequest) {
  try {
    const testText = 'QR-TEST-12345'
    
    // Test QR code generation
    const qrCodeImage = await QRCode.toDataURL(testText)
    
    return NextResponse.json({
      success: true,
      qrCodeLength: qrCodeImage.length,
      qrCodePreview: qrCodeImage.substring(0, 100) + '...',
      testText
    })
  } catch (error) {
    console.error('QR code test failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 