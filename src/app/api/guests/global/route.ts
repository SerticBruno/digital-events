import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
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
    const existingGuest = await (prisma as any).guest.findUnique({
      where: { email }
    })

    if (existingGuest) {
      return NextResponse.json(
        { error: 'Guest with this email already exists' },
        { status: 409 }
      )
    }

    // Create new guest globally (without event)
    const guest = await (prisma as any).guest.create({
      data: {
        email,
        firstName,
        lastName,
        company,
        position,
        phone,
        isVip: isVip || false
      }
    })

    return NextResponse.json(guest, { status: 201 })
  } catch (error) {
    console.error('Failed to create global guest:', error)
    return NextResponse.json(
      { error: 'Failed to create guest' },
      { status: 500 }
    )
  }
} 