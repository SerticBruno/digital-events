import Link from 'next/link'
import { Calendar, QrCode, Users, Mail } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Streamline Your Event Management
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Send digital invitations, track responses, manage QR codes for entry, and collect post-event feedback. 
            Perfect for large-scale events with VIP guests.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Calendar className="w-5 h-5 mr-2" />
              Event Dashboard
            </Link>
            <Link
              href="/guests"
              className="inline-flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Users className="w-5 h-5 mr-2" />
              Guest Management
            </Link>
            <Link
              href="/scanner"
              className="inline-flex items-center justify-center px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <QrCode className="w-5 h-5 mr-2" />
              QR Scanner
            </Link>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Digital Invitations</h3>
            <p className="text-gray-600">
              Send professional digital invitations with tracking and RSVP management. 
              Perfect for ministries and large companies.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <QrCode className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">QR Code Entry</h3>
            <p className="text-gray-600">
              Generate unique QR codes for each guest. Fast and secure check-in process 
              with real-time validation.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Guest Management</h3>
            <p className="text-gray-600">
              Manage 1700+ guests with VIP treatment. Bulk import, individual management, 
              and comprehensive tracking.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">1700+</div>
              <div className="text-gray-600">Guests Supported</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600 mb-2">100%</div>
              <div className="text-gray-600">Email Delivery</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-orange-600 mb-2">Real-time</div>
              <div className="text-gray-600">QR Validation</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600 mb-2">VIP</div>
              <div className="text-gray-600">Guest Priority</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-400">
              Digital Events Platform - Professional event management for large-scale events
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
