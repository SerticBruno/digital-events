'use client'

import { useState, useEffect, useCallback } from 'react'

interface QRCodeDebug {
  id: string
  code: string
  type: string
  status: string
  usedAt: string | null
  createdAt: string
  guestId: string
  eventId: string
  firstName: string | null
  lastName: string | null
  email: string | null
  isVip: boolean | null
  eventName: string | null
  eventDate: string | null
  secondsSinceUsed: number | null
}

interface Stats {
  totalQRCodes: number
  created: number
  generated: number
  sent: number
  used: number
  expired: number
  usedLastHour: number
  usedLastDay: number
}

interface RecentActivity {
  code: string
  status: string
  usedAt: string
  firstName: string | null
  lastName: string | null
  eventName: string | null
  secondsAgo: number | null
}

export default function QRCodeDebugPage() {
  const [qrCodes, setQrCodes] = useState<QRCodeDebug[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    code: '',
    eventId: '',
    guestId: '',
    limit: '50'
  })

  const fetchQRCodeData = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams()
      if (filters.code) params.append('code', filters.code)
      if (filters.eventId) params.append('eventId', filters.eventId)
      if (filters.guestId) params.append('guestId', filters.guestId)
      if (filters.limit) params.append('limit', filters.limit)

      const response = await fetch(`/api/debug/qr-codes?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setQrCodes(data.data.qrCodes)
        setStats(data.data.stats)
        setRecentActivity(data.data.recentActivity)
      } else {
        setError(data.error || 'Failed to fetch QR code data')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch QR code data')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchQRCodeData()
  }, [fetchQRCodeData])

  const formatTimeAgo = (seconds: number): string => {
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

  const formatDateTime = (dateString: string): string => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">QR Code Debug Information</h1>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">QR Code</label>
              <input
                type="text"
                value={filters.code}
                onChange={(e) => setFilters({ ...filters, code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter QR code"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event ID</label>
              <input
                type="text"
                value={filters.eventId}
                onChange={(e) => setFilters({ ...filters, eventId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter event ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Guest ID</label>
              <input
                type="text"
                value={filters.guestId}
                onChange={(e) => setFilters({ ...filters, guestId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter guest ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Limit</label>
              <input
                type="number"
                value={filters.limit}
                onChange={(e) => setFilters({ ...filters, limit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
                max="1000"
              />
            </div>
          </div>
          <button
            onClick={fetchQRCodeData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Refresh Data
          </button>
        </div>

        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading QR code data...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Statistics */}
        {stats && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">QR Code Statistics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.totalQRCodes}</div>
                <div className="text-sm text-gray-600">Total QR Codes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.used}</div>
                <div className="text-sm text-gray-600">Used</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.sent}</div>
                <div className="text-sm text-gray-600">Sent</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.usedLastHour}</div>
                <div className="text-sm text-gray-600">Used Last Hour</div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Recent QR Code Activity</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Used At</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time Ago</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentActivity.map((activity, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{activity.code}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {activity.firstName} {activity.lastName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{activity.eventName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDateTime(activity.usedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {activity.secondsAgo ? formatTimeAgo(activity.secondsAgo) : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* QR Codes List */}
        {qrCodes.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">QR Codes ({qrCodes.length})</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Used At</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time Since Used</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {qrCodes.map((qrCode) => (
                    <tr key={qrCode.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{qrCode.code}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          qrCode.status === 'USED' ? 'bg-green-100 text-green-800' :
                          qrCode.status === 'SENT' ? 'bg-blue-100 text-blue-800' :
                          qrCode.status === 'GENERATED' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {qrCode.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {qrCode.firstName} {qrCode.lastName}
                        {qrCode.isVip && <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">VIP</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{qrCode.eventName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDateTime(qrCode.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {qrCode.usedAt ? formatDateTime(qrCode.usedAt) : 'Not used'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {qrCode.secondsSinceUsed ? formatTimeAgo(qrCode.secondsSinceUsed) : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && qrCodes.length === 0 && !error && (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-600">No QR codes found matching the current filters.</p>
          </div>
        )}
      </div>
    </div>
  )
} 