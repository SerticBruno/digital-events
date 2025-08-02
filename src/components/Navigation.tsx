'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Calendar, Users, QrCode, Home, Mail, Bug } from 'lucide-react'

export default function Navigation() {
  const pathname = usePathname()

  const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/dashboard', label: 'Events', icon: Calendar },
    { href: '/guests', label: 'Guests', icon: Users },
    { href: '/scanner', label: 'Scanner', icon: QrCode },
    { href: '/test-sendgrid', label: 'SendGrid Test', icon: Mail },
    { href: '/debug/qr-codes', label: 'Debug QR', icon: Bug },
  ]

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-gray-900">
              Digital Events
            </Link>
          </div>
          
          <div className="hidden md:flex space-x-8">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
} 