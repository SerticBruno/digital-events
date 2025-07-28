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