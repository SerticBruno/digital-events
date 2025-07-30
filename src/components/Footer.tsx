'use client'

import { Heart, Github, Mail, Calendar, Users, QrCode } from 'lucide-react'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-gray-900 text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand Section */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">Digital Events</span>
              </div>
              <p className="text-gray-300 mb-4 max-w-md">
                Streamline your event management with our comprehensive digital platform. 
                From guest management to QR code check-ins, we&apos;ve got you covered.
              </p>
              <div className="flex items-center space-x-4">
                <a 
                  href="https://github.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <Github className="w-5 h-5" />
                </a>
                <a 
                  href="mailto:support@digitalevents.com" 
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <Mail className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <a 
                    href="/dashboard" 
                    className="text-gray-300 hover:text-white transition-colors flex items-center"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Dashboard
                  </a>
                </li>
                <li>
                  <a 
                    href="/guests" 
                    className="text-gray-300 hover:text-white transition-colors flex items-center"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Guest Management
                  </a>
                </li>
                <li>
                  <a 
                    href="/scanner" 
                    className="text-gray-300 hover:text-white transition-colors flex items-center"
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    QR Scanner
                  </a>
                </li>
              </ul>
            </div>

            {/* Features */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Features</h3>
              <ul className="space-y-2 text-gray-300">
                <li>• Guest Management</li>
                <li>• Email Invitations</li>
                <li>• QR Code Check-ins</li>
                <li>• Event Analytics</li>
                <li>• Bulk Import/Export</li>
                <li>• Plus-One Management</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-2 md:space-y-0">
            <div className="text-gray-400 text-sm">
              © {currentYear} Digital Events. Made with{' '}
              <Heart className="w-4 h-4 inline text-red-500" />{' '}
              for event organizers.
            </div>
            <div className="flex items-center space-x-6 text-sm text-gray-400">
              <a href="/privacy" className="hover:text-white transition-colors">
                Privacy Policy
              </a>
              <a href="/terms" className="hover:text-white transition-colors">
                Terms of Service
              </a>
              <a href="/support" className="hover:text-white transition-colors">
                Support
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
} 