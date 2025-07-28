// Type definitions for data structures

export interface GuestData {
  id: string
  firstName: string
  lastName: string
  email: string
  company?: string
  position?: string
  phone?: string
  isVip: boolean
}

export interface EventData {
  id: string
  name: string
  description?: string
  date: Date
  location?: string
  maxGuests?: number
  createdAt: Date
  updatedAt: Date
}

export interface EventGuestData {
  id: string
  createdAt: Date
  eventId: string
  guestId: string
  event: EventData
  guest: GuestData
}

export interface InvitationData {
  id: string
  type: string
  status: string
  sentAt?: Date
  openedAt?: Date
  respondedAt?: Date
  response?: string
  hasPlusOne: boolean
  plusOneName?: string
  createdAt: Date
  updatedAt: Date
  guestId: string
  eventId: string
}

export interface QRCodeData {
  id: string
  code: string
  type: string
  isUsed: boolean
  usedAt?: Date
  createdAt: Date
  guestId: string
  eventId: string
} 